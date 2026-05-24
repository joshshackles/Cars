import Link from "next/link";
import {
  CalendarDays,
  CarFront,
  CheckCircle2,
  ClipboardList,
  Monitor,
  Phone,
  Route,
  Users,
  XCircle,
} from "lucide-react";
import { PageHeader } from "@/components/layouts/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardOverview } from "@/lib/dashboard/dashboard-queries";

const overviewItems = [
  {
    title: "Today",
    valueKey: "todayTrips",
    label: "Trips scheduled",
    description: "Connect riders with drivers to get operations moving.",
    action: "View today's schedule",
    href: "/dispatch",
    permission: "canViewDispatch",
    icon: CalendarDays,
    tone: "navy",
  },
  {
    title: "Requests",
    valueKey: "pendingRequests",
    label: "Pending requests",
    description: "Intake, eligibility, and scheduling queues are ready.",
    action: "View all requests",
    href: "/ride-requests",
    permission: "canViewRideRequests",
    icon: ClipboardList,
    tone: "red",
  },
  {
    title: "Operations",
    valueKey: "activeTrips",
    label: "Active trips",
    description: "Role-aware operational signals will appear here.",
    action: "Go to dispatch",
    href: "/dispatch",
    permission: "canViewDispatch",
    icon: Users,
    tone: "navy",
  },
] as const;

