import { createDriverAvailabilityAction } from "@/actions/driver-actions";
import { EmptyState } from "@/components/layouts/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import type { SettingOption } from "@/types/settings";

type DriverProfile = {
  id: string;
  displayName: string;
  phone: string | null;
  email: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  countiesServed: unknown;
  preferredRideTypes: unknown;
  vehicleLabel: string | null;
  licenseVerificationDate: Date | null;
  insuranceVerificationDate: Date | null;
  backgroundCheckStatus: string | null;
  onboardingStatus: string | null;
  reimbursementPreference: string | null;
  status: string;
  driverNotes: string | null;
  assignments: Array<{
    id: string;
    status: string;
    offeredAt: Date;
    tripLeg: { status: string; scheduledPickupAt: Date; completedAt: Date | null; rideRequest: { purpose: string; rider: { displayName: string } } };
  }>;
  mileageRecords: Array<{ id: string; serviceDate: Date; miles: unknown; amountCents: number; status: string; reimbursementBatch: { batchNumber: string; status: string } | null }>;
  incidents: Array<{ id: string; summary: string; severity: string; status: string; occurredAt: Date }>;
  documents: Array<{ id: string; title: string; type: string; createdAt: Date }>;
  availabilities: Array<{ id: string; availabilityType: string; status: string; startsAt: Date; endsAt: Date; recurrenceRule: string | null; blackoutDate: Date | null; preferredCounties: unknown; maxDistanceMiles: number | null; notes: string | null }>;
};

export function DriverOverview({ driver, labels }: Readonly<{ driver: DriverProfile; labels: Record<string, Map<string, string>> }>) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Contact, service area, vehicle, verification, and preferences.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Info label="Phone" value={driver.phone} />
          <Info label="Email" value={driver.email} />
          <Info label="Address" value={[driver.addressLine1, driver.addressLine2, [driver.city, driver.state, driver.postalCode].filter(Boolean).join(" ")].filter(Boolean).join(", ")} />
          <Info label="Counties served" value={formatOptions(driver.countiesServed, labels.counties)} />
          <Info label="Preferred ride types" value={formatOptions(driver.preferredRideTypes, labels.rideTypes)} />
          <Info label="Vehicle" value={driver.vehicleLabel} />
          <Info label="License verified" value={driver.licenseVerificationDate?.toLocaleDateString()} />
          <Info label="Insurance verified" value={driver.insuranceVerificationDate?.toLocaleDateString()} />
          <Info label="Background check" value={labels.background.get(driver.backgroundCheckStatus ?? "") ?? driver.backgroundCheckStatus} />
          <Info label="Reimbursement" value={labels.reimbursement.get(driver.reimbursementPreference ?? "") ?? driver.reimbursementPreference} />
          <Info label="Driver notes" value={driver.driverNotes} wide />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Status</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Badge variant="secondary">{labels.statuses.get(driver.status) ?? driver.status}</Badge>
          <p className="text-sm text-muted-foreground">{labels.onboarding.get(driver.onboardingStatus ?? "") ?? driver.onboardingStatus ?? "No onboarding status"}</p>
        </CardContent>
      </Card>
    </div>
  );
}

export function DriverTrips({ driver }: Readonly<{ driver: DriverProfile }>) {
  const assigned = driver.assignments.filter((item) => item.tripLeg.status !== "COMPLETED");
  const completed = driver.assignments.filter((item) => item.tripLeg.status === "COMPLETED");
  return <div className="grid gap-4 xl:grid-cols-2"><TripTable title="Assigned trips" assignments={assigned} /><TripTable title="Completed trips" assignments={completed} /></div>;
}

export function DriverMileageAndReimbursements({ driver }: Readonly<{ driver: DriverProfile }>) {
  return (
    <Card>
      <CardHeader><CardTitle>Mileage and reimbursements</CardTitle></CardHeader>
      <CardContent>
        {driver.mileageRecords.length > 0 ? (
          <Table>
            <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Miles</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead><TableHead>Batch</TableHead></TableRow></TableHeader>
            <TableBody>{driver.mileageRecords.map((record) => <TableRow key={record.id}><TableCell>{record.serviceDate.toLocaleDateString()}</TableCell><TableCell>{String(record.miles)}</TableCell><TableCell>${(record.amountCents / 100).toFixed(2)}</TableCell><TableCell>{record.status}</TableCell><TableCell>{record.reimbursementBatch?.batchNumber ?? "Unbatched"}</TableCell></TableRow>)}</TableBody>
          </Table>
        ) : <EmptyState title="No mileage history" description="Mileage records will appear after completed trips are submitted." />}
      </CardContent>
    </Card>
  );
}

export function DriverRelatedActivity({ driver }: Readonly<{ driver: DriverProfile }>) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <ListCard title="Incidents" empty="No incidents" items={driver.incidents} render={(item) => `${item.summary} - ${item.severity} - ${item.status}`} />
      <ListCard title="Documents" empty="No documents" items={driver.documents} render={(item) => `${item.title} - ${item.type}`} />
    </div>
  );
}

