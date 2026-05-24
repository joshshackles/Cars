import Link from "next/link";
import {
  cancelRideRequestAction,
  completeRideRequestAction,
  markRideRequestReviewedAction,
} from "@/actions/ride-request-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rideRequests.map((request) => {
          const reviewedAction = markRideRequestReviewedAction.bind(null, request.id);
          const completeAction = completeRideRequestAction.bind(null, request.id);
          const cancelAction = cancelRideRequestAction.bind(null, request.id);
          const isCompleted = request.status === "COMPLETED";
          const isCanceled = request.status === "CANCELED" || request.status === "DENIED";

          return (
            <TableRow key={request.id}>
              <TableCell>
                <div className="flex flex-col gap-1">
                  <span className="font-medium">{request.rider.displayName}</span>
                  <span className="text-xs text-muted-foreground">{request.rider.phone ?? request.rider.email ?? "No contact"}</span>
                </div>
              </TableCell>
              <TableCell>{request.neededAt.toLocaleString()}</TableCell>
              <TableCell><Badge variant="secondary">{formatStatus(request.status)}</Badge></TableCell>
              <TableCell>{request.purpose}</TableCell>
              <TableCell>{request.tripLegs.length}</TableCell>
              <TableCell>{warningCount(request.warnings)}</TableCell>
              <TableCell>{request.fundingSource?.name ?? "Not set"}</TableCell>
              <TableCell>
                <div className="flex min-w-56 flex-wrap gap-2">
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/ride-requests/${request.id}/edit`}>Edit</Link>
                  </Button>
                  {request.status === "PENDING_REVIEW" || request.status === "REQUESTED" ? (
                    <form action={reviewedAction}>
                      <Button type="submit" variant="secondary" size="sm">
                        Reviewed
                      </Button>
                    </form>
                  ) : null}
                  {!isCompleted && !isCanceled ? (
                    <form action={completeAction}>
                      <Button type="submit" size="sm">
                        Mark done
                      </Button>
                    </form>
                  ) : null}
                  {!isCanceled && !isCompleted ? (
                    <form action={cancelAction}>
                      <input type="hidden" name="reason" value="Canceled from request queue." />
                      <Button type="submit" variant="outline" size="sm">
                        Cancel
                      </Button>
                    </form>
                  ) : null}
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

function formatStatus(status: string) {
  return status.toLowerCase().replaceAll("_", " ");
}

function warningCount(value: unknown) {
  return Array.isArray(value) ? `${value.length} warnings` : "0 warnings";
}