export function DashboardHome({
  overview,
  permissions,
}: Readonly<{
  overview: DashboardOverview;
  permissions: {
    canCreateRideRequest: boolean;
    canViewDispatch: boolean;
    canViewIncidents: boolean;
    canViewRideRequests: boolean;
  };
}>) {
  const glanceItems = [
    ["Riders", overview.riders, Users],
    ["Drivers", overview.drivers, CarFront],
    ["Pending Requests", overview.pendingRequests, ClipboardList],
    ["Active Trips", overview.activeTrips, CarFront],
    ["Completed Today", overview.completedToday, CheckCircle2],
    ["No-Shows Today", overview.noShowsToday, XCircle],
  ] as const;

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_18rem]">
      <div className="flex min-w-0 flex-col gap-6">
        <PageHeader
          title="Dashboard"
          description="A clean operations cockpit for volunteer transportation teams."
          actions={
            <div className="flex flex-wrap gap-3">
                {permissions.canViewIncidents ? (
                  <Button asChild variant="outline" size="sm">
                    <Link href="/notifications">Notifications</Link>
                  </Button>
                ) : null}
              {permissions.canCreateRideRequest ? (
                <Button asChild variant="secondary" size="sm">
                  <Link href="/ride-requests/new">
                    Quick Actions
                  </Link>
                </Button>
              ) : null}
            </div>
          }
        />

        <div className="grid gap-5 lg:grid-cols-3">
          {overviewItems.map((item) => (
            <Card key={item.title} className="relative min-h-48 overflow-hidden rounded-lg">
              <CardContent className="relative z-10 flex h-full flex-col justify-between gap-8 p-7">
                <div className="flex items-start gap-5">
                  <div
                    className={
                      item.tone === "red"
                        ? "flex size-16 items-center justify-center rounded-full bg-cars-red text-white"
                        : "flex size-16 items-center justify-center rounded-full bg-cars-navy text-white"
                    }
                  >
                    <item.icon className="size-8" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <p className={item.tone === "red" ? "font-black text-cars-red" : "font-black text-cars-navy"}>
                      {item.title}
                    </p>
                    <p className={item.tone === "red" ? "text-5xl font-black text-cars-red" : "text-5xl font-black text-cars-navy"}>
                      {overview[item.valueKey]}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <h2 className="text-lg font-black text-slate-900">{item.label}</h2>
                  <p className="max-w-[13rem] text-sm leading-6 text-slate-600">{item.description}</p>
                  {permissions[item.permission] ? (
                    <Link
                      href={item.href}
                      className={item.tone === "red" ? "w-fit text-sm font-black text-cars-red hover:underline" : "w-fit text-sm font-black text-blue-700 hover:underline"}
                    >
                      {item.action}
                    </Link>
                  ) : (
                    <span className="w-fit text-sm font-black text-slate-400">Role restricted</span>
                  )}
                </div>
              </CardContent>
              <CarFront className="pointer-events-none absolute -bottom-5 -right-5 size-24 text-slate-100 sm:size-28" aria-hidden="true" />
            </Card>
          ))}
        </div>

        <Card className="rounded-lg">
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex size-11 items-center justify-center rounded-md border border-blue-100 bg-blue-50 text-blue-700">
                <Monitor className="size-6" aria-hidden="true" />
              </div>
              <div>
                <CardTitle className="text-lg font-black">Operations Board</CardTitle>
                <p className="text-sm text-muted-foreground">Real-time operational overview across the system.</p>
              </div>
            </div>
            {permissions.canViewDispatch ? (
              <Button asChild variant="outline" size="sm">
                <Link href="/dispatch">
                  <CalendarDays aria-hidden="true" />
                  Today
                </Link>
              </Button>
            ) : null}
          </CardHeader>
          <CardContent>
            {overview.operationTrips.length > 0 ? (
              <OperationTripList
                trips={overview.operationTrips}
                urgentExceptions={overview.urgentExceptions}
                canViewDispatch={permissions.canViewDispatch}
              />
            ) : (
              <OperationIllustration canCreateRideRequest={permissions.canCreateRideRequest} />
            )}
          </CardContent>
        </Card>
      </div>

      <aside className="flex flex-col gap-5">
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle className="text-base font-black">At a Glance</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col divide-y p-0">
            {glanceItems.map(([label, value, Icon], index) => (
              <div key={label} className="flex items-center justify-between px-5 py-3 text-sm">
                <span className="flex items-center gap-3 text-slate-700">
                  <Icon className={index === 2 ? "size-5 text-cars-red" : index > 3 ? "size-5 text-emerald-600" : "size-5 text-cars-navy"} aria-hidden="true" />
                  {label}
                </span>
                <span className="font-black text-cars-navy">{value}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle className="text-base font-black">Service Area</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-[1fr_5rem] items-center gap-4">
            <div className="text-sm leading-7 text-slate-700">
              <p className="mb-1 text-xs text-muted-foreground">Proudly serving:</p>
              <p>Barton County</p>
              <p>Jasper County</p>
              <p>Newton County</p>
              <p>McDonald County</p>
            </div>
            <ServiceAreaGraphic />
          </CardContent>
        </Card>

        <Card className="rounded-lg border-cars-red">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex size-16 items-center justify-center rounded-full bg-cars-red text-white">
              <Phone className="size-8" aria-hidden="true" />
            </div>
            <div className="font-black leading-tight">
              <p className="font-serif text-xl italic text-cars-red">Need A Ride?</p>
              <p className="text-cars-navy">CALL CARS!</p>
              <p className="text-xl text-cars-red">417-438-2925</p>
            </div>
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}

function OperationIllustration({
  canCreateRideRequest,
}: Readonly<{
  canCreateRideRequest: boolean;
}>) {
  return (
    <div className="relative overflow-hidden rounded-lg border border-dashed border-slate-300 bg-gradient-to-b from-white to-blue-50/70 px-6 py-10 text-center">
      <div className="absolute inset-x-10 bottom-24 hidden h-px bg-slate-200 sm:block" />
      <div className="absolute bottom-24 left-1/2 hidden h-14 w-[36rem] -translate-x-1/2 items-end justify-center gap-3 opacity-60 sm:flex">
        {["h-8 w-9", "h-14 w-12", "h-10 w-10", "h-16 w-14", "h-11 w-11"].map((shape, index) => (
          <div key={shape} className={`${shape} rounded-t-sm bg-slate-200`}>
            <div className="grid grid-cols-2 gap-1 p-1">
              <span className="h-1.5 rounded-sm bg-white/70" />
              <span className="h-1.5 rounded-sm bg-white/70" />
              <span className="h-1.5 rounded-sm bg-white/70" />
              <span className="h-1.5 rounded-sm bg-white/70" />
            </div>
            {index === 1 ? <div className="mt-2 h-4 bg-slate-300" /> : null}
          </div>
        ))}
      </div>

      <div className="relative mx-auto mb-4 flex h-32 max-w-lg items-end justify-center">
        <div className="absolute bottom-3 h-4 w-full max-w-md rounded-full bg-slate-200" />
        <div className="absolute bottom-0 h-2 w-72 rounded-full bg-cars-navy/15" />
        <div className="relative flex h-24 w-44 items-end justify-center">
          <div className="absolute bottom-8 h-16 w-28 rounded-t-[2rem] border-4 border-cars-navy bg-white" />
          <div className="absolute bottom-5 h-14 w-40 rounded-t-[2rem] rounded-b-lg bg-cars-navy shadow-lg">
            <div className="absolute left-6 top-4 size-5 rounded-full bg-white" />
            <div className="absolute right-6 top-4 size-5 rounded-full bg-white" />
            <div className="absolute left-1/2 top-6 h-8 w-16 -translate-x-1/2 rounded-md border-2 border-white/90">
              <span className="mt-2 block h-0.5 bg-white/90" />
              <span className="mt-1 block h-0.5 bg-white/90" />
            </div>
          </div>
          <div className="absolute bottom-3 left-6 size-8 rounded-full border-4 border-white bg-cars-navy" />
          <div className="absolute bottom-3 right-6 size-8 rounded-full border-4 border-white bg-cars-navy" />
        </div>
      </div>

      <h2 className="text-2xl font-black text-cars-navy">No live operational data</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">
        Connect riders, drivers, ride requests, and dispatch rules before showing operational data.
      </p>
      {canCreateRideRequest ? (
        <Button asChild className="mt-5" size="sm">
          <Link href="/ride-requests/new">
            Learn how it works
          </Link>
        </Button>
      ) : null}
    </div>
  );
}

function OperationTripList({
  trips,
  urgentExceptions,
  canViewDispatch,
}: Readonly<{
  trips: DashboardOverview["operationTrips"];
  urgentExceptions: number;
  canViewDispatch: boolean;
}>) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
        <div>
          <h2 className="text-lg font-black text-cars-navy">Today&apos;s first trips</h2>
          <p className="text-sm text-slate-600">Live operational records for the active organization.</p>
        </div>
        <Badge variant={urgentExceptions > 0 ? "destructive" : "secondary"}>
          {urgentExceptions} urgent exceptions
        </Badge>
      </div>
      <div className="divide-y">
        {trips.map((trip) => {
          const content = (
            <>
              <div className="font-black text-cars-navy">
                {formatTripTime(trip.scheduledPickupAt)}
              </div>
              <div>
                <p className="font-semibold text-slate-900">{trip.riderName}</p>
                <p className="text-sm text-slate-600">
                  {[trip.pickupCounty, trip.dropoffCounty].filter(Boolean).join(" to ") || "County details pending"}
                </p>
              </div>
              <div className="text-sm text-slate-600 sm:text-right">
                <p className="font-semibold text-slate-900">{formatStatus(trip.status)}</p>
                <p>{trip.driverName ?? "Unassigned"}</p>
              </div>
            </>
          );

          return canViewDispatch ? (
            <Link
              key={trip.id}
              href="/dispatch"
              className="grid gap-3 px-5 py-4 transition-colors hover:bg-blue-50 sm:grid-cols-[8rem_1fr_8rem]"
            >
              {content}
            </Link>
          ) : (
            <div key={trip.id} className="grid gap-3 px-5 py-4 sm:grid-cols-[8rem_1fr_8rem]">
              {content}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function formatTripTime(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(value);
}

function formatStatus(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}

function ServiceAreaGraphic() {
  return (
    <div className="relative h-36 overflow-hidden rounded-md border border-cars-navy/20 bg-cars-navy p-2 shadow-inner">
      <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_49%,rgba(255,255,255,0.25)_50%,transparent_51%),linear-gradient(0deg,transparent_49%,rgba(255,255,255,0.18)_50%,transparent_51%)] bg-[length:42px_42px]" />
      <div className="relative ml-auto grid h-full w-16 grid-rows-4 gap-1">
        {["Barton", "Jasper", "Newton", "McDonald"].map((county, index) => (
          <div
            key={county}
            className={
              index === 1
                ? "rounded-sm border border-white/30 bg-blue-700"
                : "rounded-sm border border-white/20 bg-cars-navy-dark"
            }
          />
        ))}
      </div>
      <div className="absolute right-5 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-cars-red text-[9px] font-black text-white shadow-lg">
        CARS
      </div>
      <Route className="absolute left-3 top-3 size-7 text-white/75" aria-hidden="true" />
    </div>
  );
}
