"use server";

import type { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { requireAuthenticatedUser, requirePermission } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { getDriverSuitability } from "@/lib/dispatch/dispatch-queries";
import { hasPermission } from "@/lib/auth/permissions";
import { getSettingValue } from "@/lib/settings/settings-service";

type DispatchStatus = "ASSIGNED" | "DRIVER_CONFIRMED" | "COMPLETED" | "CANCELED" | "NO_SHOW";

const allowedDispatchTransitions: Record<string, DispatchStatus[]> = {
  PENDING: ["ASSIGNED", "CANCELED"],
  READY_TO_ASSIGN: ["ASSIGNED", "CANCELED"],
  ASSIGNED: ["ASSIGNED", "DRIVER_CONFIRMED", "CANCELED", "NO_SHOW"],
  DRIVER_CONFIRMED: ["ASSIGNED", "COMPLETED", "CANCELED", "NO_SHOW"],
  IN_PROGRESS: ["COMPLETED", "CANCELED", "NO_SHOW"],
  EN_ROUTE: ["COMPLETED", "CANCELED", "NO_SHOW"],
  ARRIVED: ["COMPLETED", "CANCELED", "NO_SHOW"],
  NEEDS_ATTENTION: ["ASSIGNED", "CANCELED"],
};

export async function assignDriverAction(tripLegId: string, formData: FormData) {
  const user = await requireAuthenticatedUser();
  const membership = await requirePermission("dispatch:manage");
  const driverId = String(formData.get("driverId") ?? "");
  const overrideReason = String(formData.get("overrideReason") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const suitability = await getDriverSuitability(membership.organizationId, tripLegId);
  const selected = suitability.find((item) => item.driver.id === driverId);
  const needsOverride = Boolean(selected?.warnings.length);

  if (needsOverride && !hasPermission(membership, "dispatch:override")) {
    throw new Error("This assignment requires override permission.");
  }

  if (needsOverride && !overrideReason) {
    throw new Error("Override reason is required.");
  }

  const existing = await db.assignment.findUnique({
    where: { tripLegId },
  });

  const assignment = existing
    ? await db.assignment.update({
        where: { id: existing.id },
        data: {
          driverId,
          status: "OFFERED",
          notes: notes || existing.notes,
          updatedById: user.id,
        },
      })
    : await db.assignment.create({
        data: {
          organizationId: membership.organizationId,
          tripLegId,
          driverId,
          status: "OFFERED",
          notes,
          createdById: user.id,
          updatedById: user.id,
        },
      });

  await db.statusHistory.create({
    data: {
      organizationId: membership.organizationId,
      entityType: "Assignment",
      entityId: assignment.id,
      oldStatus: existing?.status,
      newStatus: assignment.status,
      changedById: user.id,
      tripLegId,
      assignmentId: assignment.id,
      note: existing ? "Driver reassigned." : "Driver assigned.",
    },
  });

  await changeTripStatus({
    organizationId: membership.organizationId,
    userId: user.id,
    tripLegId,
    status: "ASSIGNED",
    action: existing ? "dispatch.reassigned" : "dispatch.assigned",
    assignmentId: assignment.id,
    metadata: {
      driverId,
      overrideReason: overrideReason || null,
      warnings: selected?.warnings ?? [],
      notes,
    },
  });
}

export async function confirmRideAction(tripLegId: string) {
  await statusAction(tripLegId, "DRIVER_CONFIRMED", "dispatch.status_changed", "Ride confirmed.");
}

export async function completeRideAction(tripLegId: string) {
  await statusAction(tripLegId, "COMPLETED", "dispatch.status_changed", "Ride completed.");
}

export async function cancelRideAction(tripLegId: string, formData: FormData) {
  const reason = String(formData.get("reason") ?? "").trim();
  if (!reason) {
    throw new Error("Cancel reason is required.");
  }
  await statusAction(tripLegId, "CANCELED", "dispatch.status_changed", reason);
}

export async function markNoShowAction(tripLegId: string, formData: FormData) {
  const reason = String(formData.get("reason") ?? "").trim();
  if (!reason) {
    throw new Error("No-show reason is required.");
  }
  await statusAction(tripLegId, "NO_SHOW", "dispatch.status_changed", reason);
}

export async function addDispatchNoteAction(tripLegId: string, formData: FormData) {
  const user = await requireAuthenticatedUser();
  const membership = await requirePermission("dispatch:manage");
  const note = String(formData.get("note") ?? "").trim();

  if (!note) {
    throw new Error("Note is required.");
  }

  const trip = await db.tripLeg.findFirstOrThrow({
    where: { id: tripLegId, organizationId: membership.organizationId, deletedAt: null },
  });

  await db.tripLeg.update({
    where: { id: trip.id },
    data: {
      notes: [trip.notes, note].filter(Boolean).join("\n"),
      updatedById: user.id,
    },
  });

  await writeAudit({
    organizationId: membership.organizationId,
    userId: user.id,
    tripLegId,
    action: "dispatch.note_added",
    metadata: { note },
  });

  revalidateDispatch();
}

async function statusAction(tripLegId: string, status: DispatchStatus, action: string, note: string) {
  const user = await requireAuthenticatedUser();
  const membership = await requirePermission("dispatch:manage");

  await changeTripStatus({
    organizationId: membership.organizationId,
    userId: user.id,
    tripLegId,
    status,
    action,
    metadata: { note },
  });
}

async function changeTripStatus({
  organizationId,
  userId,
  tripLegId,
  status,
  action,
  assignmentId,
  metadata,
}: {
  organizationId: string;
  userId: string;
  tripLegId: string;
  status: DispatchStatus;
  action: string;
  assignmentId?: string;
  metadata?: unknown;
}) {
  const trip = await db.tripLeg.findFirstOrThrow({
    where: { id: tripLegId, organizationId, deletedAt: null },
    include: { assignment: true },
  });

  assertDispatchTransition(trip.status, status);

  if ((status === "DRIVER_CONFIRMED" || status === "COMPLETED") && !trip.assignment) {
    throw new Error("A trip must be assigned before it can be confirmed or completed.");
  }

  await db.tripLeg.update({
    where: { id: trip.id },
    data: {
      status,
      completedAt: status === "COMPLETED" ? new Date() : undefined,
      updatedById: userId,
    },
  });

  if (trip.assignment && ["DRIVER_CONFIRMED", "COMPLETED", "CANCELED"].includes(status)) {
    const nextAssignmentStatus =
      status === "COMPLETED" ? "COMPLETED" : status === "CANCELED" ? "CANCELED" : "ACCEPTED";
    await db.assignment.update({
      where: { id: trip.assignment.id },
      data: {
        status: nextAssignmentStatus,
        respondedAt: new Date(),
        updatedById: userId,
      },
    });

    if (trip.assignment.status !== nextAssignmentStatus) {
      await db.statusHistory.create({
        data: {
          organizationId,
          entityType: "Assignment",
          entityId: trip.assignment.id,
          oldStatus: trip.assignment.status,
          newStatus: nextAssignmentStatus,
          changedById: userId,
          tripLegId: trip.id,
          assignmentId: trip.assignment.id,
          note: "Assignment status changed from dispatch.",
        },
      });
    }
  }

  await db.statusHistory.create({
    data: {
      organizationId,
      entityType: "TripLeg",
      entityId: trip.id,
      oldStatus: trip.status,
      newStatus: status,
      changedById: userId,
      tripLegId: trip.id,
      assignmentId: assignmentId ?? trip.assignment?.id,
      note: typeof metadata === "object" && metadata && "note" in metadata ? String((metadata as { note?: string }).note) : undefined,
    },
  });

  await writeAudit({
    organizationId,
    userId,
    tripLegId: trip.id,
    assignmentId: assignmentId ?? trip.assignment?.id,
    action,
    metadata: { oldStatus: trip.status, newStatus: status, ...((metadata as object) ?? {}) },
  });

  if (status === "COMPLETED" && trip.assignment) {
    await ensureMileageRecord({
      organizationId,
      userId,
      trip,
      assignment: trip.assignment,
    });
  }

  revalidateDispatch();
}

function assertDispatchTransition(currentStatus: string, nextStatus: DispatchStatus) {
  if (currentStatus === nextStatus) {
    return;
  }

  const allowed = allowedDispatchTransitions[currentStatus] ?? [];
  if (!allowed.includes(nextStatus)) {
    throw new Error(`Cannot move trip from ${currentStatus} to ${nextStatus}.`);
  }
}

async function ensureMileageRecord({
  organizationId,
  userId,
  trip,
  assignment,
}: {
  organizationId: string;
  userId: string;
  trip: {
    id: string;
    scheduledPickupAt: Date;
    estimatedMiles: unknown;
  };
  assignment: {
    id: string;
    driverId: string;
  };
}) {
  const rate = await getSettingValue<{ rateCents?: number }>(organizationId, "reimbursementRate");
  const rateCents = rate?.rateCents ?? 67;
  const estimatedMiles = Number(trip.estimatedMiles ?? 0);

  await db.mileageRecord.upsert({
    where: { tripLegId: trip.id },
    update: {
      estimatedMiles: estimatedMiles.toFixed(2),
      updatedById: userId,
    },
    create: {
      organizationId,
      tripLegId: trip.id,
      assignmentId: assignment.id,
      driverId: assignment.driverId,
      status: "DRAFT",
      serviceDate: trip.scheduledPickupAt,
      estimatedMiles: estimatedMiles.toFixed(2),
      miles: estimatedMiles.toFixed(2),
      rateCents,
      amountCents: Math.round(estimatedMiles * rateCents),
      createdById: userId,
      updatedById: userId,
    },
  });
}

async function writeAudit({
  organizationId,
  userId,
  tripLegId,
  assignmentId,
  action,
  metadata,
}: {
  organizationId: string;
  userId: string;
  tripLegId: string;
  assignmentId?: string;
  action: string;
  metadata?: Prisma.InputJsonValue;
}) {
  await db.auditLog.create({
    data: {
      organizationId,
      actorUserId: userId,
      action,
      entityType: "TripLeg",
      entityId: tripLegId,
      tripLegId,
      assignmentId,
      metadata,
    },
  });
}

function revalidateDispatch() {
  revalidatePath("/dispatch");
  revalidatePath("/dispatch/weekly");
}
