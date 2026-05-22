import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import { settingValueSchemas } from "@/schemas/settings-schema";
import type { SettingKey, SettingOption, SettingValidationIssue } from "@/types/settings";

export async function getOrganizationSettings(organizationId: string) {
  return db.programSetting.findMany({
    where: {
      organizationId,
      deletedAt: null,
    },
    orderBy: [{ category: "asc" }, { label: "asc" }],
  });
}

export const getCachedOrganizationSettings = unstable_cache(
  async (organizationId: string) => getOrganizationSettings(organizationId),
  ["organization-settings"],
  {
    tags: ["organization-settings"],
  }
);

export async function getSettingValue<T = unknown>(
  organizationId: string,
  key: SettingKey
): Promise<T | null> {
  const setting = await db.programSetting.findUnique({
    where: {
      organizationId_key: {
        organizationId,
        key,
      },
    },
  });

  return (setting?.value as T | undefined) ?? null;
}

export async function getSettingOptions(
  organizationId: string,
  key: SettingKey
): Promise<SettingOption[]> {
  const value = await getSettingValue<unknown>(organizationId, key);

  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(isSettingOption)
    .filter((option) => option.active !== false);
}

export async function isValidSettingOptionCode(
  organizationId: string,
  key: SettingKey,
  code: string
) {
  const options = await getSettingOptions(organizationId, key);

  return options.some((option) => option.code === code);
}

export async function validateOrganizationSettings(
  organizationId: string
): Promise<SettingValidationIssue[]> {
  const settings = await getOrganizationSettings(organizationId);
  const issues: SettingValidationIssue[] = [];
  const seenKeys = new Set(settings.map((setting) => setting.key));

  for (const key of Object.keys(settingValueSchemas) as SettingKey[]) {
    if (!seenKeys.has(key)) {
      issues.push({
        key,
        label: key,
        message: "Setting is missing for this organization.",
      });
    }
  }

  for (const setting of settings) {
    const key = setting.key as SettingKey;
    const schema = settingValueSchemas[key];

    if (!schema) {
      issues.push({
        key: setting.key,
        label: setting.label,
        message: "Setting key is not recognized by the application.",
      });
      continue;
    }

    const result = schema.safeParse(setting.value);

    if (!result.success) {
      issues.push({
        key: setting.key,
        label: setting.label,
        message: result.error.issues.map((issue) => issue.message).join("; "),
      });
    }
  }

  return issues;
}

export async function getSettingAuditLogs(organizationId: string) {
  return db.auditLog.findMany({
    where: {
      organizationId,
      entityType: "ProgramSetting",
    },
    include: {
      actorUser: true,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 100,
  });
}

function isSettingOption(value: unknown): value is SettingOption {
  return (
    typeof value === "object" &&
    value !== null &&
    "code" in value &&
    "label" in value &&
    typeof value.code === "string" &&
    typeof value.label === "string"
  );
}
