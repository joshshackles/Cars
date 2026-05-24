import Link from "next/link";
import { approveMileageAction, adjustMileageAction, rejectMileageAction } from "@/actions/mileage-actions";
import { EmptyState } from "@/components/layouts/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency, formatMiles } from "@/lib/mileage/mileage-utils";

type MileageRecord = {
  id: string;
  status: string;
  serviceDate: Date;
  estimatedMiles: unknown;
  submittedMiles: unknown;
  miles: unknown;
  rateCents: number;
  amountCents: number;
  rejectionReason: string | null;
  adjustmentReason: string | null;
  driver: { id: string; displayName: string };
  tripLeg: {
    scheduledPickupAt: Date;
    pickupCity: string | null;
    dropoffCity: string | null;
    rideRequest: {
      purpose: string;
      rider: { displayName: string };
    };
  };
  reimbursementBatch: { batchNumber: string; status: string } | null;
};

export function MileageRecordsTable({
  records,
  canManage,
  mode,
}: Readonly<{
  records: MileageRecord[];
  canManage: boolean;
  mode: "pending" | "approved" | "rejected";
}>) {
  if (records.length === 0) {
    return <EmptyState title={`No ${mode} mileage`} description="Mileage records will appear here as drivers submit completed trips." />;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Trip</TableHead>
          <TableHead>Driver</TableHead>
          <TableHead>Miles</TableHead>
          <TableHead>Rate</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Status</TableHead>
          {canManage ? <TableHead className="min-w-72">Finance actions</TableHead> : null}
        </TableRow>
      </TableHeader>
      <TableBody>
        {records.map((record) => (
          <TableRow key={record.id}>
            <TableCell>
              <div className="flex flex-col gap-1">
                <span className="font-medium">{record.serviceDate.toLocaleDateString()}</span>
                <span className="text-muted-foreground">
                  {record.tripLeg.rideRequest.rider.displayName} - {record.tripLeg.pickupCity ?? "Pickup"} to {record.tripLeg.dropoffCity ?? "Dropoff"}
                </span>
                <span className="text-xs text-muted-foreground">{record.tripLeg.rideRequest.purpose}</span>
              </div>
            </TableCell>
            <TableCell>
              <Link className="font-medium underline-offset-4 hover:underline" href={`/drivers/${record.driver.id}`}>
                {record.driver.displayName}
              </Link>
            </TableCell>
            <TableCell>
              <div className="flex flex-col gap-1">
                <span>Approved: {formatMiles(record.miles)}</span>
                <span className="text-xs text-muted-foreground">Submitted: {formatMiles(record.submittedMiles)}</span>
                <span className="text-xs text-muted-foreground">Estimated: {formatMiles(record.estimatedMiles)}</span>
              </div>
            </TableCell>
            <TableCell>{formatCurrency(record.rateCents)} / mi</TableCell>
            <TableCell>{formatCurrency(record.amountCents)}</TableCell>
            <TableCell>
              <div className="flex flex-col gap-2">
                <Badge variant={record.status === "REJECTED" ? "destructive" : "secondary"}>{record.status.toLowerCase()}</Badge>
                {record.reimbursementBatch ? <span className="text-xs text-muted-foreground">{record.reimbursementBatch.batchNumber}</span> : null}
                {record.rejectionReason ? <span className="text-xs text-muted-foreground">Rejected: {record.rejectionReason}</span> : null}
                {record.adjustmentReason ? <span className="text-xs text-muted-foreground">Adjusted: {record.adjustmentReason}</span> : null}
              </div>
            </TableCell>
            {canManage ? <TableCell>{renderActions(record, mode)}</TableCell> : null}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function renderActions(record: MileageRecord, mode: "pending" | "approved" | "rejected") {
  if (mode === "pending") {
    return (
      <div className="flex flex-col gap-2">
        <form action={approveMileageAction.bind(null, record.id)}>
          <Button type="submit" size="sm">Approve</Button>
        </form>
        <form action={rejectMileageAction.bind(null, record.id)} className="flex gap-2">
          <Input name="reason" placeholder="Reject reason" className="h-9" />
          <Button type="submit" size="sm" variant="destructive">Reject</Button>
        </form>
        <form action={adjustMileageAction.bind(null, record.id)} className="grid gap-2 sm:grid-cols-[90px_1fr_auto]">
          <Input name="miles" type="number" min="0" step="0.1" defaultValue={formatMiles(record.miles)} className="h-9" />
          <Input name="reason" placeholder="Required adjustment reason" className="h-9" />
          <Button type="submit" size="sm" variant="outline">Adjust</Button>
        </form>
      </div>
    );
  }

  if (mode === "approved") {
    return (
      <form action={adjustMileageAction.bind(null, record.id)} className="grid gap-2">
        <Input name="miles" type="number" min="0" step="0.1" defaultValue={formatMiles(record.miles)} className="h-9" />
        <Textarea name="reason" placeholder="Required adjustment reason" className="min-h-20" />
        <Button type="submit" size="sm" variant="outline">Adjust approved miles</Button>
      </form>
    );
  }

  return <span className="text-sm text-muted-foreground">Rejected records are retained for audit review.</span>;
}
