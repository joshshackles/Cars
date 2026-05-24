import { AlertTriangle, Check, Clock, MapPin, Navigation, Phone, Route, Siren, X } from "lucide-react";
import {
  acceptAssignmentAction,
  declineAssignmentAction,
  markArrivedAction,
  markCompletedAction,
  markEnRouteAction,
  reportIssueAction,
} from "@/actions/driver-portal-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GpsActionForm } from "@/components/driver-portal/gps-action-form";
import { GpsTripTracker } from "@/components/driver-portal/gps-trip-tracker";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { getDriverManifest } from "@/lib/driver-portal/driver-portal-queries";

type DriverManifestProps = {
  date: Date;
  assignments: Awaited<ReturnType<typeof getDriverManifest>>;
};

const statusLabels: Record<string, string> = {
  OFFERED: "Offered",
  ACCEPTED: "Accepted",
  DECLINED: "Declined",
  CANCELED: "Canceled",
  COMPLETED: "Completed",
  PENDING: "Pending",
  READY_TO_ASSIGN: "Ready",
  ASSIGNED: "Assigned",
  DRIVER_CONFIRMED: "Accepted",
  IN_PROGRESS: "In progress",
  EN_ROUTE: "En route",
  ARRIVED: "Arrived",
  NEEDS_ATTENTION: "Needs attention",
  NO_SHOW: "No-show",
};

export function DriverManifest({ date, assignments }: DriverManifestProps) {
  return (
    <div className="flex flex-col gap-5">
      <section className="flex flex-col gap-1">
        <p className="text-sm text-slate-300">Daily manifest</p>
        <h2 className="text-3xl font-semibold tracking-normal">{formatLongDate(date)}</h2>
      </section>

      {assignments.length === 0 ? (
        <Card className="border-white/10 bg-white/5 text-slate-50">
          <CardContent className="p-6">
            <div className="flex min-h-48 flex-col items-center justify-center gap-3 text-center">
              <Route className="size-10 text-cyan-200" aria-hidden="true" />
              <div>
                <h3 className="text-lg font-semibold">No assigned rides today</h3>
                <p className="mt-1 text-sm leading-6 text-slate-300">Your manifest will appear here when dispatch assigns a trip.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {assignments.map((assignment) => (
            <TripCard key={assignment.id} assignment={assignment} />
          ))}
        </div>
      )}
    </div>
  );
}

type Assignment = DriverManifestProps["assignments"][number];

