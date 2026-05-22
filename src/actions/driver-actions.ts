"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAuthenticatedUser, requirePermission } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { isValidSettingOptionCode } from "@/lib/settings/settings-service";
import { driverAvailabilitySchema, driverFormSchema } from "@/schemas/driver-schema";

export async function createDriverAction(formData: FormData) {
  const user = await requireAuthenticatedUser();
  const membership = await requirePermission("drivers:manage");
  const input = await parseDriverForm(formData, membership.organizationId);
  const displayName = `${input.firstName} ${input.lastName}`.trim();
  const vehicleLabel = [input.vehicleYear, input.vehicleMake, input.vehicleModel].filter(Boolean).join(" ");

  const driver = await db.driver.create({
    data: {
      organizationId: membership.organizationId,
      displayName,
      ...input,
      email: input.email || null,
      vehicleLabel: vehicleLabel || null,
      createdById: user.id,
      updatedById: user.id,
    },
  });

  await writeDriverAudit(membership.organizationId, user.id, driver.id, "driver.created", {
    displayName,
  });
  await writeDriverStatus(membership.organizationId, user.id, driver.id, null, driver.status, "Driver created.");

  revalidatePath("/drivers");
  redirect(`/drivers/${driver.id}`);
}

export async function updateDriverAction(driverId: string, formData: FormData) {
  const user = await requireAuthenticatedUser();
  const membership = await requirePermission("drivers:manage");
  const input = await parseDriverForm(formData, membership.organizationId);
  const existing = await db.driver.findFirstOrThrow({
    where: { id: driverId, organizationId: membership.organizationId, deletedAt: null },
  });
  const displayName = `${input.firstName} ${input.lastName}`.trim();
  const vehicleLabel = [input.vehicleYear, input.vehicleMake, input.vehicleModel].filter(Boolean).join(" ");

  const driver = await db.driver.update({
    where: { id: existing.id },
    data: {
      displayName,
      ...input,
      email: input.email || null,
      vehicleLabel: vehicleLabel || null,
      updatedById: user.id,
    },
  });

  await writeDriverAudit(membership.organizationId, user.id, driver.id, "driver.updated", {
    displayName,
    previousStatus: existing.status,
    nextStatus: driver.status,
  });

  if (existing.status !== driver.status) {
    await writeDriverStatus(
      membership.organizationId,
      user.id,
      driver.id,
      existing.status,
      driver.status,
      "Driver status changed."
    );
  }

  revalidatePath("/drivers");
  revalidatePath(`/drivers/${driver.id}`);
  redirect(`/drivers/${driver.id}`);
}

export async function createDriverAvailabilityAction(driverId: string, formData: FormData) {
  const user = await requireAuthenticatedUser();
  const membership = await requirePermission("drivers:manage");
  const input = driverAvailabilitySchema.parse({
    availabilityType: formData.get("availabilityType"),
    status: formData.get("status"),
    startsAt: formData.get("startsAt"),
    endsAt: formData.get("endsAt"),
    recurrenceRule: formData.get("recurrenceRule") || undefined,
    blackoutDate: formData.get("blackoutDate") || undefined,
    preferredCounties: formData.getAll("preferredCounties").map(String),
    maxDistanceMiles: formData.get("maxDistanceMiles") || undefined,
    notes: formData.get("notes") || undefined,
  });

  const driver = await db.driver.findFirstOrThrow({
    where: { id: driverId, organizationId: membership.organizationId, deletedAt: null },
  });

  await db.driverAvailability.create({
    data: {
      organizationId: membership.organizationId,
      driverId: driver.id,
      ...input,
      createdById: user.id,
      updatedById: user.id,
    },
  });

  await writeDriverAudit(membership.organizationId, user.id, driver.id, "driver_availability.created", input);
  revalidatePath(`/drivers/${driver.id}`);
}

async function parseDriverForm(formData: FormData, organizationId: string) {
  const input = driverFormSchema.parse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    phone: formData.get("phone") || undefined,
    email: formData.get("email") || undefined,
    addressLine1: formData.get("addressLine1") || undefined,
    addressLine2: formData.get("addressLine2") || undefined,
    city: formData.get("city") || undefined,
    state: formData.get("state") || undefined,
    postalCode: formData.get("postalCode") || undefined,
    countiesServed: formData.getAll("countiesServed").map(String),
    preferredRideTypes: formData.getAll("preferredRideTypes").map(String),
    vehicleMake: formData.get("vehicleMake") || undefined,
    vehicleModel: formData.get("vehicleModel") || undefined,
    vehicleYear: formData.get("vehicleYear") || undefined,
    licenseVerificationDate: formData.get("licenseVerificationDate") || undefined,
    insuranceVerificationDate: formData.get("insuranceVerificationDate") || undefined,
    backgroundCheckStatus: formData.get("backgroundCheckStatus") || undefined,
    onboardingStatus: formData.get("onboardingStatus") || undefined,
    reimbursementPreference: formData.get("reimbursementPreference") || undefined,
    status: formData.get("status"),
    driverNotes: formData.get("driverNotes") || undefined,
  });

  await validateCodes(organizationId, "countiesServed", input.countiesServed);
  await validateCodes(organizationId, "ridePurposes", input.preferredRideTypes);
  await validateCode(organizationId, "driverStatuses", input.status);

  if (input.onboardingStatus) {
    await validateCode(organizationId, "driverOnboardingStatuses", input.onboardingStatus);
  }
  if (input.backgroundCheckStatus) {
    await validateCode(organizationId, "backgroundCheckStatuses", input.backgroundCheckStatus);
  }
  if (input.reimbursementPreference) {
    await validateCode(organizationId, "reimbursementPreferences", input.reimbursementPreference);
  }

  return input;
}

async function validateCodes(organizationId: string, key: Parameters<typeof isValidSettingOptionCode>[1], codes: string[]) {
  for (const code of codes) {
    await validateCode(organizationId, key, code);
  }
}

async function validateCode(organizationId: string, key: Parameters<typeof isValidSettingOptionCode>[1], code: string) {
  const valid = await isValidSettingOptionCode(organizationId, key, code);
  if (!valid) {
    throw new Error(`${code} is not valid for ${key}.`);
  }
}

async function writeDriverAudit(organizationId: string, userId: string, driverId: string, action: string, metadata: unknown) {
  await db.auditLog.create({
    data: {
      organizationId,
      actorUserId: userId,
      action,
      entityType: "Driver",
      entityId: driverId,
      driverId,
      metadata,
    },
  });
}

async function writeDriverStatus(
  organizationId: string,
  userId: string,
  driverId: string,
  oldStatus: string | null,
  newStatus: string,
  note: string
) {
  await db.statusHistory.create({
    data: {
      organizationId,
      entityType: "Driver",
      entityId: driverId,
      oldStatus,
      newStatus,
      changedById: userId,
      driverId,
      note,
    },
  });
}
