import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getDayRange } from "@/lib/driver-portal/driver-portal-queries";
import { getSettingValue } from "@/lib/settings/settings-service";
import type { MobileUserContext } from "@/lib/mobile-api/auth";

type PortalTripStatus = "DRIVER_CONFIRMED" | "EN_ROUTE" | "ARRIVED" | "COMPLETED" | "NEEDS_ATTENTION";

type LocationInput = {
  latitude: number;
  longitude: number;
  accuracyMeters?: number;
  speedMetersPerSecond?: number;
  headingDegrees?: number;
  capturedAt?: Date;
};

type MileageRateSetting = {
  rateCents?: number;
};

const allowedPortalTransitions: Record<string, PortalTripStatus[]> = {
  ASSIGNED: ["DRIVER_CONFIRMED", "EN_ROUTE", "NEEDS_ATTENTION"],
  DRIVER_CONFIRMED: ["EN_ROUTE", "NEEDS_ATTENTION"],
  EN_ROUTE: ["ARRIVED", "NEEDS_ATTENTION"],
  IN_PROGRESS: ["ARRIVED", "NEEDS_ATTENTION"],
  ARRIVED: ["COMPLETED", "NEEDS_ATTENTION"],
  COMPLETED: ["NEEDS_ATTENTION"],
};

export async function getMobileProfile(context: MobileUserContext) {
  return {
    user: context.user,
    organization: {
      id: context.membership.organizationId,
      name: context.membership.organizationName,
      slug: context.membership.organizationSlug,
    },
    driver: {
      id: context.driver.id,
      name: context.driver.displayName,
      status: context.driver.status,
      phone: context.driver.phone,
      email: context.driver.email,
    },
  };
}

export async function getMobileManifest(context: MobileUserContext, date?: Date) {
  const range = getDayRange(date);
  const assignments = await db.assignment.findMany({
    where: {
      organizationId: context.membership.organizationId,
      driverId: context.driver.id,
      deletedAt: null,
      status: { notIn: ["CANCELED"] },
      tripLeg: {
        deletedAt: null,
        scheduledPickupAt: {
          gte: range.start,
          lt: range.end,
        },
      },
    },
    select: {
      id: true,
      status: true,
      mileageRecord: {
        select: {
          miles: true,
          status: true,
          mileageSource: true,
          gpsPointCount: true,
          gpsDistanceMiles: true,
        },
      },
      tripLeg: {
        select: {
          id: true,
          status: true,
          scheduledPickupAt: true,
          scheduledDropoffAt: true,
          pickupAddress: true,
          pickupCity: true,
          pickupState: true,
          pickupPostalCode: true,
          pickupCounty: true,
          dropoffAddress: true,
          dropoffCity: true,
          dropoffState: true,
          dropoffPostalCode: true,
          dropoffCounty: true,
          rideRequest: {
            select: {
              id: true,
              purpose: true,
              specialInstructions: true,
              rider: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  phone: true,
                  communicationPreference: true,
                  mobilityNotes: true,
                  riderNotes: true,
                  pickupInstructions: true,
                },
              },
            },
          },
        },
      },
    },
    orderBy: [{ tripLeg: { scheduledPickupAt: "asc" } }, { createdAt: "asc" }],
  });

  return {
    date: range.start.toISOString(),
    assignments: assignments.map((assignment) => ({
      id: assignment.id,
      status: assignment.status,
      mileageRecord: assignment.mileageRecord
        ? {
            ...assignment.mileageRecord,
            miles: assignment.mileageRecord.miles?.toString(),
            gpsDistanceMiles: assignment.mileageRecord.gpsDistanceMiles?.toString(),
          }
        : null,
      tripLeg: {
        ...assignment.tripLeg,
        scheduledPickupAt: assignment.tripLeg.scheduledPickupAt.toISOString(),
        scheduledDropoffAt: assignment.tripLeg.scheduledDropoffAt?.toISOString() ?? null,
      },
    })),
  };
}

