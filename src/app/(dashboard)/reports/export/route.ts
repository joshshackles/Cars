import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/guards";
import { formatCurrency } from "@/lib/mileage/mileage-utils";
import { getOperationalReport } from "@/lib/reports/report-queries";
import { getDefaultReportFilters } from "@/lib/reports/report-utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const membership = await requirePermission("reports:view");
  const params = Object.fromEntries(new URL(request.url).searchParams.entries());
  const filters = getDefaultReportFilters(params);
  const report = await getOperationalReport(membership.organizationId, filters);

  const rows: unknown[][] = [
    ["section", "metric", "value", "extra"],
    ["summary", "riders_served", report.metrics.ridersServed, ""],
    ["summary", "rides_requested", report.metrics.ridesRequested, ""],
    ["summary", "rides_completed", report.metrics.ridesCompleted, ""],
    ["summary", "trip_legs_completed", report.metrics.tripLegsCompleted, ""],
    ["summary", "unmet_requests", report.metrics.unmetRequests, ""],
    ["summary", "cancellations", report.metrics.cancellations, ""],
    ["summary", "no_shows", report.metrics.noShows, ""],
    ["summary", "miles_driven", report.metrics.milesDriven.toFixed(2), ""],
    ["summary", "volunteer_hours", report.metrics.volunteerHours.toFixed(2), ""],
    ["summary", "active_drivers", report.metrics.activeDrivers, ""],
    ["summary", "reimbursement_total", formatCurrency(report.metrics.reimbursementTotalCents), report.metrics.reimbursementTotalCents],
    ["summary", "recurring_ride_volume", report.metrics.recurringRideVolume, ""],
    ...report.charts.countiesServed.map((row) => ["counties_served", row.label, row.value, ""]),
    ...report.charts.ridePurposes.map((row) => ["ride_purposes", row.label, row.value, ""]),
    ...report.charts.destinationTypes.map((row) => ["destination_types", row.label, row.value, ""]),
    ...report.charts.fundingSourceTotals.map((row) => ["funding_sources", row.label, row.value, ""]),
    ...report.charts.driverActivity.map((row) => ["driver_activity", row.driver, row.completedTrips, `miles=${row.miles.toFixed(2)};hours=${row.hours.toFixed(2)};reimbursement_cents=${row.reimbursementCents}`]),
    ...report.charts.reimbursementBatches.map((row) => ["reimbursement_batches", row.batchNumber, row.totalCents, `driver=${row.driver};miles=${row.totalMiles.toFixed(2)};status=${row.status}`]),
  ];

  return new NextResponse(toCsv(rows), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": 'attachment; filename="cars-operational-report.csv"',
    },
  });
}

function toCsv(rows: unknown[][]) {
  return rows.map((row) => row.map(csvEscape).join(",")).join("\n");
}

function csvEscape(value: unknown) {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}
