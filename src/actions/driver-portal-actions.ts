"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { requireAuthenticatedUser, requirePermission } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { getCurrentPortalDriver } from "@/lib/driver-portal/driver-portal-queries";
import { getSettingValue } from "@/lib/settings/settings-service";

type PortalTripStatus = "DRIVER_CONFIRMED" | "EN_ROUTE" | "ARRIVED" | "COMPLETED" | "NEEDS_ATTENTION";

const allowedPortalTransitions: Record<string, PortalTripStatus[]> = {
  ASSIGNED: ["DRIVER_CONFIRMED", "EN_ROUTE", "NEEDS_ATTENTION"],
  DRIVER_CONFIRMED: ["EN_ROUTE", "NEEDS_ATTENTION"],
  EN_ROUTE: ["ARRIVED", "NEEDS_ATTENTION"],
  IN_PROGRESS: ["ARRIVED", "NEEDS_ATTENTION"],
  ARRIVED: ["COMPLETED", "NEEDS_ATTENTION"],
  COMPLETED: ["NEEDS_ATTENTION"],
};

type MileageRateSetting = {
  rateCents?: number;
};

type GpsPoint = {
  latitude: number;
  longitude: number;
  accuracy?: number;
};

type GpsTrackPoint = GpsPoint & {
  capturedAt?: string;
};

export async function acceptAssignmentAction(assignmentId: string) {
  const context = await getPortalAssignment(assignmentId);
  assertAssignmentOpen(context);

  await db.assignment.update({
    where: { id: context.assignment.id },
    data: {
      status: "ACCEPTED",
      respondedAt: new Date(),
      updatedById: context.user.id,
    },
  });

  await recordAssignmentStatus(context, "ACCEPTED", "Driver accepted assignment.");
  await changePortalTripStatus(context, "DRIVER_CONFIRMED", "driver_portal.accepted", "Driver accepted assignment.");
}

export async function declineAssignmentAction(assignmentId: string, formData: FormData) {
  const reason = String(formData.get("reason") ?? "").trim();

  if (!reason) {
    throw new Error("A decline reason is required.");
  }

  const context = await getPortalAssignment(assignmentId);
  assertAssignmentOpen(context);

  await db.assignment.update({
    where: { id: context.assignment.id },
    data: {
      status: "DECLINED",
      respondedAt: new Date(),
      updatedById: context.user.id,
    },
  });

  await recordAssignmentStatus(context, "DECLINED", reason);
  await notifyDispatch(context, "Driver declined assignment", reason);
  await changePortalTripStatus(context, "NEEDS_ATTENTION", "driver_portal.declined", reason, true);
}

export async function markEnRouteAction(assignmentId: string, formData: FormData) {
  const context = await getPortalAssignment(assignmentId);
  assertAssignmentAccepted(context);
  const gps = parseGpsPoint(formData);
  const gpsTrack = parseGpsTrack(formData.get("gpsTrack"), gps);
  const routeUrl = parseRouteUrl(formData.get("routeUrl"));

  await writeAudit(context, "driver_portal.gps_start_captured", {
    gpsStart: toGpsTrackPoint({ ...gps, capturedAt: new Date().toISOString() }),
    pointCount: gpsTrack.length,
    routeUrl,
    gpsTrack: gpsTrack.map(toGpsTrackPoint),
  });
  await changePortalTripStatus(context, "EN_ROUTE", "driver_portal.en_route", "Driver marked en route.");
}

export async function markArrivedAction(assignmentId: string) {
  const context = await getPortalAssignment(assignmentId);
  assertAssignmentAccepted(context);
  await changePortalTripStatus(context, "ARRIVED", "driver_portal.arrived", "Driver marked arrived.");
}

