import Link from "next/link";
import { DriverReimbursementSummaryTable } from "@/components/mileage/driver-reimbursement-summary-table";
import { MileageNav } from "@/components/mileage/mileage-nav";
import { PageHeader } from "@/components/layouts/page-header";
import { Button } from "@/components/ui/button";
import { requirePermission } from "@/lib/auth/guards";
import { getDriverReimbursementSummaries } from "@/lib/mileage/mileage-queries";

export default async function DriverReimbursementSummaryPage() {
  const membership = await requirePermission("reimbursements:view");
  const summaries = await getDriverReimbursementSummaries(membership.organizationId);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Driver reimbursement summary"
        description="Driver-level reimbursement totals, pending counts, paid totals, and latest batch status."
        actions={<Button asChild size="sm" variant="outline"><Link href="/reimbursements/export?type=drivers">Export CSV</Link></Button>}
      />
      <MileageNav />
      <DriverReimbursementSummaryTable summaries={summaries} />
    </div>
  );
}
