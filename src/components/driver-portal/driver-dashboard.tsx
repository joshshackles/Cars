import { AlertTriangle, CheckCircle2, Clock, Navigation, Route } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { getDriverManifest } from "@/lib/driver-portal/driver-portal-queries";

type DriverDashboardProps = {
  driverName: string;
  assignments: Awaited<ReturnType<typeof getDriverManifest>>;
};

export function DriverDashboard({ driverName, assignments }: DriverDashboardProps) {
  const activeAssignments = assignments.filter((assignment) =>
    ["OFFERED", "ACCEPTED"].includes(assignment.status)
  );
  const completedCount = assignments.filter(
    (assignment) => assignment.status === "COMPLETED" || assignment.tripLeg.status === "COMPLETED"
  ).length;
  const attentionCount = assignments.filter(
    (assignment) => assignment.tripLeg.status === "NEEDS_ATTENTION" || assignment.status === "DECLINED"
  ).length;
  const nextAssignment =
    activeAssignments.find((assignment) => assignment.tripLeg.status !== "COMPLETED") ?? assignments[0];

  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <p className="text-sm text-cyan-200">Driver dashboard</p>
        <h2 className="text-3xl font-semibold tracking-normal">Good day, {firstName(driverName)}</h2>
        <p className="text-sm leading-6 text-slate-300">
          Review your day, open your next ride, and keep dispatch updated as each trip moves.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <DashboardMetric icon={Route} label="Today" value={assignments.length.toString()} />
        <DashboardMetric icon={Navigation} label="Active" value={activeAssignments.length.toString()} />
        <DashboardMetric icon={CheckCircle2} label="Completed" value={completedCount.toString()} />
        <DashboardMetric icon={AlertTriangle} label="Attention" value={attentionCount.toString()} />
      </div>

      <Card className="border-white/10 bg-white text-slate-950">
        <CardHeader className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle>Next ride</CardTitle>
              <p className="mt-1 text-sm text-slate-600">Your most immediate assignment for today.</p>
            </div>
            {nextAssignment ? (
              <Badge variant="secondary">{statusLabel(nextAssignment.tripLeg.status)}</Badge>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          {nextAssignment ? (
            <div className="flex flex-col gap-3">
              <div className="rounded-md bg-slate-100 p-3">
                <p className="flex items-center gap-2 text-sm font-medium text-slate-600">
                  <Clock className="size-4" aria-hidden="true" />
                  {formatTime(nextAssignment.tripLeg.scheduledPickupAt)}
                </p>
                <p className="mt-2 text-xl font-semibold">
                  {nextAssignment.tripLeg.rideRequest.rider.firstName}{" "}
                  {nextAssignment.tripLeg.rideRequest.rider.lastName}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  {nextAssignment.tripLeg.pickupCounty ?? "Pickup county pending"} to{" "}
                  {nextAssignment.tripLeg.dropoffCounty ?? "dropoff county pending"}
                </p>
              </div>
              <a
                href="#manifest"
                className="inline-flex min-h-12 items-center justify-center rounded-md bg-cars-red px-4 text-base font-semibold text-white hover:bg-red-700"
              >
                Open manifest
              </a>
            </div>
          ) : (
            <div className="rounded-md border border-dashed p-6 text-center">
              <p className="font-semibold">No rides assigned today</p>
              <p className="mt-2 text-sm text-slate-600">
                Dispatch assignments will appear here when they are ready.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

function DashboardMetric({
  icon: Icon,
  label,
  value,
}: Readonly<{
  icon: LucideIcon;
  label: string;
  value: string;
}>) {
  return (
    <Card className="border-white/10 bg-white/10 text-slate-50">
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex size-11 items-center justify-center rounded-md bg-cyan-400 text-slate-950">
          <Icon className="size-5" aria-hidden="true" />
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-300">{label}</p>
          <p className="text-2xl font-semibold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function firstName(name: string) {
  return name.split(" ")[0] ?? name;
}

function formatTime(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(value);
}

function statusLabel(status: string) {
  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}
