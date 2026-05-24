import Link from "next/link";
import { notFound } from "next/navigation";
import { updateRideRequestAction } from "@/actions/ride-request-actions";
import { PageHeader } from "@/components/layouts/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { requirePermission } from "@/lib/auth/guards";
import {
  getRideRequestForEdit,
  getRideRequestIntakeOptions,
} from "@/lib/ride-requests/ride-request-queries";
import { getSettingOptions } from "@/lib/settings/settings-service";

const statusOptions = [
  ["REQUESTED", "Requested"],
  ["PENDING_REVIEW", "Pending review"],
  ["PENDING_ASSIGNMENT", "Pending assignment"],
  ["SCHEDULED", "Scheduled"],
  ["COMPLETED", "Completed"],
  ["CANCELED", "Canceled"],
  ["DENIED", "Denied"],
  ["UNRESOLVED", "Unresolved"],
];

type PageProps = {
  params: Promise<{ rideRequestId: string }>;
};

export default async function EditRideRequestPage({ params }: PageProps) {
  const { rideRequestId } = await params;
  const membership = await requirePermission("ride_requests:manage");
  const [rideRequest, intakeOptions, ridePurposes] = await Promise.all([
    getRideRequestForEdit(membership.organizationId, rideRequestId),
    getRideRequestIntakeOptions(membership.organizationId),
    getSettingOptions(membership.organizationId, "ridePurposes"),
  ]);

  if (!rideRequest) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Edit ride request"
        description={`Update ${rideRequest.rider.displayName}'s request, status, and dispatch notes.`}
        actions={
          <Button asChild variant="outline">
            <Link href="/ride-requests">Back to requests</Link>
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Request details</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updateRideRequestAction} className="grid gap-5">
            <input type="hidden" name="rideRequestId" value={rideRequest.id} />

            <div className="grid gap-4 md:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm font-medium">
                Rider
                <Input value={rideRequest.rider.displayName} disabled />
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium">
                Status
                <select
                  name="status"
                  defaultValue={rideRequest.status}
                  className="h-10 rounded-md border bg-background px-3 text-sm"
                >
                  {statusOptions.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium">
                Appointment
                <Input
                  type="datetime-local"
                  name="neededAt"
                  defaultValue={toDateTimeLocal(rideRequest.neededAt)}
                />
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium">
                Request source
                <Input name="requestSource" defaultValue={rideRequest.requestSource ?? ""} />
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium">
                Pickup window start
                <Input
                  type="datetime-local"
                  name="pickupWindowStart"
                  defaultValue={toDateTimeLocal(rideRequest.pickupWindowStart)}
                />
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium">
                Pickup window end
                <Input
                  type="datetime-local"
                  name="pickupWindowEnd"
                  defaultValue={toDateTimeLocal(rideRequest.pickupWindowEnd)}
                />
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium">
                Ride purpose
                <select
                  name="purpose"
                  defaultValue={rideRequest.purpose}
                  className="h-10 rounded-md border bg-background px-3 text-sm"
                >
                  {ridePurposes.map((purpose) => (
                    <option key={purpose.code} value={purpose.code}>
                      {purpose.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium">
                Funding source
                <select
                  name="fundingSourceId"
                  defaultValue={rideRequest.fundingSourceId ?? ""}
                  className="h-10 rounded-md border bg-background px-3 text-sm"
                >
                  <option value="">Not set</option>
                  {intakeOptions.fundingSources.map((source) => (
                    <option key={source.id} value={source.id}>
                      {source.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {rideRequest.tripLegs.map((leg) => (
                <div key={leg.id} className="rounded-md border bg-muted/30 p-3 text-sm">
                  <p className="font-semibold text-cars-navy">Leg {leg.sequence}</p>
                  <p className="mt-1 text-muted-foreground">
                    {leg.pickupCity ?? "Pickup"} to {leg.dropoffCity ?? "Dropoff"}
                  </p>
                  <p className="mt-2 font-medium">{leg.status.toLowerCase().replaceAll("_", " ")}</p>
                </div>
              ))}
            </div>

            <label className="flex flex-col gap-2 text-sm font-medium">
              Special instructions
              <Textarea name="specialInstructions" defaultValue={rideRequest.specialInstructions ?? ""} />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium">
              Internal notes
              <Textarea name="internalNotes" defaultValue={rideRequest.internalNotes ?? ""} />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium">
              Queue notes
              <Textarea name="notes" defaultValue={rideRequest.notes ?? ""} />
            </label>

            <div className="flex justify-end gap-3">
              <Button asChild variant="outline">
                <Link href="/ride-requests">Cancel</Link>
              </Button>
              <Button type="submit">Save request</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function toDateTimeLocal(value: Date | null) {
  if (!value) {
    return "";
  }

  const offsetMs = value.getTimezoneOffset() * 60_000;
  return new Date(value.getTime() - offsetMs).toISOString().slice(0, 16);
}
