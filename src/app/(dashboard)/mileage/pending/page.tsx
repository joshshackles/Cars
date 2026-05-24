import Link from "next/link";
import { PageHeader } from "@/components/layouts/page-header";
import { MileageNav } from "@/components/mileage/mileage-nav";
import { MileageRecordsTable } from "@/components/mileage/mileage-records-table";
import { Button } from "@/components/ui/button";
import { requirePermission } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/auth/permissions";
import { getMileageRecords } from "@/lib/mileage/mileage-queries";

export default async function PendingMileagePage() {
  const membership = await requirePermission("mileage:view");
  const records = await getMileageRecords(membership.organizationId, "SUBMITTED");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Pending mileage"
        description="Submitted driver mileage awaiting finance review."
        actions={<Button asChild size="sm" variant="outline"><Link href="/mileage/export?status=SUBMITTED">Export CSV</Link></Button>}
      />
      <MileageNav />
      <MileageRecordsTable records={records} canManage={hasPermission(membership, "mileage:manage")} mode="pending" />
    </div>
  );
}