export async function acceptMobileAssignment(context: MobileUserContext, assignmentId: string) {
  assertCanUpdateDriverPortal(context);
  const assignment = await getMobileAssignment(context, assignmentId);
  assertAssignmentOpen(assignment);

  await db.assignment.update({
    where: { id: assignment.id },
    data: {
      status: "ACCEPTED",
      respondedAt: new Date(),
      updatedById: context.user.id,
    },
  });

  await recordAssignmentStatus(context, assignment, "ACCEPTED", "Driver accepted assignment from mobile app.");
  await changeTripStatus(context, assignment, "DRIVER_CONFIRMED", "mobile.assignment_accepted", "Driver accepted assignment from mobile app.");
}

export async function declineMobileAssignment(context: MobileUserContext, assignmentId: string, reason: string) {
  assertCanUpdateDriverPortal(context);

  if (!reason) {
    throw new Error("A decline reason is required.");
  }

  const assignment = await getMobileAssignment(context, assignmentId);
  assertAssignmentOpen(assignment);

  await db.assignment.update({
    where: { id: assignment.id },
    data: {
      status: "DECLINED",
      respondedAt: new Date(),
      updatedById: context.user.id,
    },
  });

  await recordAssignmentStatus(context, assignment, "DECLINED", reason);
  await notifyDispatch(context, assignment, "Driver declined assignment", reason);
  await changeTripStatus(context, assignment, "NEEDS_ATTENTION", "mobile.assignment_declined", reason, true);
}

export async function startMobileAssignment(
  context: MobileUserContext,
  assignmentId: string,
  location: LocationInput,
  routeUrl?: string | null
) {
  assertCanUpdateDriverPortal(context);
  const assignment = await getMobileAssignment(context, assignmentId);
  assertAssignmentAccepted(assignment);
  assertLocation(location);

  await createLocationPing(context, assignment, location);
  await writeAudit(context, assignment, "mobile.gps_start_captured", {
    gpsStart: toGpsJson(location),
    routeUrl: routeUrl ?? null,
  });
  await changeTripStatus(context, assignment, "EN_ROUTE", "mobile.en_route", "Driver started trip from mobile app.");
}

export async function recordMobileLocation(
  context: MobileUserContext,
  assignmentId: string,
  location: LocationInput
) {
  assertCanUpdateDriverPortal(context);
  const assignment = await getMobileAssignment(context, assignmentId);
  assertAssignmentAccepted(assignment);
  assertLocation(location);

  const ping = await createLocationPing(context, assignment, location);

  return {
    id: ping.id,
    capturedAt: ping.capturedAt.toISOString(),
  };
}

export async function markMobileArrived(context: MobileUserContext, assignmentId: string, location?: LocationInput) {
  assertCanUpdateDriverPortal(context);
  const assignment = await getMobileAssignment(context, assignmentId);
  assertAssignmentAccepted(assignment);

  if (location) {
    assertLocation(location);
    await createLocationPing(context, assignment, location);
  }

  await changeTripStatus(context, assignment, "ARRIVED", "mobile.arrived", "Driver arrived from mobile app.");
}

export async function completeMobileAssignment(
  context: MobileUserContext,
  assignmentId: string,
  location: LocationInput,
  routeUrl?: string | null
) {
  assertCanUpdateDriverPortal(context);
  const assignment = await getMobileAssignment(context, assignmentId);
  assertAssignmentAccepted(assignment);
  assertLocation(location);

  await createLocationPing(context, assignment, location);

  await db.assignment.update({
    where: { id: assignment.id },
    data: {
      status: "COMPLETED",
      updatedById: context.user.id,
    },
  });

  await recordAssignmentStatus(context, assignment, "COMPLETED", "Driver completed trip from mobile app.");
  await changeTripStatus(context, assignment, "COMPLETED", "mobile.completed", "Driver completed trip from mobile app.");
  await ensureMileageRecord(context, assignment, routeUrl ?? null);
}