export async function markCompletedAction(assignmentId: string, formData: FormData) {
  const context = await getPortalAssignment(assignmentId);
  assertAssignmentAccepted(context);
  const gps = parseGpsPoint(formData);
  const gpsTrack = parseGpsTrack(formData.get("gpsTrack"), gps);
  const gpsDistanceMiles = gpsTrack.length > 1 ? Math.max(0.1, calculateTrackDistanceMiles(gpsTrack)) : null;
  const routeUrl = parseRouteUrl(formData.get("routeUrl"));

  await db.assignment.update({
    where: { id: context.assignment.id },
    data: {
      status: "COMPLETED",
      updatedById: context.user.id,
    },
  });

  await recordAssignmentStatus(context, "COMPLETED", "Driver marked trip completed.");
  await changePortalTripStatus(context, "COMPLETED", "driver_portal.completed", "Driver marked trip completed.");
  await ensureMileageRecord(context, gpsDistanceMiles, gpsTrack, routeUrl);
}

export async function submitMileageAction(assignmentId: string, formData: FormData) {
  const miles = Number(formData.get("miles"));

  if (!Number.isFinite(miles) || miles <= 0) {
    throw new Error("Mileage must be greater than zero.");
  }

  const context = await getPortalAssignment(assignmentId);
  if (context.assignment.status !== "COMPLETED" && context.assignment.tripLeg.status !== "COMPLETED") {
    throw new Error("Mileage can only be submitted after the trip is completed.");
  }
  const rate = await getSettingValue<MileageRateSetting>(context.membership.organizationId, "reimbursementRate");
  const rateCents = rate?.rateCents ?? 67;
  const amountCents = Math.round(miles * rateCents);
  const milesValue = miles.toFixed(2);

  await db.mileageRecord.upsert({
    where: { tripLegId: context.assignment.tripLegId },
    update: {
      assignmentId: context.assignment.id,
      driverId: context.driver.id,
      status: "SUBMITTED",
      mileageSource: "driver_manual",
      submittedMiles: milesValue,
      miles: milesValue,
      rateCents,
      amountCents,
      submittedAt: new Date(),
      updatedById: context.user.id,
    },
    create: {
      organizationId: context.membership.organizationId,
      tripLegId: context.assignment.tripLegId,
      assignmentId: context.assignment.id,
      driverId: context.driver.id,
      status: "SUBMITTED",
      mileageSource: "driver_manual",
      serviceDate: context.assignment.tripLeg.scheduledPickupAt,
      estimatedMiles: context.assignment.tripLeg.estimatedMiles?.toString(),
      submittedMiles: milesValue,
      miles: milesValue,
      rateCents,
      amountCents,
      submittedAt: new Date(),
      createdById: context.user.id,
      updatedById: context.user.id,
    },
  });

  await writeAudit(context, "driver_portal.mileage_submitted", { miles, amountCents });
  revalidateDriverPortal();
}

export async function reportIssueAction(assignmentId: string, formData: FormData) {
  const summary = String(formData.get("summary") ?? "").trim();
  const details = String(formData.get("details") ?? "").trim();

  if (!summary) {
    throw new Error("Issue summary is required.");
  }

  const context = await getPortalAssignment(assignmentId);

  const incident = await db.incident.create({
    data: {
      organizationId: context.membership.organizationId,
      severity: "MEDIUM",
      status: "OPEN",
      summary,
      details,
      riderId: context.assignment.tripLeg.rideRequest.riderId,
      driverId: context.driver.id,
      rideRequestId: context.assignment.tripLeg.rideRequestId,
      tripLegId: context.assignment.tripLegId,
      assignmentId: context.assignment.id,
      createdById: context.user.id,
      updatedById: context.user.id,
    },
  });

  await notifyDispatch(context, "Driver reported issue", [summary, details].filter(Boolean).join("\n"), incident.id);
  await changePortalTripStatus(context, "NEEDS_ATTENTION", "driver_portal.issue_reported", summary, true);
}

async function getPortalAssignment(assignmentId: string) {
  const user = await requireAuthenticatedUser();
  const membership = await requirePermission("driver_portal:update");
  const driver = await getCurrentPortalDriver(membership.organizationId, user);

  if (!driver) {
    throw new Error("No driver profile is linked to this user.");
  }

  const assignment = await db.assignment.findFirstOrThrow({
    where: {
      id: assignmentId,
      organizationId: membership.organizationId,
      driverId: driver.id,
      deletedAt: null,
    },
    select: {
      id: true,
      status: true,
      tripLegId: true,
      tripLeg: {
        select: {
          id: true,
          status: true,
          scheduledPickupAt: true,
          estimatedMiles: true,
          rideRequestId: true,
          rideRequest: {
            select: {
              id: true,
              riderId: true,
            },
          },
        },
      },
    },
  });

  return { user, membership, driver, assignment };
}

