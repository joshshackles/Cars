import {
  addDispatchNoteAction,
  assignDriverAction,
  cancelRideAction,
  completeRideAction,
  confirmRideAction,
  markNoShowAction,
} from "@/actions/dispatch-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

type Suitability = {
  driver: { id: string; displayName: string };
  availability: boolean;
  countyCompatible: boolean;
  documentsValid: boolean;
  conflicts: number;
  warnings: string[];
};

type Trip = {
  id: string;
  status: string;
  scheduledPickupAt: Date;
  pickupCity: string | null;
  pickupCounty: string | null;
  dropoffCity: string | null;
  dropoffCounty: string | null;
  notes: string | null;
  rideRequest: {
    purpose: string;
    rider: { displayName: string; phone: string | null };
    fundingSource: { name: string } | null;
  };
  assignment: {
    id: string;
    driver: { id: string; displayName: string };
  } | null;
};

export function DispatchBoard({
  trips,
  suitabilityByTrip,
  canManage,
  canOverride,
}: Readonly<{
  trips: Trip[];
  suitabilityByTrip: Record<string, Suitability[]>;
  canManage: boolean;
  canOverride: boolean;
}>) {
  return (
    <div className="grid gap-4">
      {trips.map((trip) => (
        <Card key={trip.id}>
          <CardHeader>
            <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <CardTitle>{trip.rideRequest.rider.displayName}</CardTitle>
                <CardDescription>
                  {trip.scheduledPickupAt.toLocaleString()} - {trip.pickupCity ?? "Pickup"} to {trip.dropoffCity ?? "Dropoff"}
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">{trip.status.toLowerCase()}</Badge>
                <Badge variant="outline">{trip.rideRequest.purpose}</Badge>
                {trip.assignment ? <Badge>{trip.assignment.driver.displayName}</Badge> : <Badge variant="destructive">Unassigned</Badge>}
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4">
            <DriverSuitabilityTable tripId={trip.id} suitability={suitabilityByTrip[trip.id] ?? []} canManage={canManage} canOverride={canOverride} currentDriverId={trip.assignment?.driver.id} />
            {canManage ? <DispatchControls tripId={trip.id} /> : null}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function DriverSuitabilityTable({ tripId, suitability, canManage, canOverride, currentDriverId }: Readonly<{ tripId: string; suitability: Suitability[]; canManage: boolean; canOverride: boolean; currentDriverId?: string }>) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Driver</TableHead>
          <TableHead>Availability</TableHead>
          <TableHead>County</TableHead>
          <TableHead>Documents</TableHead>
          <TableHead>Conflicts</TableHead>
          <TableHead>Override</TableHead>
          <TableHead className="text-right">Assign</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {suitability.map((item) => {
          const needsOverride = item.warnings.length > 0;
          return (
            <TableRow key={item.driver.id}>
              <TableCell className="font-medium">{item.driver.displayName}</TableCell>
              <TableCell>{item.availability ? "Available" : "No match"}</TableCell>
              <TableCell>{item.countyCompatible ? "Compatible" : "Mismatch"}</TableCell>
              <TableCell>{item.documentsValid ? "Valid" : "Review"}</TableCell>
              <TableCell>{item.conflicts}</TableCell>
              <TableCell>{needsOverride ? item.warnings.join(", ") : "Not needed"}</TableCell>
              <TableCell className="text-right">
                {canManage ? (
                  <form action={assignDriverAction.bind(null, tripId)} className="flex justify-end gap-2">
                    <input type="hidden" name="driverId" value={item.driver.id} />
                    {needsOverride && canOverride ? <Input name="overrideReason" placeholder="Override reason" className="w-44" /> : null}
                    <Button size="sm" variant={currentDriverId === item.driver.id ? "secondary" : "outline"} disabled={needsOverride && !canOverride}>
                      {currentDriverId ? "Reassign" : "Assign"}
                    </Button>
                  </form>
                ) : null}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

function DispatchControls({ tripId }: Readonly<{ tripId: string }>) {
  return (
    <div className="grid gap-3 rounded-lg border bg-muted/30 p-3 lg:grid-cols-5">
      <form action={confirmRideAction.bind(null, tripId)}><Button type="submit" variant="outline" size="sm">Confirm</Button></form>
      <form action={completeRideAction.bind(null, tripId)}><Button type="submit" variant="outline" size="sm">Complete</Button></form>
      <form action={cancelRideAction.bind(null, tripId)} className="flex gap-2"><Input name="reason" placeholder="Cancel reason" /><Button type="submit" variant="outline" size="sm">Cancel</Button></form>
      <form action={markNoShowAction.bind(null, tripId)} className="flex gap-2"><Input name="reason" placeholder="No-show reason" /><Button type="submit" variant="outline" size="sm">No-show</Button></form>
      <form action={addDispatchNoteAction.bind(null, tripId)} className="flex gap-2"><Textarea name="note" placeholder="Add note" className="min-h-10" /><Button type="submit" variant="outline" size="sm">Add</Button></form>
    </div>
  );
}