export async function reportMobileIssue(
  context: MobileUserContext,
  assignmentId: string,
  summary: string,
  details?: string
) {
  assertCanUpdateDriverPortal(context);

  if (!summary) {
    throw new Error("Issue summary is required.");
  }

  const assignment = await getMobileAssignment(context, assignmentId);
  const incident = await db.incident.create({
    data: {
      organizationId: context.membership.organizationId,
      severity: "MEDIUM",
      status: "OPEN",
      summary,
      details,
      riderId: assignment.tripLeg.rideRequest.riderId,
      driverId: context.driver.id,
      rideRequestId: assignment.tripLeg.rideRequestId,
      tripLegId: assignment.tripLegId,
      assignmentId: assignment.id,
      createdById: context.user.id,
      updatedById: context.user.id,
    },
  });

  await notifyDispatch(context, assignment, "Driver reported issue", [summary, details].filter(Boolean).join("\n"), incident.id);
  await changeTripStatus(context, assignment, "NEEDS_ATTENTION", "mobile.issue_reported", summary, true);
}

function assertCanUpdateDriverPortal(context: MobileUserContext) {
  if (!context.membership.permissions.includes("driver_portal:update")) {
    throw new Error("This account cannot update driver trips.");
  }
}

export function parseLocationInput(value: unknown): LocationInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("GPS location is required.");
  }

  const input = value as Record<string, unknown>;
  const capturedAt = typeof input.capturedAt === "string" ? new Date(input.capturedAt) : undefined;

  return {
    latitude: Number(input.latitude),
    longitude: Number(input.longitude),
    accuracyMeters: optionalNumber(input.accuracyMeters ?? input.accuracy),
    speedMetersPerSecond: optionalNumber(input.speedMetersPerSecond ?? input.speed),
    headingDegrees: optionalNumber(input.headingDegrees ?? input.heading),
    capturedAt: capturedAt && !Number.isNaN(capturedAt.getTime()) ? capturedAt : undefined,
  };
}

