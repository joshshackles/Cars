import { IncidentSeverity } from "@prisma/client";
import { createIncidentAction } from "@/actions/incident-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type IncidentOptions = {
  riders: Array<{ id: string; displayName: string }>;
  drivers: Array<{ id: string; displayName: string }>;
  tripLegs: Array<{
    id: string;
    scheduledPickupAt: Date;
    rideRequest: {
      rider: {
        displayName: string;
      };
    };
  }>;
};

export function IncidentCreateForm({ options }: Readonly<{ options: IncidentOptions }>) {
  return (
    <form action={createIncidentAction} className="grid gap-4">
      <div className="grid gap-3 md:grid-cols-[1fr_12rem]">
        <Input name="summary" placeholder="Incident summary" required />
        <select name="severity" defaultValue={IncidentSeverity.LOW} className="h-10 rounded-md border bg-background px-3 text-sm">
          {Object.values(IncidentSeverity).map((severity) => (
            <option key={severity} value={severity}>
              {formatLabel(severity)}
            </option>
          ))}
        </select>
      </div>
      <Textarea name="details" placeholder="Details, follow-up notes, or dispatch context" />
      <div className="grid gap-3 md:grid-cols-3">
        <select name="riderId" className="h-10 rounded-md border bg-background px-3 text-sm">
          <option value="">No rider link</option>
          {options.riders.map((rider) => (
            <option key={rider.id} value={rider.id}>
              {rider.displayName}
            </option>
          ))}
        </select>
        <select name="driverId" className="h-10 rounded-md border bg-background px-3 text-sm">
          <option value="">No driver link</option>
          {options.drivers.map((driver) => (
            <option key={driver.id} value={driver.id}>
              {driver.displayName}
            </option>
          ))}
        </select>
        <select name="tripLegId" className="h-10 rounded-md border bg-background px-3 text-sm">
          <option value="">No trip link</option>
          {options.tripLegs.map((trip) => (
            <option key={trip.id} value={trip.id}>
              {formatDateTime(trip.scheduledPickupAt)} - {trip.rideRequest.rider.displayName}
            </option>
          ))}
        </select>
      </div>
      <Button type="submit" className="w-fit">Create incident</Button>
    </form>
  );
}

function formatLabel(value: string) {
  return value.toLowerCase().replaceAll("_", " ").replace(/^\w/, (letter) => letter.toUpperCase());
}

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(value);
}