export function DriverAvailabilityPanel({ driver, counties, canManage }: Readonly<{ driver: DriverProfile; counties: SettingOption[]; canManage: boolean }>) {
  return (
    <Card>
      <CardHeader><CardTitle>Availability</CardTitle><CardDescription>One-time, recurring, and blackout availability.</CardDescription></CardHeader>
      <CardContent className="flex flex-col gap-4">
        {canManage ? <AvailabilityForm driverId={driver.id} counties={counties} /> : null}
        {driver.availabilities.length > 0 ? (
          <Table>
            <TableHeader><TableRow><TableHead>Type</TableHead><TableHead>Status</TableHead><TableHead>Window</TableHead><TableHead>Counties</TableHead><TableHead>Max distance</TableHead></TableRow></TableHeader>
            <TableBody>{driver.availabilities.map((item) => <TableRow key={item.id}><TableCell>{item.availabilityType}</TableCell><TableCell>{item.status}</TableCell><TableCell>{item.startsAt.toLocaleString()} - {item.endsAt.toLocaleString()}</TableCell><TableCell>{formatOptions(item.preferredCounties, new Map(counties.map((county) => [county.code, county.label])))}</TableCell><TableCell>{item.maxDistanceMiles ? `${item.maxDistanceMiles} mi` : "Not set"}</TableCell></TableRow>)}</TableBody>
          </Table>
        ) : <EmptyState title="No availability" description="Availability records will appear here when added." />}
      </CardContent>
    </Card>
  );
}

function AvailabilityForm({ driverId, counties }: Readonly<{ driverId: string; counties: SettingOption[] }>) {
  return (
    <form action={createDriverAvailabilityAction.bind(null, driverId)} className="grid gap-3 rounded-lg border p-4 md:grid-cols-3">
      <select name="availabilityType" className="h-10 rounded-md border bg-background px-3 text-sm"><option value="one_time">One-time</option><option value="recurring">Recurring</option><option value="blackout">Blackout</option></select>
      <select name="status" className="h-10 rounded-md border bg-background px-3 text-sm"><option value="AVAILABLE">Available</option><option value="TENTATIVE">Tentative</option><option value="UNAVAILABLE">Unavailable</option></select>
      <Input name="startsAt" type="datetime-local" required />
      <Input name="endsAt" type="datetime-local" required />
      <Input name="recurrenceRule" placeholder="RRULE for recurring availability" />
      <Input name="blackoutDate" type="date" />
      <Input name="maxDistanceMiles" type="number" placeholder="Max distance" />
      <fieldset className="flex flex-col gap-2 md:col-span-2">
        <legend className="text-sm font-medium">Preferred counties</legend>
        <div className="grid gap-2 md:grid-cols-2">{counties.map((county) => <label key={county.code} className="flex items-center gap-2 text-sm"><input type="checkbox" name="preferredCounties" value={county.code} />{county.label}</label>)}</div>
      </fieldset>
      <Textarea name="notes" placeholder="Availability notes" className="md:col-span-3" />
      <div className="md:col-span-3"><Button type="submit" size="sm">Add availability</Button></div>
    </form>
  );
}

function TripTable({ title, assignments }: Readonly<{ title: string; assignments: DriverProfile["assignments"] }>) {
  return <Card><CardHeader><CardTitle>{title}</CardTitle></CardHeader><CardContent>{assignments.length > 0 ? <Table><TableHeader><TableRow><TableHead>Pickup</TableHead><TableHead>Rider</TableHead><TableHead>Purpose</TableHead><TableHead>Status</TableHead></TableRow></TableHeader><TableBody>{assignments.map((assignment) => <TableRow key={assignment.id}><TableCell>{assignment.tripLeg.scheduledPickupAt.toLocaleString()}</TableCell><TableCell>{assignment.tripLeg.rideRequest.rider.displayName}</TableCell><TableCell>{assignment.tripLeg.rideRequest.purpose}</TableCell><TableCell>{assignment.status}</TableCell></TableRow>)}</TableBody></Table> : <EmptyState title={`No ${title.toLowerCase()}`} description="Trip assignments will appear here." />}</CardContent></Card>;
}

function ListCard<T>({ title, empty, items, render }: Readonly<{ title: string; empty: string; items: T[]; render: (item: T) => string }>) {
  return <Card><CardHeader><CardTitle>{title}</CardTitle></CardHeader><CardContent>{items.length > 0 ? <div className="flex flex-col gap-2">{items.map((item, index) => <div key={index} className="rounded-md border p-3 text-sm">{render(item)}</div>)}</div> : <EmptyState title={empty} description={`${title} will appear here when records are added.`} />}</CardContent></Card>;
}

function Info({ label, value, wide }: Readonly<{ label: string; value?: string | null; wide?: boolean }>) {
  return <div className={wide ? "md:col-span-2" : undefined}><dt className="text-xs font-medium text-muted-foreground">{label}</dt><dd className="mt-1 text-sm">{value || "Not set"}</dd></div>;
}

function formatOptions(value: unknown, labels: Map<string, string>) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string").map((code) => labels.get(code) ?? code).join(", ") : "";
}
