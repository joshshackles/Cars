import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/layouts/empty-state";
import type { ReactNode } from "react";

type RiderProfile = {
  id: string;
  displayName: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  county: string | null;
  state: string | null;
  postalCode: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  communicationPreference: string | null;
  status: string;
  mobilityNotes: string | null;
  riderNotes: string | null;
  sensitiveNotes: string | null;
  eligibilityConfirmed: boolean;
  intakeDate: Date | null;
  pickupInstructions: string | null;
  rideRequests: Array<{
    id: string;
    status: string;
    purpose: string;
    neededAt: Date;
    tripLegs: Array<{
      id: string;
      status: string;
      scheduledPickupAt: Date;
      scheduledDropoffAt: Date | null;
      assignment: {
        driver: {
          displayName: string;
        };
      } | null;
    }>;
  }>;
  communicationLogs: Array<{
    id: string;
    type: string;
    subject: string | null;
    body: string;
    occurredAt: Date;
  }>;
  incidents: Array<{
    id: string;
    severity: string;
    status: string;
    summary: string;
    occurredAt: Date;
  }>;
  documents: Array<{
    id: string;
    type: string;
    title: string;
    createdAt: Date;
  }>;
  statusHistories: Array<{
    id: string;
    oldStatus: string | null;
    newStatus: string;
    changedAt: Date;
    note: string | null;
  }>;
};

export function RiderOverview({
  rider,
  canViewSensitiveNotes,
  statusLabel,
  countyLabel,
}: Readonly<{
  rider: RiderProfile;
  canViewSensitiveNotes: boolean;
  statusLabel: string;
  countyLabel: string;
}>) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Contact, address, eligibility, and service notes.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Info label="Phone" value={rider.phone} />
          <Info label="Email" value={rider.email} />
          <Info label="Address" value={formatAddress(rider)} />
          <Info label="County" value={countyLabel} />
          <Info label="Emergency contact" value={formatPair(rider.emergencyContactName, rider.emergencyContactPhone)} />
          <Info label="Communication preference" value={rider.communicationPreference} />
          <Info label="Intake date" value={rider.intakeDate?.toLocaleDateString()} />
          <Info label="Eligibility" value={rider.eligibilityConfirmed ? "Confirmed" : "Needs review"} />
          <Info label="Mobility needs" value={rider.mobilityNotes} wide />
          <Info label="Pickup instructions" value={rider.pickupInstructions} wide />
          <Info label="Rider notes" value={rider.riderNotes} wide />
          {canViewSensitiveNotes ? <Info label="Sensitive notes" value={rider.sensitiveNotes} wide /> : null}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Status</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Badge variant="secondary">{statusLabel}</Badge>
          <p className="text-sm text-muted-foreground">
            Sensitive notes are only displayed to staff with rider-sensitive permission.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export function RiderRides({ rider }: Readonly<{ rider: RiderProfile }>) {
  const now = new Date();
  const upcoming = rider.rideRequests.filter((ride) => ride.neededAt >= now);
  const past = rider.rideRequests.filter((ride) => ride.neededAt < now);

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <RideTable title="Upcoming rides" rides={upcoming} />
      <RideTable title="Past rides" rides={past} />
    </div>
  );
}

export function RiderRelatedActivity({ rider }: Readonly<{ rider: RiderProfile }>) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <SimpleActivityCard
        title="Communication history"
        emptyTitle="No communication logged"
        items={rider.communicationLogs}
        render={(item) => (
          <>
            <span className="font-medium">{item.subject ?? item.type}</span>
            <span className="text-xs text-muted-foreground">{item.occurredAt.toLocaleString()}</span>
            <span className="text-sm text-muted-foreground">{item.body}</span>
          </>
        )}
      />
      <SimpleActivityCard
        title="Incidents"
        emptyTitle="No incidents"
        items={rider.incidents}
        render={(item) => (
          <>
            <span className="font-medium">{item.summary}</span>
            <span className="text-xs text-muted-foreground">
              {item.severity} - {item.status} - {item.occurredAt.toLocaleDateString()}
            </span>
          </>
        )}
      />
      <SimpleActivityCard
        title="Documents"
        emptyTitle="No documents"
        items={rider.documents}
        render={(item) => (
          <>
            <span className="font-medium">{item.title}</span>
            <span className="text-xs text-muted-foreground">
              {item.type} - {item.createdAt.toLocaleDateString()}
            </span>
          </>
        )}
      />
      <SimpleActivityCard
        title="Status history"
        emptyTitle="No status history"
        items={rider.statusHistories}
        render={(item) => (
          <>
            <span className="font-medium">
              {item.oldStatus ?? "New"} {"->"} {item.newStatus}
            </span>
            <span className="text-xs text-muted-foreground">{item.changedAt.toLocaleString()}</span>
            {item.note ? <span className="text-sm text-muted-foreground">{item.note}</span> : null}
          </>
        )}
      />
    </div>
  );
}

function RideTable({
  title,
  rides,
}: Readonly<{
  title: string;
  rides: RiderProfile["rideRequests"];
}>) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {rides.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Purpose</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Driver</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rides.map((ride) => {
                const firstLeg = ride.tripLegs[0];
                return (
                  <TableRow key={ride.id}>
                    <TableCell>{ride.neededAt.toLocaleString()}</TableCell>
                    <TableCell>{ride.purpose}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{ride.status}</Badge>
                    </TableCell>
                    <TableCell>{firstLeg?.assignment?.driver.displayName ?? "Unassigned"}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : (
          <EmptyState title={`No ${title.toLowerCase()}`} description="Ride activity will appear here when requests are connected to this rider." />
        )}
      </CardContent>
    </Card>
  );
}

function SimpleActivityCard<T>({
  title,
  emptyTitle,
  items,
  render,
}: Readonly<{
  title: string;
  emptyTitle: string;
  items: T[];
  render: (item: T) => ReactNode;
}>) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length > 0 ? (
          <div className="flex flex-col gap-3">
            {items.map((item, index) => (
              <div key={index} className="flex flex-col gap-1 rounded-md border p-3">
                {render(item)}
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title={emptyTitle} description={`${title} will appear here when records are added.`} />
        )}
      </CardContent>
    </Card>
  );
}

function Info({
  label,
  value,
  wide,
}: Readonly<{
  label: string;
  value?: string | null;
  wide?: boolean;
}>) {
  return (
    <div className={wide ? "md:col-span-2" : undefined}>
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm">{value || "Not set"}</dd>
    </div>
  );
}

function formatAddress(rider: RiderProfile) {
  return [
    rider.addressLine1,
    rider.addressLine2,
    [rider.city, rider.state, rider.postalCode].filter(Boolean).join(" "),
  ]
    .filter(Boolean)
    .join(", ");
}

function formatPair(name: string | null, phone: string | null) {
  return [name, phone].filter(Boolean).join(" - ");
}
