import Link from "next/link";
import { BatchCreateForm } from "@/components/mileage/batch-create-form";
import { MileageNav } from "@/components/mileage/mileage-nav";
import { ReimbursementBatchesTable } from "@/components/mileage/reimbursement-batches-table";
import { PageHeader } from "@/components/layouts/page-header";
import { Button } from "@/components/ui/button";
import { requirePermission } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/auth/permissions";
import { getApprovedMileageForBatch, getReimbursementBatches } from "@/lib/mileage/mileage-queries";

export default async function ReimbursementBatchPage() {
  const membership = await requirePermission("reimbursements:view");
  const [batches, approvedMileage] = await Promise.all([
    getReimbursementBatches(membership.organizationId),
    getApprovedMileageForBatch(membership.organizationId),
  ]);
  const canManage = hasPermission(membership, "reimbursements:manage");
  const drivers = Array.from(new Map(approvedMileage.map((record) => [record.driver.id, record.driver])).values());

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Reimbursement batches"
        description="Group approved mileage into driver-specific reimbursement batches and track payment completion."
        actions={<Button asChild size="sm" variant="outline"><Link href="/reimbursements/export">Export CSV</Link></Button>}
      />
      <MileageNav />
      {canManage ? <BatchCreateForm drivers={drivers} /> : null}
      <ReimbursementBatchesTable batches={batches} canManage={canManage} />
    </div>
  );
}
