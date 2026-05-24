import Link from "next/link";
import { MileageNav } from "@/components/mileage/mileage-nav";
import { ReimbursementBatchesTable } from "@/components/mileage/reimbursement-batches-table";
import { PageHeader } from "@/components/layouts/page-header";
import { Button } from "@/components/ui/button";
import { requirePermission } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/auth/permissions";
import { getReimbursementBatches } from "@/lib/mileage/mileage-queries";

export default async function ReimbursementsPage() {
  const membership = await requirePermission("reimbursements:view");
  const batches = await getReimbursementBatches(membership.organizationId);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Reimbursements"
        description="Track driver reimbursement batches, approval totals, payment status, and paid dates."
        actions={<Button asChild size="sm" variant="outline"><Link href="/reimbursements/export">Export CSV</Link></Button>}
      />
      <MileageNav />
      <ReimbursementBatchesTable batches={batches} canManage={hasPermission(membership, "reimbursements:manage")} />
    </div>
  );
}