type PortalAssignmentContext = Awaited<ReturnType<typeof getPortalAssignment>>;

async function ensureMileageRecord(
  context: PortalAssignmentContext,
  actualMiles: number | null = null,
  gpsTrack: GpsTrackPoint[] = [],
  routeUrl: string | null = null
) {
  const rate = await getSettingValue<MileageRateSetting>(context.membership.organizationId, "reimbursementRate");
  const rateCents = rate?.rateCents ?? 67;
  const estimatedMiles = Number(context.assignment.tripLeg.estimatedMiles ?? 0);
  const payableMiles = actualMiles ?? estimatedMiles;
  const mileageSource = actualMiles === null ? "estimated_fallback" : "driver_gps";
  const gpsPayload = gpsTrack.map(toGpsTrackPoint);
  const gpsSummary = buildGpsAccuracySummary(gpsTrack);
  const firstPoint = gpsTrack[0];
  const lastPoint = gpsTrack.at(-1);
  const startedAt = firstPoint?.capturedAt ? parseDate(firstPoint.capturedAt) : undefined;
  const completedAt = lastPoint?.capturedAt ? parseDate(lastPoint.capturedAt) : undefined;

  await db.mileageRecord.upsert({
    where: { tripLegId: context.assignment.tripLegId },
    update: {
      estimatedMiles: estimatedMiles.toFixed(2),
      submittedMiles: payableMiles.toFixed(2),
      miles: payableMiles.toFixed(2),
      mileageSource,
      routeProvider: routeUrl ? "google_maps" : undefined,
      routeUrl: routeUrl ?? undefined,
      gpsDistanceMiles: actualMiles?.toFixed(2),
      gpsStartLatitude: firstPoint?.latitude.toFixed(7),
      gpsStartLongitude: firstPoint?.longitude.toFixed(7),
      gpsEndLatitude: lastPoint?.latitude.toFixed(7),
      gpsEndLongitude: lastPoint?.longitude.toFixed(7),
      gpsStartedAt: startedAt,
      gpsCompletedAt: completedAt,
      gpsPointCount: gpsTrack.length,
      gpsAccuracySummary: gpsSummary,
      gpsTrack: gpsPayload,
      status: "SUBMITTED",
      rateCents,
      amountCents: Math.round(payableMiles * rateCents),
      submittedAt: new Date(),
      updatedById: context.user.id,
    },
    create: {
      organizationId: context.membership.organizationId,
      tripLegId: context.assignment.tripLegId,
      assignmentId: context.assignment.id,
      driverId: context.driver.id,
      status: "SUBMITTED",
      serviceDate: context.assignment.tripLeg.scheduledPickupAt,
      estimatedMiles: estimatedMiles.toFixed(2),
      submittedMiles: payableMiles.toFixed(2),
      miles: payableMiles.toFixed(2),
      mileageSource,
      routeProvider: routeUrl ? "google_maps" : undefined,
      routeUrl: routeUrl ?? undefined,
      gpsDistanceMiles: actualMiles?.toFixed(2),
      gpsStartLatitude: firstPoint?.latitude.toFixed(7),
      gpsStartLongitude: firstPoint?.longitude.toFixed(7),
      gpsEndLatitude: lastPoint?.latitude.toFixed(7),
      gpsEndLongitude: lastPoint?.longitude.toFixed(7),
      gpsStartedAt: startedAt,
      gpsCompletedAt: completedAt,
      gpsPointCount: gpsTrack.length,
      gpsAccuracySummary: gpsSummary,
      gpsTrack: gpsPayload,
      rateCents,
      amountCents: Math.round(payableMiles * rateCents),
      submittedAt: new Date(),
      createdById: context.user.id,
      updatedById: context.user.id,
    },
  });

  await writeAudit(context, "driver_portal.gps_mileage_captured", {
    estimatedMiles,
    gpsDistanceMiles: actualMiles,
    gpsPointCount: gpsTrack.length,
    routeUrl,
    payableMiles,
    source: mileageSource,
    gpsAccuracySummary: gpsSummary,
    gpsTrack: gpsPayload,
  });
}

