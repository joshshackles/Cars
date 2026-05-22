export type DispatchFilterParams = {
  date?: string;
  county?: string;
  driverId?: string;
  status?: string;
  ridePurpose?: string;
  fundingSourceId?: string;
};

export function getDayRange(dateValue?: string) {
  const date = dateValue ? new Date(`${dateValue}T00:00:00`) : new Date();
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  return { start, end };
}

export function getWeekRange(dateValue?: string) {
  const { start } = getDayRange(dateValue);
  const day = start.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + mondayOffset);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);

  return { start, end };
}

export function formatDateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function isDocumentCurrent(date: Date | null) {
  if (!date) return false;
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - 1);
  return date >= cutoff;
}

export function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}