async function getMobileAssignment(context: MobileUserContext, assignmentId: string) {
  return db.assignment.findFirstOrThrow({
    where: {
      id: assignmentId,
      organizationId: context.membership.organizationId,
      driverId: context.driver.id,
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
}

type MobileAssignment = Awaited<ReturnType<typeof getMobileAssignment>>;

async function createLocationPing(context: MobileUserContext, assignment: MobileAssignment, location: LocationInput) {
  return db.driverLocationPing.create({
    data: {
      organizationId: context.membership.organizationId,
      driverId: context.driver.id,
      assignmentId: assignment.id,
      tripLegId: assignment.tripLegId,
      latitude: location.latitude.toFixed(7),
      longitude: location.longitude.toFixed(7),
      accuracyMeters: location.accuracyMeters?.toFixed(2),
      speedMetersPerSecond: location.speedMetersPerSecond?.toFixed(2),
      headingDegrees: location.headingDegrees?.toFixed(2),
      source: "mobile_app",
      capturedAt: location.capturedAt ?? new Date(),
    },
  });
}

async function ensureMileageRecord(context: MobileUserContext, assignment: MobileAssignment, routeUrl: string | null) {
  const pings = await db.driverLocationPing.findMany({
    where: {
      organizationId: context.membership.organizationId,
      assignmentId: assignment.id,
      driverId: context.driver.id,
    },
    orderBy: { capturedAt: "asc" },
  });
  const gpsDistanceMiles = pings.length > 1 ? Math.max(0.1, calculatePingDistanceMiles(pings)) : null;
  const rate = await getSettingValue<MileageRateSetting>(context.membership.organizationId, "reimbursementRate");
  const rateCents = rate?.rateCents ?? 67;
  const estimatedMiles = Number(assignment.tripLeg.estimatedMiles ?? 0);
  const payableMiles = gpsDistanceMiles ?? estimatedMiles;
  const firstPing = pings[0];
  const lastPing = pings.at(-1);
  const gpsTrack = pings.map((ping) => ({
    latitude: Number(ping.latitude),
    longitude: Number(ping.longitude),
    accuracy: ping.accuracyMeters ? Number(ping.accuracyMeters) : undefined,
    capturedAt: ping.capturedAt.toISOString(),
  }));
  const gpsAccuracySummary = buildAccuracySummary(gpsTrack);

  await db.mileageRecord.upsert({
    where: { tripLegId: assignment.tripLegId },
    update: {
      assignmentId: assignment.id,
      driverId: context.driver.id,
      estimatedMiles: estimatedMiles.toFixed(2),
      submittedMiles: payableMiles.toFixed(2),
      miles: payableMiles.toFixed(2),
      mileageSource: gpsDistanceMiles === null ? "estimated_fallback" : "mobile_gps",
      routeProvider: routeUrl ? "google_maps" : undefined,
      routeUrl: routeUrl ?? undefined,
      gpsDistanceMiles: gpsDistanceMiles?.toFixed(2),
      gpsStartLatitude: firstPing?.latitude,
      gpsStartLongitude: firstPing?.longitude,
      gpsEndLatitude: lastPing?.latitude,
      gpsEndLongitude: lastPing?.longitude,
      gpsStartedAt: firstPing?.capturedAt,
      gpsCompletedAt: lastPing?.capturedAt,
      gpsPointCount: pings.length,
      gpsAccuracySummary,
      gpsTrack: gpsTrack.map(toGpsJson),
      status: "SUBMITTED",
      rateCents,
      amountCents: Math.round(payableMiles * rateCents),
      submittedAt: new Date(),
      updatedById: context.user.id,
    },
    create: {
      organizationId: context.membership.organizationId,
      tripLegId: assignment.tripLegId,
      assignmentId: assignment.id,
      driverId: context.driver.id,
      status: "SUBMITTED",
      serviceDate: assignment.tripLeg.scheduledPickupAt,
      estimatedMiles: estimatedMiles.toFixed(2),
      submittedMiles: payableMiles.toFixed(2),
      miles: payableMiles.toFixed(2),
      mileageSource: gpsDistanceMiles === null ? "estimated_fallback" : "mobile_gps",
      routeProvider: routeUrl ? "google_maps" : undefined,
      routeUrl: routeUrl ?? undefined,
      gpsDistanceMiles: gpsDistanceMiles?.toFixed(2),
      gpsStartLatitude: firstPing?.latitude,
      gpsStartLongitude: firstPing?.longitude,
      gpsEndLatitude: lastPing?.latitude,
      gpsEndLongitude: lastPing?.longitude,
      gpsStartedAt: firstPing?.capturedAt,
      gpsCompletedAt: lastPing?.capturedAt,
      gpsPointCount: pings.length,
      gpsAccuracySummary,
      gpsTrack: gpsTrack.map(toGpsJson),
      rateCents,
      amountCents: Math.round(payableMiles * rateCents),
      submittedAt: new Date(),
      createdById: context.user.id,
      updatedById: context.user.id,
    },
  });

  await writeAudit(context, assignment, "mobile.gps_mileage_captured", {
    estimatedMiles,
    gpsDistanceMiles,
    gpsPointCount: pings.length,
    payableMiles,
    source: gpsDistanceMiles === null ? "estimated_fallback" : "mobile_gps",
    gpsAccuracySummary,
  });
}

async function changeTripStatus(
  context: MobileUserContext,
  assignment: MobileAssignment,
  status: PortalTripStatus,
  action: string,
  note: string,
  moveRequestToAttention = false
) {
  const trip = assignment.tripLeg;
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
      assignmentId: assignment.id,
      note,
    },
  });

  await writeAudit(context, assignment, action, { oldStatus: trip.status, newStatus: status, note });
}

