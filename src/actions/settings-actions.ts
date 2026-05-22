"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { requireAuthenticatedUser, requirePermission } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { settingValueSchemas, updateSettingSchema } from "@/schemas/settings-schema";
import type { SettingKey } from "@/types/settings";

export async function updateProgramSettingAction(formData: FormData) {
  const user = await requireAuthenticatedUser();
  const membership = await requirePermission("settings:manage");

  const parsed = updateSettingSchema.parse({
    settingId: formData.get("settingId"),
    key: formData.get("key"),
    value: formData.get("value"),
  });

  const jsonValue = JSON.parse(parsed.value);
  const settingKey = parsed.key as SettingKey;
  const schema = settingValueSchemas[settingKey];
  const validatedValue = schema.parse(jsonValue);

  const existing = await db.programSetting.findFirstOrThrow({
    where: {
      id: parsed.settingId,
      organizationId: membership.organizationId,
      deletedAt: null,
    },
  });

  const updated = await db.programSetting.update({
    where: {
      id: existing.id,
    },
    data: {
      value: validatedValue,
      updatedById: user.id,
    },
  });

  await db.auditLog.create({
    data: {
      organizationId: membership.organizationId,
      actorUserId: user.id,
      action: "setting.updated",
      entityType: "ProgramSetting",
      entityId: updated.id,
      metadata: {
        key: updated.key,
        previousValue: existing.value,
        nextValue: updated.value,
      },
    },
  });

  revalidateTag("organization-settings");
  revalidatePath("/settings");
  revalidatePath("/settings/edit");
  revalidatePath("/settings/validate");
  revalidatePath("/settings/audit");
}
