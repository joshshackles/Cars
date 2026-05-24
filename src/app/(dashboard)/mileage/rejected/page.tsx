import Link from "next/link";
import { PageHeader } from "@/components/layouts/page-header";
import { MileageNav } from "@/components/mileage/mileage-nav";
import { MileageRecordsTable } from "@/components/mileage/mileage-records-table";
import { Button } from "@/components/ui/button";
import { requirePermission } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/auth/permissions";
import { getMileageRecords } from "@/lib/mileage/mileage-queries";

export default async function RejectedMileagePage() {
  const membership = await requirePermission("mileage:view");
  const records = await getMileageRecords(membership.organizationId, "REJECTED");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Rejected mileage"
        description="Mileage records rejected during finance review, retained for audit."
        actions={<Button asChild size="sm" variant="outline"><Link href="/mileage/export?status=REJECTED">Export CSV</Link></Button>}
      />
      <MileageNav />
      <MileageRecordsTable records={records} canManage={hasPermission(membership, "mileage:manage")} mode="rejected" />
    </div>
  );
}
