import type { SettingValidationIssue } from "@/types/settings";

type SettingLike = {
  id: string;
  category: string;
  key: string;
  label: string;
  description: string | null;
  value: unknown;
  updatedAt?: Date;
};

type SettingOptionLike = {
  code: string;
  label: string;
  active?: boolean;
  channel?: string;
  body?: string;
};

export function formatSettingCategory(category: string) {
  return category
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function groupSettingsByCategory<T extends SettingLike>(settings: T[]) {
  return settings.reduce<Array<{ category: string; label: string; settings: T[] }>>(
    (groups, setting) => {
      const existing = groups.find((group) => group.category === setting.category);

      if (existing) {
        existing.settings.push(setting);
        return groups;
      }

      groups.push({
        category: setting.category,
        label: formatSettingCategory(setting.category),
        settings: [setting],
      });
      return groups;
    },
    []
  );
}

export function getLatestSettingUpdate(settings: SettingLike[]) {
  return settings.reduce<Date | null>((latest, setting) => {
    if (!setting.updatedAt) {
      return latest;
    }

    if (!latest || setting.updatedAt > latest) {
      return setting.updatedAt;
    }

    return latest;
  }, null);
}

export function summarizeSettingValue(value: unknown) {
  if (isSettingOptionArray(value)) {
    const activeCount = value.filter((option) => option.active !== false).length;
    return `${activeCount} active of ${value.length} option${value.length === 1 ? "" : "s"}`;
  }

  if (isServiceHours(value)) {
    const activeDays = value.weekly.filter((day) => day.active).length;
    return `${activeDays} active day${activeDays === 1 ? "" : "s"} in ${value.timezone}`;
  }

  if (isMinimumNotice(value)) {
    return `${value.amount} ${value.unit}`;
  }

  if (isReimbursementRate(value)) {
    return `${formatCents(value.rateCents)} per ${value.unit}`;
  }

  if (Array.isArray(value)) {
    return `${value.length} item${value.length === 1 ? "" : "s"}`;
  }

  if (isPlainObject(value)) {
    return `${Object.keys(value).length} field${Object.keys(value).length === 1 ? "" : "s"}`;
  }

  if (value === null || value === undefined) {
    return "Not set";
  }

  return String(value);
}

export function getSettingOptionPreview(value: unknown) {
  if (!isSettingOptionArray(value)) {
    return [];
  }

  return value.slice(0, 6);
}

export function getSettingObjectEntries(value: unknown) {
  if (!isPlainObject(value)) {
    return [];
  }

  return Object.entries(value).slice(0, 6);
}

export function getValidationStatus(issues: SettingValidationIssue[]) {
  return issues.length === 0 ? "Ready" : `${issues.length} issue${issues.length === 1 ? "" : "s"}`;
}

export function summarizeAuditMetadata(metadata: unknown) {
  if (!isPlainObject(metadata)) {
    return "Setting change";
  }

  const key = typeof metadata.key === "string" ? metadata.key : "Setting";
  const previous = "previousValue" in metadata ? summarizeSettingValue(metadata.previousValue) : null;
  const next = "nextValue" in metadata ? summarizeSettingValue(metadata.nextValue) : null;

  if (previous && next) {
    return `${key}: ${previous} to ${next}`;
  }

  return key;
}

export function isSettingOptionArray(value: unknown): value is SettingOptionLike[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        isPlainObject(item) &&
        typeof item.code === "string" &&
        typeof item.label === "string"
    )
  );
}

function isServiceHours(value: unknown): value is {
  timezone: string;
  weekly: Array<{ day: string; active: boolean }>;
} {
  return (
    isPlainObject(value) &&
    typeof value.timezone === "string" &&
    Array.isArray(value.weekly) &&
    value.weekly.every((day) => isPlainObject(day) && typeof day.active === "boolean")
  );
}

function isMinimumNotice(value: unknown): value is { amount: number; unit: string } {
  return (
    isPlainObject(value) &&
    typeof value.amount === "number" &&
    typeof value.unit === "string"
  );
}

function isReimbursementRate(value: unknown): value is { rateCents: number; unit: string } {
  return (
    isPlainObject(value) &&
    typeof value.rateCents === "number" &&
    typeof value.unit === "string"
  );
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function formatCents(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}