function assertAssignmentOpen(context: PortalAssignmentContext) {
  if (context.assignment.status === "COMPLETED" || context.assignment.status === "CANCELED") {
    throw new Error("This assignment is already closed.");
  }
}

function assertAssignmentAccepted(context: PortalAssignmentContext) {
  if (context.assignment.status !== "ACCEPTED") {
    throw new Error("Accept the assignment before updating trip progress.");
  }
}

async function changePortalTripStatus(
  context: PortalAssignmentContext,
  status: PortalTripStatus,
  action: string,
  note: string,
  moveRequestToAttention = false
) {
  const trip = context.assignment.tripLeg;

  assertPortalTransition(trip.status, status);

  await db.tripLeg.update({
    where: { id: trip.id },
    data: {
      status,
      completedAt: status === "COMPLETED" ? new Date() : undefined,
      updatedById: context.user.id,
    },
  });

  if (moveRequestToAttention) {
    await db.rideRequest.update({
      where: { id: trip.rideRequestId },
      data: {
        status: "UNRESOLVED",
        updatedById: context.user.id,
      },
    });
  }

  await db.statusHistory.create({
    data: {
      organizationId: context.membership.organizationId,
      entityType: "TripLeg",
      entityId: trip.id,
      oldStatus: trip.status,
      newStatus: status,
      changedById: context.user.id,
      tripLegId: trip.id,
      assignmentId: context.assignment.id,
      note,
    },
  });

  await writeAudit(context, action, { oldStatus: trip.status, newStatus: status, note });
  revalidateDriverPortal();
}

function assertPortalTransition(currentStatus: string, nextStatus: PortalTripStatus) {
  if (currentStatus === nextStatus) {
    return;
  }

  const allowed = allowedPortalTransitions[currentStatus] ?? [];
  if (!allowed.includes(nextStatus)) {
    throw new Error(`Cannot move trip from ${currentStatus} to ${nextStatus}.`);
  }
}

function parseGpsPoint(formData: FormData): GpsPoint {
  const latitude = Number(formData.get("latitude"));
  const longitude = Number(formData.get("longitude"));
  const accuracy = Number(formData.get("accuracy"));

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    throw new Error("GPS location is required to update this trip status.");
  }

  return {
    latitude,
    longitude,
    accuracy: Number.isFinite(accuracy) ? accuracy : undefined,
  };
}

function parseGpsTrack(value: FormDataEntryValue | null, fallback: GpsPoint): GpsTrackPoint[] {
  const fallbackPoint: GpsTrackPoint = {
    ...fallback,
    capturedAt: new Date().toISOString(),
  };

  if (typeof value !== "string" || value.trim().length === 0) {
    return [fallbackPoint];
  }

  try {
    const parsed = JSON.parse(value);

    if (!Array.isArray(parsed)) {
      return [fallbackPoint];
    }

    const points = parsed
      .map((point) => normalizeGpsTrackPoint(point))
      .filter((point): point is GpsTrackPoint => Boolean(point))
      .slice(-300);

    return points.length > 0 ? points : [fallbackPoint];
  } catch {
    return [fallbackPoint];
  }
}

function parseRouteUrl(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || value.trim().length === 0) {
    return null;
  }

  try {
    const url = new URL(value);

    if (url.protocol !== "https:") {
      return null;
    }

    if (!["www.google.com", "google.com", "maps.google.com"].includes(url.hostname)) {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}

function normalizeGpsTrackPoint(value: unknown): GpsTrackPoint | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const point = value as Record<string, unknown>;
  const latitude = Number(point.latitude);
  const longitude = Number(point.longitude);
  const accuracy = Number(point.accuracy);
  const capturedAt = typeof point.capturedAt === "string" ? point.capturedAt : undefined;

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return null;
  }

  return {
    latitude,
    longitude,
    accuracy: Number.isFinite(accuracy) ? accuracy : undefined,
    capturedAt,
  };
}

function toGpsTrackPoint(point: GpsTrackPoint): Prisma.InputJsonObject {
  return {
    latitude: Number(point.latitude.toFixed(6)),
    longitude: Number(point.longitude.toFixed(6)),
    capturedAt: point.capturedAt ?? new Date().toISOString(),
    ...(point.accuracy !== undefined ? { accuracy: point.accuracy } : {}),
  };
}

