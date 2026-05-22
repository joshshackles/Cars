import Link from "next/link";
import { EmptyState } from "@/components/layouts/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatMiles } from "@/lib/mileage/mileage-utils";

type DriverSummary = {
  driver: { id: string; displayName: string; reimbursementPreference: string | null };
  tripCount: number;
  pendingCount: number;
  approvedMiles: number;
  approvedCents: number;
  paidCents: number;
  latestBatch: { batchNumber: string; status: string } | null;
};

export function DriverReimbursementSummaryTable({ summaries }: Readonly<{ summaries: DriverSummary[] }>) {
  if (summaries.length === 0) {
    return <EmptyState title="No driver reimbursement summaries" description="Driver reimbursement totals will appear when mileage is submitted." />;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Driver</TableHead>
          <TableHead>Pending</TableHead>
          <TableHead>Approved trips</TableHead>
          <TableHead>Approved miles</TableHead>
          <TableHead>Approved amount</TableHead>
          <TableHead>Paid</TableHead>
          <TableHead>Latest batch</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {summaries.map((summary) => (
          <TableRow key={summary.driver.id}>
            <TableCell>
              <Link className="font-medium underline-offset-4 hover:underline" href={`/drivers/${summary.driver.id}`}>
                {summary.driver.displayName}
              </Link>
              <div className="text-xs text-muted-foreground">{summary.driver.reimbursementPreference ?? "No preference"}</div>
            </TableCell>
            <TableCell>{summary.pendingCount}</TableCell>
            <TableCell>{summary.tripCount}</TableCell>
            <TableCell>{formatMiles(summary.approvedMiles)}</TableCell>
            <TableCell>{formatCurrency(summary.approvedCents)}</TableCell>
            <TableCell>{formatCurrency(summary.paidCents)}</TableCell>
            <TableCell>{summary.latestBatch ? `${summary.latestBatch.batchNumber} (${summary.latestBatch.status.toLowerCase()})` : "None"}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
