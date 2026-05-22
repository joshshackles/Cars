import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/guards";
import { getMileageRecords, type MileageListStatus } from "@/lib/mileage/mileage-queries";
import { formatMiles, toCsv } from "@/lib/mileage/mileage-utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const exportStatuses = ["SUBMITTED", "APPROVED", "REJECTED"] as const;

export async function GET(request: Request) {
  const membership = await requirePermission("mileage:view");
  const url = new URL(request.url);
  const requestedStatus = url.searchParams.get("status");
  const statuses = requestedStatus && isMileageListStatus(requestedStatus) ? [requestedStatus] : exportStatuses;
  const recordGroups = await Promise.all(statuses.map((status) => getMileageRecords(membership.organizationId, status)));
  const records = recordGroups.flat();

  const rows = [
    ["service_date", "driver", "rider", "purpose", "status", "estimated_miles", "submitted_miles", "approved_miles", "rate_cents", "amount_cents", "batch"],
    ...records.map((record) => [
      record.serviceDate.toISOString().slice(0, 10),
      record.driver.displayName,
      record.tripLeg.rideRequest.rider.displayName,
      record.tripLeg.rideRequest.purpose,
      record.status,
      formatMiles(record.estimatedMiles),
      formatMiles(record.submittedMiles),
      formatMiles(record.miles),
      record.rateCents,
      record.amountCents,
      record.reimbursementBatch?.batchNumber ?? "",
    ]),
  ];

  return csvResponse(toCsv(rows), "cars-mileage.csv");
}

function isMileageListStatus(value: string): value is MileageListStatus {
  return exportStatuses.includes(value as MileageListStatus);
}

function csvResponse(body: string, filename: string) {
  return new NextResponse(body, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
    },
  });
}
