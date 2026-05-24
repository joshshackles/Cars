import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type RideRequestRow = {
  id: string;
  status: string;
  purpose: string;
  requestSource: string | null;
  neededAt: Date;
  warnings: unknown;
  rider: { displayName: string; phone: string | null; email: string | null };
  fundingSource: { name: string } | null;
  tripLegs: Array<{ id: string; sequence: number; pickupCity: string | null; dropoffCity: string | null }>;
};

export function RideRequestsTable({ rideRequests }: Readonly<{ rideRequests: RideRequestRow[] }>) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Rider</TableHead>
          <TableHead>Appointment</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Purpose</TableHead>
          <TableHead>Legs</TableHead>
          <TableHead>Warnings</TableHead>
          <TableHead>Funding</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rideRequests.map((request) => (
          <TableRow key={request.id}>
            <TableCell>
              <div className="flex flex-col gap-1">
                <span className="font-medium">{request.rider.displayName}</span>
                <span className="text-xs text-muted-foreground">{request.rider.phone ?? request.rider.email ?? "No contact"}</span>
              </div>
            </TableCell>
            <TableCell>{request.neededAt.toLocaleString()}</TableCell>
            <TableCell><Badge variant="secondary">{request.status.toLowerCase()}</Badge></TableCell>
            <TableCell>{request.purpose}</TableCell>
            <TableCell>{request.tripLegs.length}</TableCell>
            <TableCell>{warningCount(request.warnings)}</TableCell>
            <TableCell>{request.fundingSource?.name ?? "Not set"}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function warningCount(value: unknown) {
  return Array.isArray(value) ? `${value.length} warnings` : "0 warnings";
}