function TripCard({ assignment }: { assignment: Assignment }) {
  const trip = assignment.tripLeg;
  const request = trip.rideRequest;
  const rider = request.rider;
  const pickup = formatAddress(trip.pickupAddress, trip.pickupCity, trip.pickupState, trip.pickupPostalCode);
  const dropoff = formatAddress(trip.dropoffAddress, trip.dropoffCity, trip.dropoffState, trip.dropoffPostalCode);
  const directionsUrl = pickup && dropoff ? buildDirectionsUrl(pickup, dropoff) : undefined;
  const notes = [
    rider.mobilityNotes ? ["Mobility", rider.mobilityNotes] : null,
    rider.pickupInstructions ? ["Pickup", rider.pickupInstructions] : null,
    request.specialInstructions ? ["Ride", request.specialInstructions] : null,
    rider.riderNotes ? ["Approved notes", rider.riderNotes] : null,
  ].filter((note): note is [string, string] => Boolean(note));

  return (
    <Card className="overflow-hidden border-white/10 bg-white text-slate-950 shadow-xl">
      <CardHeader className="gap-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-sm font-medium text-slate-500">
              <Clock className="size-4" aria-hidden="true" />
              {formatTime(trip.scheduledPickupAt)}
            </p>
            <CardTitle className="mt-1 truncate text-2xl leading-8">
              {rider.firstName} {rider.lastName}
            </CardTitle>
          </div>
          <Badge variant={trip.status === "NEEDS_ATTENTION" ? "destructive" : "secondary"} className="shrink-0">
            {statusLabels[trip.status] ?? trip.status}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-4 p-4 pt-0">
        <div className="grid gap-3">
          <LocationBlock label="Pickup" value={pickup || trip.pickupAddress} county={trip.pickupCounty} />
          <LocationBlock label="Dropoff" value={dropoff || trip.dropoffAddress} county={trip.dropoffCounty} />
        </div>

        <RouteMap assignment={assignment} pickup={pickup} dropoff={dropoff} />
        <GpsTripTracker
          assignmentId={assignment.id}
          active={assignment.status === "ACCEPTED" && ["EN_ROUTE", "IN_PROGRESS", "ARRIVED"].includes(trip.status)}
        />

        <div className="grid grid-cols-2 gap-2 text-sm">
          <InfoTile label="Purpose" value={titleCase(request.purpose)} />
          <InfoTile label="Rider phone" value={rider.phone ?? "Not listed"} />
        </div>

        {notes.length > 0 ? (
          <section className="rounded-md border bg-slate-50 p-3">
            <h3 className="text-sm font-semibold">Approved rider notes</h3>
            <div className="mt-2 flex flex-col gap-2">
              {notes.map(([label, value]) => (
                <p key={label} className="text-sm leading-6 text-slate-700">
                  <span className="font-medium text-slate-950">{label}:</span> {value}
                </p>
              ))}
            </div>
          </section>
        ) : null}

        <div className="grid gap-2">
          {assignment.status === "OFFERED" ? (
            <form action={acceptAssignmentAction.bind(null, assignment.id)}>
              <Button className="h-12 w-full text-base">
                <Check data-icon="inline-start" aria-hidden="true" />
                Accept assignment
              </Button>
            </form>
          ) : null}

          {assignment.status === "ACCEPTED" && (trip.status === "DRIVER_CONFIRMED" || trip.status === "ASSIGNED") ? (
            <GpsActionForm
              action={markEnRouteAction.bind(null, assignment.id)}
              assignmentId={assignment.id}
              routeUrl={directionsUrl}
              trackingMode="start"
              helpText="GPS starts automatic mileage. Open the route first if you want turn-by-turn directions."
            >
                <Navigation data-icon="inline-start" aria-hidden="true" />
                Start trip and GPS
            </GpsActionForm>
          ) : null}

          {assignment.status === "ACCEPTED" && (trip.status === "EN_ROUTE" || trip.status === "IN_PROGRESS") ? (
            <form action={markArrivedAction.bind(null, assignment.id)}>
              <Button className="h-12 w-full text-base">
                <MapPin data-icon="inline-start" aria-hidden="true" />
                Mark arrived
              </Button>
            </form>
          ) : null}

          {assignment.status === "ACCEPTED" && trip.status === "ARRIVED" ? (
            <GpsActionForm
              action={markCompletedAction.bind(null, assignment.id)}
              assignmentId={assignment.id}
              routeUrl={directionsUrl}
              trackingMode="stop"
              helpText="GPS captures the finish point, calculates mileage, and submits it automatically."
            >
                <Check data-icon="inline-start" aria-hidden="true" />
                Complete and submit mileage
            </GpsActionForm>
          ) : null}
        </div>

        {assignment.status === "COMPLETED" || trip.status === "COMPLETED" ? (
          <section className="rounded-md border bg-slate-50 p-3">
            <h3 className="text-sm font-semibold">Mileage submitted automatically</h3>
            <p className="mt-2 text-sm leading-6 text-slate-700">
              {assignment.mileageRecord?.miles
                ? `${Number(assignment.mileageRecord.miles).toFixed(2)} miles submitted from GPS trip tracking.`
                : "Mileage will appear here after completion."}
            </p>
            {assignment.mileageRecord?.gpsPointCount ? (
              <p className="mt-1 text-xs text-slate-500">
                {assignment.mileageRecord.gpsPointCount} GPS points recorded for this trip.
              </p>
            ) : null}
          </section>
        ) : null}

        {rider.phone ? (
          <Button asChild variant="outline" className="h-12 w-full text-base">
            <a href={`tel:${rider.phone}`}>
              <Phone data-icon="inline-start" aria-hidden="true" />
              Call rider
            </a>
          </Button>
        ) : null}

        {assignment.status !== "COMPLETED" && assignment.status !== "DECLINED" ? (
          <details className="rounded-md border bg-slate-50 p-3">
            <summary className="flex min-h-10 cursor-pointer list-none items-center gap-2 text-sm font-semibold">
              <X className="size-4" aria-hidden="true" />
              Decline assignment
            </summary>
            <form action={declineAssignmentAction.bind(null, assignment.id)} className="mt-3 flex flex-col gap-2">
              <Textarea name="reason" className="min-h-24 text-base" placeholder="Reason dispatch should review" />
              <Button type="submit" variant="destructive" className="h-12 w-full text-base">
                Decline and alert dispatch
              </Button>
            </form>
          </details>
        ) : null}

        <details className="rounded-md border border-amber-200 bg-amber-50 p-3">
          <summary className="flex min-h-10 cursor-pointer list-none items-center gap-2 text-sm font-semibold text-amber-950">
            <Siren className="size-4" aria-hidden="true" />
            Report issue
          </summary>
          <form action={reportIssueAction.bind(null, assignment.id)} className="mt-3 flex flex-col gap-2">
            <Input name="summary" className="h-12 text-base" placeholder="Short issue summary" />
            <Textarea name="details" className="min-h-24 text-base" placeholder="Optional details for dispatch" />
            <Button type="submit" className="h-12 w-full text-base">
              <AlertTriangle data-icon="inline-start" aria-hidden="true" />
              Send to attention queue
            </Button>
          </form>
        </details>
      </CardContent>
    </Card>
  );
}

