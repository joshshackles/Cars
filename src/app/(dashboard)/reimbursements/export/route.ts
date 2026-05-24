import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/guards";
import { getDriverReimbursementSummaries, getReimbursementBatches } from "@/lib/mileage/mileage-queries";
import { formatMiles, toCsv } from "@/lib/mileage/mileage-utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const membership = await requirePermission("reimbursements:view");
  const url = new URL(request.url);

  if (url.searchParams.get("type") === "drivers") {
    const summaries = await getDriverReimbursementSummaries(membership.organizationId);
    const rows = [
      ["driver", "pending_count", "approved_trip_count", "approved_miles", "approved_cents", "paid_cents", "latest_batch"],
      ...summaries.map((summary) => [
        summary.driver.displayName,
        summary.pendingCount,
        summary.tripCount,
        formatMiles(summary.approvedMiles),
        summary.approvedCents,
        summary.paidCents,
        summary.latestBatch?.batchNumber ?? "",
      ]),
    ];

    return csvResponse(toCsv(rows), "cars-driver-reimbursement-summary.csv");
  }

  const batches = await getReimbursementBatches(membership.organizationId);
  const rows = [
    ["batch_number", "driver", "status", "period_start", "period_end", "trip_count", "approved_miles", "rate_cents", "total_cents", "approved_at", "payment_status", "paid_at"],
    ...batches.map((batch) => [
      batch.batchNumber,
      batch.driver.displayName,
      batch.status,
      batch.periodStart.toISOString().slice(0, 10),
      batch.periodEnd.toISOString().slice(0, 10),
      batch.tripCount,
      formatMiles(batch.totalMiles),
      batch.rateCents,
      batch.totalCents,
      batch.approvedAt?.toISOString() ?? "",
      batch.paymentStatus,
      batch.paidAt?.toISOString() ?? "",
    ]),
  ];

  return csvResponse(toCsv(rows), "cars-reimbursement-batches.csv");
}

function csvResponse(body: string, filename: string) {
  return new NextResponse(body, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
    },
  });
}