async function recordAssignmentStatus(
  context: MobileUserContext,
  assignment: MobileAssignment,
  newStatus: "ACCEPTED" | "DECLINED" | "COMPLETED",
  note: string
) {
  await db.statusHistory.create({
    data: {
      organizationId: context.membership.organizationId,
      entityType: "Assignment",
      entityId: assignment.id,
      oldStatus: assignment.status,
      newStatus,
      changedById: context.user.id,
      tripLegId: assignment.tripLegId,
      assignmentId: assignment.id,
      note,
    },
  });
}

async function notifyDispatch(
  context: MobileUserContext,
  assignment: MobileAssignment,
  subject: string,
  body: string,
  incidentId?: string
) {
  await db.communicationLog.create({
    data: {
      organizationId: context.membership.organizationId,
      type: "NOTE",
      subject,
      body,
      riderId: assignment.tripLeg.rideRequest.riderId,
      driverId: context.driver.id,
      rideRequestId: assignment.tripLeg.rideRequestId,
      tripLegId: assignment.tripLegId,
      assignmentId: assignment.id,
      incidentId,
      createdById: context.user.id,
      updatedById: context.user.id,
    },
  });
}

async function writeAudit(
  context: MobileUserContext,
  assignment: MobileAssignment,
  action: string,
  metadata?: Prisma.InputJsonValue
) {
  await db.auditLog.create({
    data: {
      organizationId: context.membership.organizationId,
      actorUserId: context.user.id,
      action,
      entityType: "TripLeg",
      entityId: assignment.tripLegId,
      driverId: context.driver.id,
      rideRequestId: assignment.tripLeg.rideRequestId,
      tripLegId: assignment.tripLegId,
      assignmentId: assignment.id,
      metadata,
    },
  });
}

function assertAssignmentOpen(assignment: MobileAssignment) {
  if (assignment.status === "COMPLETED" || assignment.status === "CANCELED") {
    throw new Error("This assignment is already closed.");
  }
}

function assertAssignmentAccepted(assignment: MobileAssignment) {
  if (assignment.status !== "ACCEPTED") {
    throw new Error("Accept the assignment before updating trip progress.");
  }
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

function assertLocation(location: LocationInput) {
  if (
    !Number.isFinite(location.latitude) ||
    !Number.isFinite(location.longitude) ||
    location.latitude < -90 ||
    location.latitude > 90 ||
    location.longitude < -180 ||
    location.longitude > 180
  ) {
    throw new Error("A valid GPS location is required.");
  }
}

function calculatePingDistanceMiles(pings: Array<{ latitude: Prisma.Decimal; longitude: Prisma.Decimal }>) {
  return pings.reduce((total, ping, index) => {
    const previous = pings[index - 1];

    if (!previous) {
      return total;
    }

    return total + calculateDistanceMiles(
      Number(previous.latitude),
      Number(previous.longitude),
      Number(ping.latitude),
      Number(ping.longitude)
    );
  }, 0);
}

function calculateDistanceMiles(
  startLatitude: number,
  startLongitude: number,
  endLatitude: number,
  endLongitude: number
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

  return earthRadiusMiles * centralAngle;
}

function buildAccuracySummary(points: Array<{ accuracy?: number }>): Prisma.InputJsonObject {
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

  return {
    pointCount: points.length,
    accuracyPointCount: accuracies.length,
    averageMeters: Number(averageMeters.toFixed(1)),
    maxMeters: Number(Math.max(...accuracies).toFixed(1)),
  };
}

function toGpsJson(point: LocationInput | { latitude: number; longitude: number; accuracy?: number; capturedAt?: string }) {
  return {
    latitude: Number(point.latitude.toFixed(6)),
    longitude: Number(point.longitude.toFixed(6)),
    capturedAt:
      "capturedAt" in point && typeof point.capturedAt === "string"
        ? point.capturedAt
        : new Date().toISOString(),
    ...("accuracy" in point && point.accuracy !== undefined ? { accuracy: point.accuracy } : {}),
    ...("accuracyMeters" in point && point.accuracyMeters !== undefined ? { accuracy: point.accuracyMeters } : {}),
  };
}

function optionalNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}