function RouteMap({ assignment, pickup, dropoff }: { assignment: Assignment; pickup: string; dropoff: string }) {
  const trip = assignment.tripLeg;
  const directionsUrl = buildDirectionsUrl(pickup, dropoff);
  const appleMapsUrl = buildAppleMapsUrl(pickup, dropoff);
  const embedUrl = buildDirectionsEmbedUrl(pickup, dropoff);

  if (!pickup || !dropoff) {
    return (
      <section className="rounded-md border bg-slate-50 p-3">
        <h3 className="text-sm font-semibold">Route map</h3>
        <p className="mt-2 text-sm text-slate-600">
          Complete pickup and dropoff addresses are needed to show the route.
        </p>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-md border bg-slate-50">
      <div className="p-3">
        <div className="flex flex-col gap-3">
          <div>
            <h3 className="text-sm font-semibold">Best route</h3>
            <p className="mt-1 text-xs leading-5 text-slate-600">
              Use your phone&apos;s map app for live navigation. CARS records mileage from GPS start to finish.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button asChild className="h-11">
              <a href={directionsUrl} target="_blank" rel="noreferrer">
                <Navigation data-icon="inline-start" aria-hidden="true" />
                Google
              </a>
            </Button>
            <Button asChild variant="outline" className="h-11">
              <a href={appleMapsUrl} target="_blank" rel="noreferrer">
                <MapPin data-icon="inline-start" aria-hidden="true" />
                Apple
              </a>
            </Button>
          </div>
        </div>
      </div>
      <iframe
        title={`Route for ${trip.rideRequest.rider.firstName} ${trip.rideRequest.rider.lastName}`}
        src={embedUrl}
        className="h-56 w-full border-0"
        loading="lazy"
      />
    </section>
  );
}

function LocationBlock({ label, value, county }: { label: string; value: string | null; county: string | null }) {
  return (
    <div className="rounded-md border p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-base font-medium leading-6">{value ?? "Address pending"}</p>
      {county ? <p className="mt-1 text-sm text-slate-500">{county}</p> : null}
    </div>
  );
}

function formatAddress(
  address: string | null,
  city: string | null,
  state: string | null,
  postalCode: string | null
) {
  return [address, city, state, postalCode].filter(Boolean).join(", ");
}

function buildDirectionsUrl(origin: string, destination: string) {
  const params = new URLSearchParams({
    api: "1",
    origin,
    destination,
    travelmode: "driving",
  });

  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

function buildAppleMapsUrl(origin: string, destination: string) {
  const params = new URLSearchParams({
    saddr: origin,
    daddr: destination,
    dirflg: "d",
  });

  return `https://maps.apple.com/?${params.toString()}`;
}

function buildDirectionsEmbedUrl(origin: string, destination: string) {
  const params = new URLSearchParams({
    output: "embed",
    saddr: origin,
    daddr: destination,
  });

  return `https://www.google.com/maps?${params.toString()}`;
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-slate-100 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 break-words text-sm font-medium">{value}</p>
    </div>
  );
}

function formatTime(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(value);
}

function formatLongDate(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(value);
}

function titleCase(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}
