import { formatDateInput } from "@/lib/dispatch/dispatch-utils";

export type ReportFilters = {
  startDate: string;
  endDate: string;
  county?: string;
  ridePurpose?: string;
  fundingSourceId?: string;
  driverId?: string;
  riderStatus?: string;
  destinationType?: string;
};

export function getDefaultReportFilters(params: Record<string, string | string[] | undefined>): ReportFilters {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);

  return {
    startDate: getParam(params.startDate) ?? formatDateInput(start),
    endDate: getParam(params.endDate) ?? formatDateInput(now),
    county: blankToUndefined(getParam(params.county)),
    ridePurpose: blankToUndefined(getParam(params.ridePurpose)),
    fundingSourceId: blankToUndefined(getParam(params.fundingSourceId)),
    driverId: blankToUndefined(getParam(params.driverId)),
    riderStatus: blankToUndefined(getParam(params.riderStatus)),
    destinationType: blankToUndefined(getParam(params.destinationType)),
  };
}

export function getReportRange(filters: Pick<ReportFilters, "startDate" | "endDate">) {
  const start = new Date(`${filters.startDate}T00:00:00`);
  const end = new Date(`${filters.endDate}T00:00:00`);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

export function addToMap(map: Map<string, number>, key: string | null | undefined, amount = 1) {
  const label = key || "Unspecified";
  map.set(label, (map.get(label) ?? 0) + amount);
}

export function mapToRows(map: Map<string, number>) {
  return Array.from(map.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));
}

export function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}

function getParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function blankToUndefined(value: string | undefined) {
  return value && value.trim() ? value : undefined;
}
