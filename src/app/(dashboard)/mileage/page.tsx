import Link from "next/link";
import { MileageNav } from "@/components/mileage/mileage-nav";
import { PageHeader } from "@/components/layouts/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermission } from "@/lib/auth/guards";
import { getMileageSummary } from "@/lib/mileage/mileage-queries";

export default async function MileagePage() {
  const membership = await requirePermission("mileage:view");
  const summary = await getMileageSummary(membership.organizationId);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Mileage"
        description="Review submitted mileage, approve reimbursements, adjust records with reasons, and export finance ledgers."
        actions={<Button asChild size="sm" variant="outline"><Link href="/mileage/export">Export CSV</Link></Button>}
      />
      <MileageNav />
      <div className="grid gap-4 md:grid-cols-4">
        <SummaryCard title="Pending" value={summary.pending} href="/mileage/pending" />
        <SummaryCard title="Approved" value={summary.approved} href="/mileage/approved" />
        <SummaryCard title="Rejected" value={summary.rejected} href="/mileage/rejected" />
        <SummaryCard title="Batched" value={summary.batched} href="/reimbursements/batches" />
      </div>
    </div>
  );
}

function SummaryCard({ title, value, href }: Readonly<{ title: string; value: number; href: string }>) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex items-end justify-between">
        <span className="text-3xl font-semibold">{value}</span>
        <Button asChild size="sm" variant="outline"><Link href={href}>Open</Link></Button>
      </CardContent>
    </Card>
  );
}
