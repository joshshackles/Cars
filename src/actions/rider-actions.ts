"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAuthenticatedUser, requirePermission } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { isValidSettingOptionCode } from "@/lib/settings/settings-service";
import { riderFormSchema } from "@/schemas/rider-schema";

export async function createRiderAction(formData: FormData) {
  const user = await requireAuthenticatedUser();
  const membership = await requirePermission("riders:manage");
  const input = await parseAndValidateRiderForm(formData, membership.organizationId);
  const displayName = `${input.firstName} ${input.lastName}`.trim();

  const rider = await db.rider.create({
    data: {
      organizationId: membership.organizationId,
      displayName,
      ...input,
      email: input.email || null,
      createdById: user.id,
      updatedById: user.id,
    },
  });

  await db.auditLog.create({
    data: {
      organizationId: membership.organizationId,
      actorUserId: user.id,
      action: "rider.created",
      entityType: "Rider",
      entityId: rider.id,
      riderId: rider.id,
      metadata: { displayName: rider.displayName },
    },
  });

  await db.statusHistory.create({
    data: {
      organizationId: membership.organizationId,
      entityType: "Rider",
      entityId: rider.id,
      newStatus: rider.status,
      changedById: user.id,
      riderId: rider.id,
      note: "Rider created.",
    },
  });

  revalidatePath("/riders");
  redirect(`/riders/${rider.id}`);
}

export async function updateRiderAction(riderId: string, formData: FormData) {
  const user = await requireAuthenticatedUser();
  const membership = await requirePermission("riders:manage");
  const input = await parseAndValidateRiderForm(formData, membership.organizationId);
  const existing = await db.rider.findFirstOrThrow({
    where: {
      id: riderId,
      organizationId: membership.organizationId,
      deletedAt: null,
    },
  });

  const displayName = `${input.firstName} ${input.lastName}`.trim();
  const rider = await db.rider.update({
    where: { id: existing.id },
    data: {
      displayName,
      ...input,
      email: input.email || null,
      updatedById: user.id,
    },
  });

  await db.auditLog.create({
    data: {
      organizationId: membership.organizationId,
      actorUserId: user.id,
      action: "rider.updated",
      entityType: "Rider",
      entityId: rider.id,
      riderId: rider.id,
      metadata: {
        displayName: rider.displayName,
        previousStatus: existing.status,
        nextStatus: rider.status,
      },
    },
  });

  if (existing.status !== rider.status) {
    await db.statusHistory.create({
      data: {
        organizationId: membership.organizationId,
        entityType: "Rider",
        entityId: rider.id,
        oldStatus: existing.status,
        newStatus: rider.status,
        changedById: user.id,
        riderId: rider.id,
        note: "Rider status changed.",
      },
    });
  }

  revalidatePath("/riders");
  revalidatePath(`/riders/${rider.id}`);
  redirect(`/riders/${rider.id}`);
}

async function parseAndValidateRiderForm(formData: FormData, organizationId: string) {
  const input = riderFormSchema.parse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    phone: formData.get("phone") || undefined,
    email: formData.get("email") || undefined,
    addressLine1: formData.get("addressLine1") || undefined,
    addressLine2: formData.get("addressLine2") || undefined,
    city: formData.get("city") || undefined,
    county: formData.get("county"),
    state: formData.get("state") || undefined,
    postalCode: formData.get("postalCode") || undefined,
    emergencyContactName: formData.get("emergencyContactName") || undefined,
    emergencyContactPhone: formData.get("emergencyContactPhone") || undefined,
    communicationPreference: formData.get("communicationPreference") || undefined,
    mobilityNotes: formData.get("mobilityNotes") || undefined,
    riderNotes: formData.get("riderNotes") || undefined,
    sensitiveNotes: formData.get("sensitiveNotes") || undefined,
    eligibilityConfirmed: formData.get("eligibilityConfirmed") === "on",
    intakeDate: formData.get("intakeDate") || undefined,
    pickupInstructions: formData.get("pickupInstructions") || undefined,
    status: formData.get("status"),
  });

  const [countyValid, statusValid] = await Promise.all([
    isValidSettingOptionCode(organizationId, "countiesServed", input.county),
    isValidSettingOptionCode(organizationId, "riderStatuses", input.status),
  ]);

  if (!countyValid) {
    throw new Error("County is not valid for this organization.");
  }

  if (!statusValid) {
    throw new Error("Rider status is not valid for this organization.");
  }

  return input;
}
