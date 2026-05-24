import { markBatchPaidAction } from "@/actions/mileage-actions";
import { EmptyState } from "@/components/layouts/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatMiles } from "@/lib/mileage/mileage-utils";

type Batch = {
  id: string;
  batchNumber: string;
  status: string;
  periodStart: Date;
  periodEnd: Date;
  tripCount: number;
  totalMiles: unknown;
  rateCents: number;
  totalCents: number;
  approvedAt: Date | null;
  paymentStatus: string;
  paidAt: Date | null;
  driver: { displayName: string };
};

export function ReimbursementBatchesTable({ batches, canManage }: Readonly<{ batches: Batch[]; canManage: boolean }>) {
  if (batches.length === 0) {
    return <EmptyState title="No reimbursement batches" description="Approved mileage can be grouped into driver reimbursement batches." />;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Batch</TableHead>
          <TableHead>Driver</TableHead>
          <TableHead>Date range</TableHead>
          <TableHead>Trips</TableHead>
          <TableHead>Miles</TableHead>
          <TableHead>Total</TableHead>
          <TableHead>Payment</TableHead>
          {canManage ? <TableHead>Actions</TableHead> : null}
        </TableRow>
      </TableHeader>
      <TableBody>
        {batches.map((batch) => (
          <TableRow key={batch.id}>
            <TableCell>
              <div className="flex flex-col gap-1">
                <span className="font-medium">{batch.batchNumber}</span>
                <Badge variant={batch.status === "PAID" ? "default" : "secondary"}>{batch.status.toLowerCase()}</Badge>
              </div>
            </TableCell>
            <TableCell>{batch.driver.displayName}</TableCell>
            <TableCell>{batch.periodStart.toLocaleDateString()} - {batch.periodEnd.toLocaleDateString()}</TableCell>
            <TableCell>{batch.tripCount}</TableCell>
            <TableCell>
              <div className="flex flex-col gap-1">
                <span>{formatMiles(batch.totalMiles)}</span>
                <span className="text-xs text-muted-foreground">{formatCurrency(batch.rateCents)} / mi</span>
              </div>
            </TableCell>
            <TableCell>{formatCurrency(batch.totalCents)}</TableCell>
            <TableCell>
              <div className="flex flex-col gap-1">
                <span>{batch.paymentStatus}</span>
                {batch.approvedAt ? <span className="text-xs text-muted-foreground">Approved {batch.approvedAt.toLocaleDateString()}</span> : null}
                {batch.paidAt ? <span className="text-xs text-muted-foreground">Paid {batch.paidAt.toLocaleDateString()}</span> : null}
              </div>
            </TableCell>
            {canManage ? (
              <TableCell>
                {batch.status !== "PAID" ? (
                  <form action={markBatchPaidAction.bind(null, batch.id)} className="flex gap-2">
                    <Input name="paidAt" type="date" className="h-9" />
                    <Button type="submit" size="sm">Mark paid</Button>
                  </form>
                ) : (
                  <span className="text-sm text-muted-foreground">Paid</span>
                )}
              </TableCell>
            ) : null}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
