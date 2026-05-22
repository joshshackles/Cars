"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { requireAuthenticatedUser, requirePermission } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { getCurrentPortalDriver } from "@/lib/driver-portal/driver-portal-queries";
import { getSettingValue } from "@/lib/settings/settings-service";

type PortalTripStatus = "DRIVER_CONFIRMED" | "EN_ROUTE" | "ARRIVED" | "COMPLETED" | "NEEDS_ATTENTION";

const allowedPortalTransitions: Record<string, PortalTripStatus[]> = {
  ASSIGNED: ["DRIVER_CONFIRMED", "NEEDS_ATTENTION"],
  DRIVER_CONFIRMED: ["EN_ROUTE", "NEEDS_ATTENTION"],
  EN_ROUTE: ["ARRIVED", "NEEDS_ATTENTION"],
  IN_PROGRESS: ["ARRIVED", "NEEDS_ATTENTION"],
  ARRIVED: ["COMPLETED", "NEEDS_ATTENTION"],
  COMPLETED: ["NEEDS_ATTENTION"],
};

type MileageRateSetting = {
  rateCents?: number;
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

export async function markEnRouteAction(assignmentId: string) {
  const context = await getPortalAssignment(assignmentId);
  assertAssignmentAccepted(context);
  await changePortalTripStatus(context, "EN_ROUTE", "driver_portal.en_route", "Driver marked en route.");
}

export async function markArrivedAction(assignmentId: string) {
  const context = await getPortalAssignment(assignmentId);
  assertAssignmentAccepted(context);
  await changePortalTripStatus(context, "ARRIVED", "driver_portal.arrived", "Driver marked arrived.");
}

export async function markCompletedAction(assignmentId: string) {
  const context = await getPortalAssignment(assignmentId);
  assertAssignmentAccepted(context);

  await db.assignment.update({
    where: { id: context.assignment.id },
    data: {
      status: "COMPLETED",
      updatedById: context.user.id,
    },
  });

  await recordAssignmentStatus(context, "COMPLETED", "Driver marked trip completed.");
  await changePortalTripStatus(context, "COMPLETED", "driver_portal.completed", "Driver marked trip completed.");
  await ensureMileageRecord(context);
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

async function ensureMileageRecord(context: PortalAssignmentContext) {
  const rate = await getSettingValue<MileageRateSetting>(context.membership.organizationId, "reimbursementRate");
  const rateCents = rate?.rateCents ?? 67;
  const estimatedMiles = Number(context.assignment.tripLeg.estimatedMiles ?? 0);

  await db.mileageRecord.upsert({
    where: { tripLegId: context.assignment.tripLegId },
    update: {
      estimatedMiles: estimatedMiles.toFixed(2),
      updatedById: context.user.id,
    },
    create: {
      organizationId: context.membership.organizationId,
      tripLegId: context.assignment.tripLegId,
      assignmentId: context.assignment.id,
      driverId: context.driver.id,
      status: "DRAFT",
      serviceDate: context.assignment.tripLeg.scheduledPickupAt,
      estimatedMiles: estimatedMiles.toFixed(2),
      miles: estimatedMiles.toFixed(2),
      rateCents,
      amountCents: Math.round(estimatedMiles * rateCents),
      createdById: context.user.id,
      updatedById: context.user.id,
    },
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
  revalidatePath("/dispatch");
  revalidatePath("/dispatch/weekly");
}
