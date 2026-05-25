import { CalendarDays, Car, Clock, ShieldCheck, WalletCards, X } from "lucide-react";
import {
  createDriverPortalAvailabilityAction,
  removeDriverPortalAvailabilityAction,
  updateDriverPortalInfoAction,
} from "@/actions/driver-portal-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { getDriverPortalWorkspace } from "@/lib/driver-portal/driver-portal-queries";
import type { SettingOption } from "@/types/settings";

type DriverSelfServiceProps = {
  workspace: Awaited<ReturnType<typeof getDriverPortalWorkspace>>;
  counties: SettingOption[];
  reimbursementPreferences: SettingOption[];
};

export function DriverSelfService({
  workspace,
  counties,
  reimbursementPreferences,
}: DriverSelfServiceProps) {
  const { driver, upcomingAssignments, pastAssignments, mileageRecords, reimbursementBatches, reimbursementSummary } =
    workspace;

  return (
    <section className="grid gap-5">
      <Card className="border-white/10 bg-white text-slate-950">
        <CardHeader className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-md bg-cars-red text-white">
              <Car className="size-5" aria-hidden="true" />
            </div>
            <div>
              <CardTitle>Vehicle, insurance, and payment</CardTitle>
              <CardDescription>
                Keep the details dispatch and finance rely on current.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <form action={updateDriverPortalInfoAction} className="grid gap-3 sm:grid-cols-3">
            <Field label="Vehicle year" name="vehicleYear" type="number" defaultValue={driver.vehicleYear?.toString()} />
            <Field label="Make" name="vehicleMake" defaultValue={driver.vehicleMake} />
            <Field label="Model" name="vehicleModel" defaultValue={driver.vehicleModel} />
            <Field
              label="Insurance verified through"
              name="insuranceVerificationDate"
              type="date"
              defaultValue={formatDateForInput(driver.insuranceVerificationDate)}
            />
            <label className="grid gap-1 text-sm sm:col-span-2">
              <span className="font-semibold text-slate-700">Reimbursement preference</span>
              <select
                name="reimbursementPreference"
                defaultValue={driver.reimbursementPreference ?? ""}
                className="h-11 rounded-md border bg-background px-3 text-sm"
              >
                <option value="">Choose preference</option>
                {reimbursementPreferences.map((option) => (
                  <option key={option.code} value={option.code}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="sm:col-span-3">
              <Button type="submit" className="min-h-11 w-full sm:w-auto">
                <ShieldCheck data-icon="inline-start" aria-hidden="true" />
                Save driver details
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="border-white/10 bg-white text-slate-950">
        <CardHeader className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-md bg-cars-navy text-white">
              <CalendarDays className="size-5" aria-hidden="true" />
            </div>
            <div>
              <CardTitle>Availability</CardTitle>
              <CardDescription>
                Add available windows, tentative windows, or blackout time so dispatch can schedule cleanly.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 p-4 pt-0">
          <form action={createDriverPortalAvailabilityAction} className="grid gap-3 rounded-md border p-3 md:grid-cols-4">
            <Select label="Type" name="availabilityType" options={[["one_time", "One-time"], ["recurring", "Recurring"], ["blackout", "Blackout"]]} />
            <Select label="Status" name="status" options={[["AVAILABLE", "Available"], ["TENTATIVE", "Tentative"], ["UNAVAILABLE", "Unavailable"]]} />
            <Field label="Starts" name="startsAt" type="datetime-local" />
            <Field label="Ends" name="endsAt" type="datetime-local" />
            <label className="grid gap-1 text-sm md:col-span-2">
              <span className="font-semibold text-slate-700">Preferred counties</span>
              <select name="preferredCounties" multiple className="min-h-28 rounded-md border bg-background px-3 py-2 text-sm">
                {counties.map((county) => (
                  <option key={county.code} value={county.code}>
                    {county.label}
                  </option>
                ))}
              </select>
            </label>
            <Field label="Max distance miles" name="maxDistanceMiles" type="number" />
            <Field label="Notes" name="notes" />
            <div className="md:col-span-4">
              <Button type="submit" className="min-h-11 w-full sm:w-auto">
                Add availability
              </Button>
            </div>
          </form>

          {driver.availabilities.length > 0 ? (
            <div className="grid gap-2">
              {driver.availabilities.map((item) => (
                <div key={item.id} className="grid gap-3 rounded-md border p-3 sm:grid-cols-[1fr_auto] sm:items-center">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={item.status === "AVAILABLE" ? "secondary" : "outline"}>{titleCase(item.status)}</Badge>
                      <span className="text-sm font-semibold">{titleCase(item.availabilityType)}</span>
                    </div>
                    <p className="mt-2 text-sm text-slate-600">
                      {formatDateTime(item.startsAt)} to {formatDateTime(item.endsAt)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {formatJsonOptions(item.preferredCounties, counties) || "All counties"}
                      {item.maxDistanceMiles ? ` · ${item.maxDistanceMiles} mi max` : ""}
                    </p>
                  </div>
                  <form action={removeDriverPortalAvailabilityAction.bind(null, item.id)}>
                    <Button type="submit" variant="outline" size="sm">
                      <X className="size-4" aria-hidden="true" />
                      Remove
                    </Button>
                  </form>
                </div>
              ))}
            </div>
          ) : (
            <EmptyPanel title="No availability entered" description="Add your next available window so dispatch knows when to offer rides." />
          )}
        </CardContent>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="border-white/10 bg-white text-slate-950">
          <CardHeader className="p-4">
            <CardTitle>Accepted upcoming rides</CardTitle>
            <CardDescription>Rides you accepted beyond today.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 p-4 pt-0">
            {upcomingAssignments.length > 0 ? (
              upcomingAssignments.map((assignment) => (
                <RideRow key={assignment.id} assignment={assignment} />
              ))
            ) : (
              <EmptyPanel title="No upcoming accepted rides" description="Accepted future rides will appear here." />
            )}
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-white text-slate-950">
          <CardHeader className="p-4">
            <CardTitle>Past rides</CardTitle>
            <CardDescription>Recently completed ride history.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 p-4 pt-0">
            {pastAssignments.length > 0 ? (
              pastAssignments.map((assignment) => (
                <RideRow key={assignment.id} assignment={assignment} showMileage />
              ))
            ) : (
              <EmptyPanel title="No completed rides yet" description="Completed trips will appear here after you finish rides." />
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-white/10 bg-white text-slate-950">
        <CardHeader className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-md bg-cyan-500 text-slate-950">
              <WalletCards className="size-5" aria-hidden="true" />
            </div>
            <div>
              <CardTitle>Reimbursement</CardTitle>
              <CardDescription>Submitted mileage, batch status, and paid totals.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 p-4 pt-0">
          <div className="grid grid-cols-3 gap-2">
            <Metric label="Pending" value={formatCurrency(reimbursementSummary.pendingCents)} />
            <Metric label="Paid" value={formatCurrency(reimbursementSummary.paidCents)} />
            <Metric label="Items" value={reimbursementSummary.pendingMileageCount.toString()} />
          </div>
          {mileageRecords.length > 0 ? (
            <div className="grid gap-2">
              {mileageRecords.slice(0, 6).map((record) => (
                <div key={record.id} className="grid gap-2 rounded-md border p-3 sm:grid-cols-[1fr_auto]">
                  <div>
                    <p className="font-semibold">
                      {formatDate(record.serviceDate)} · {String(record.miles)} miles
                    </p>
                    <p className="text-sm text-slate-600">
                      {record.tripLeg.rideRequest.rider.displayName} · {record.reimbursementBatch?.batchNumber ?? "Not batched"}
                    </p>
                  </div>
                  <div className="text-left sm:text-right">
                    <Badge variant="secondary">{titleCase(record.status)}</Badge>
                    <p className="mt-1 text-sm font-semibold">{formatCurrency(record.amountCents)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyPanel title="No reimbursement records" description="Submitted mileage will appear here after rides are completed." />
          )}
          {reimbursementBatches.length > 0 ? (
            <div className="grid gap-2">
              <h3 className="text-sm font-semibold text-slate-700">Recent batches</h3>
              {reimbursementBatches.map((batch) => (
                <div key={batch.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-slate-100 p-3 text-sm">
                  <span className="font-semibold">{batch.batchNumber}</span>
                  <span>{formatDate(batch.periodStart)} - {formatDate(batch.periodEnd)}</span>
                  <Badge variant={batch.status === "PAID" ? "secondary" : "outline"}>{titleCase(batch.status)}</Badge>
                  <span className="font-semibold">{formatCurrency(batch.totalCents)}</span>
                </div>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </section>
  );
}

function Field({
  label,
  name,
  type = "text",
  defaultValue,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string | null;
}) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="font-semibold text-slate-700">{label}</span>
      <Input name={name} type={type} defaultValue={defaultValue ?? ""} className="h-11" />
    </label>
  );
}

function Select({
  label,
  name,
  options,
}: {
  label: string;
  name: string;
  options: Array<[string, string]>;
}) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="font-semibold text-slate-700">{label}</span>
      <select name={name} className="h-11 rounded-md border bg-background px-3 text-sm">
        {options.map(([value, optionLabel]) => (
          <option key={value} value={value}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  );
}

function RideRow({
  assignment,
  showMileage = false,
}: {
  assignment: DriverSelfServiceProps["workspace"]["upcomingAssignments"][number] & {
    mileageRecord?: { miles: unknown; amountCents: number } | null;
  };
  showMileage?: boolean;
}) {
  const trip = assignment.tripLeg;
  const rider = trip.rideRequest.rider;

  return (
    <div className="rounded-md border p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold">{rider.displayName}</p>
          <p className="mt-1 flex items-center gap-2 text-sm text-slate-600">
            <Clock className="size-4" aria-hidden="true" />
            {formatDateTime(trip.scheduledPickupAt)}
          </p>
        </div>
        <Badge variant="secondary">{titleCase(trip.status)}</Badge>
      </div>
      <p className="mt-2 text-sm text-slate-600">
        {trip.pickupCounty ?? "Pickup county"} to {trip.dropoffCounty ?? "dropoff county"}
      </p>
      {showMileage && assignment.mileageRecord ? (
        <p className="mt-2 text-sm font-semibold">
          {String(assignment.mileageRecord.miles)} miles · {formatCurrency(assignment.mileageRecord.amountCents)}
        </p>
      ) : null}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-slate-100 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-black text-cars-navy">{value}</p>
    </div>
  );
}

function EmptyPanel({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-md border border-dashed p-4 text-center">
      <p className="font-semibold">{title}</p>
      <p className="mt-1 text-sm text-slate-600">{description}</p>
    </div>
  );
}

function formatDateForInput(value: Date | null) {
  return value ? value.toISOString().slice(0, 10) : "";
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(value);
}

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(value);
}

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

function titleCase(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function formatJsonOptions(value: unknown, options: SettingOption[]) {
  if (!Array.isArray(value)) {
    return "";
  }

  const labels = new Map(options.map((option) => [option.code, option.label]));
  return value.map((item) => labels.get(String(item)) ?? String(item)).join(", ");
}