function calculateTrackDistanceMiles(points: GpsTrackPoint[]) {
  return points.reduce((total, point, index) => {
    const previous = points[index - 1];

    if (!previous) {
      return total;
    }

    return (
      total +
      calculateDistanceMiles(
        previous.latitude,
        previous.longitude,
        point.latitude,
        point.longitude,
        false
      )
    );
  }, 0);
}

function calculateDistanceMiles(
  startLatitude: number,
  startLongitude: number,
  endLatitude: number,
  endLongitude: number,
  applyRoadAdjustment = true
) {
  const earthRadiusMiles = 3958.8;
  const latitudeDelta = toRadians(endLatitude - startLatitude);
  const longitudeDelta = toRadians(endLongitude - startLongitude);
  const startLatitudeRadians = toRadians(startLatitude);
  const endLatitudeRadians = toRadians(endLatitude);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(startLatitudeRadians) *
      Math.cos(endLatitudeRadians) *
      Math.sin(longitudeDelta / 2) ** 2;
  const centralAngle = 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
  const straightLineMiles = earthRadiusMiles * centralAngle;

  // A light road-network adjustment keeps GPS-only mileage closer to expected driving distance
  // without depending on a paid routing API.
  return Math.max(0.1, applyRoadAdjustment ? straightLineMiles * 1.18 : straightLineMiles);
}

function buildGpsAccuracySummary(points: GpsTrackPoint[]): Prisma.InputJsonObject {
  const accuracies = points
    .map((point) => point.accuracy)
    .filter((accuracy): accuracy is number => Number.isFinite(accuracy));

  if (accuracies.length === 0) {
    return {
      pointCount: points.length,
      accuracyPointCount: 0,
    };
  }

  const averageMeters = accuracies.reduce((total, accuracy) => total + accuracy, 0) / accuracies.length;
  const maxMeters = Math.max(...accuracies);

  return {
    pointCount: points.length,
    accuracyPointCount: accuracies.length,
    averageMeters: Number(averageMeters.toFixed(1)),
    maxMeters: Number(maxMeters.toFixed(1)),
  };
}

function parseDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

async function recordAssignmentStatus(
  context: PortalAssignmentContext,
  newStatus: "ACCEPTED" | "DECLINED" | "COMPLETED",
  note: string
) {
  await db.statusHistory.create({
    data: {
      organizationId: context.membership.organizationId,
      entityType: "Assignment",
      entityId: context.assignment.id,
      oldStatus: context.assignment.status,
      newStatus,
      changedById: context.user.id,
      tripLegId: context.assignment.tripLegId,
      assignmentId: context.assignment.id,
      note,
    },
  });
}

async function notifyDispatch(context: PortalAssignmentContext, subject: string, body: string, incidentId?: string) {
  await db.communicationLog.create({
    data: {
      organizationId: context.membership.organizationId,
      type: "NOTE",
      subject,
      body,
      riderId: context.assignment.tripLeg.rideRequest.riderId,
      driverId: context.driver.id,
      rideRequestId: context.assignment.tripLeg.rideRequestId,
      tripLegId: context.assignment.tripLegId,
      assignmentId: context.assignment.id,
      incidentId,
      createdById: context.user.id,
      updatedById: context.user.id,
    },
  });
}

async function writeAudit(context: PortalAssignmentContext, action: string, metadata?: Prisma.InputJsonValue) {
  await db.auditLog.create({
    data: {
      organizationId: context.membership.organizationId,
      actorUserId: context.user.id,
      action,
      entityType: "TripLeg",
      entityId: context.assignment.tripLegId,
      driverId: context.driver.id,
      rideRequestId: context.assignment.tripLeg.rideRequestId,
      tripLegId: context.assignment.tripLegId,
      assignmentId: context.assignment.id,
      metadata,
    },
  });
}

function revalidateDriverPortal() {
  revalidatePath("/driver-portal");
  revalidatePath("/notifications");
  revalidatePath("/dispatch");
  revalidatePath("/dispatch/weekly");
}
