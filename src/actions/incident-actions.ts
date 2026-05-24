"use server";

import { IncidentSeverity, IncidentStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAuthenticatedUser, requirePermission } from "@/lib/auth/guards";
import { db } from "@/lib/db";

const optionalCuid = z.string().cuid().optional();

const createIncidentSchema = z.object({
  summary: z.string().trim().min(1),
  details: z.string().trim().optional(),
  severity: z.nativeEnum(IncidentSeverity),
  riderId: optionalCuid,
  driverId: optionalCuid,
  tripLegId: optionalCuid,
});

const updateIncidentStatusSchema = z.object({
  incidentId: z.string().cuid(),
  status: z.nativeEnum(IncidentStatus),
});

export async function createIncidentAction(formData: FormData) {
  const user = await requireAuthenticatedUser();
  const membership = await requirePermission("incidents:view");
  const input = createIncidentSchema.parse({
    summary: formData.get("summary"),
    details: formData.get("details") || undefined,
    severity: formData.get("severity"),
    riderId: optionalValue(formData.get("riderId")),
    driverId: optionalValue(formData.get("driverId")),
    tripLegId: optionalValue(formData.get("tripLegId")),
  });
  const trip = input.tripLegId
    ? await db.tripLeg.findFirst({
        where: { id: input.tripLegId, organizationId: membership.organizationId, deletedAt: null },
        include: { rideRequest: true, assignment: true },
      })
    : null;

  const incident = await db.incident.create({
    data: {
      organizationId: membership.organizationId,
      severity: input.severity,
      status: IncidentStatus.OPEN,
      summary: input.summary,
      details: input.details,
      riderId: input.riderId ?? trip?.rideRequest.riderId,
      driverId: input.driverId ?? trip?.assignment?.driverId,
      rideRequestId: trip?.rideRequestId,
      tripLegId: trip?.id,
      assignmentId: trip?.assignment?.id,
      createdById: user.id,
      updatedById: user.id,
    },
  });

  await db.auditLog.create({
    data: {
      organizationId: membership.organizationId,
      actorUserId: user.id,
      action: "incident.created",
      entityType: "Incident",
      entityId: incident.id,
      incidentId: incident.id,
      riderId: incident.riderId,
      driverId: incident.driverId,
      rideRequestId: incident.rideRequestId,
      tripLegId: incident.tripLegId,
      assignmentId: incident.assignmentId,
      metadata: {
        severity: incident.severity,
        status: incident.status,
        summary: incident.summary,
      },
    },
  });
  revalidatePath("/incidents");
  revalidatePath("/notifications");
}

export async function updateIncidentStatusAction(formData: FormData) {
  const user = await requireAuthenticatedUser();
  const membership = await requirePermission("incidents:view");
  const input = updateIncidentStatusSchema.parse({
    incidentId: formData.get("incidentId"),
    status: formData.get("status"),
  });
  const current = await db.incident.findFirstOrThrow({
    where: { id: input.incidentId, organizationId: membership.organizationId, deletedAt: null },
  });
  const incident = await db.incident.update({
    where: { id: current.id },
    data: {
      status: input.status,
      updatedById: user.id,
    },
  });

  await db.statusHistory.create({
    data: {
      organizationId: membership.organizationId,
      entityType: "Incident",
      entityId: incident.id,
      oldStatus: current.status,
      newStatus: incident.status,
      changedById: user.id,
      incidentId: incident.id,
      note: "Incident status updated from incidents workspace.",
    },
  });
  await db.auditLog.create({
    data: {
      organizationId: membership.organizationId,
      actorUserId: user.id,
      action: "incident.status_changed",
      entityType: "Incident",
      entityId: incident.id,
      incidentId: incident.id,
      metadata: {
        oldStatus: current.status,
        newStatus: incident.status,
      },
    },
  });
  revalidatePath("/incidents");
  revalidatePath("/notifications");
}

function optionalValue(value: FormDataEntryValue | null) {
  const stringValue = typeof value === "string" ? value.trim() : "";
  return stringValue.length > 0 ? stringValue : undefined;
}
