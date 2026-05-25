import Link from "next/link";
import { Bell, ChevronDown, Phone, Search, Settings, UserRound } from "lucide-react";
import { signOutAction } from "@/actions/auth-actions";
import { HistoryBackButton } from "@/components/layouts/history-back-button";
import { MobileSidebar } from "@/components/layouts/mobile-sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { hasPermission } from "@/lib/auth/permissions";
import type { SessionUser } from "@/lib/auth/session";
import type { getNotificationSummary } from "@/lib/notifications/notification-queries";

export function TopBar({
  user,
  notificationSummary,
}: Readonly<{
  user: SessionUser;
  notificationSummary: Awaited<ReturnType<typeof getNotificationSummary>> | null;
}>) {
  const canSearchRiders = hasPermission(user.activeMembership, "riders:view");
  const canCreateRideRequest = hasPermission(user.activeMembership, "ride_requests:manage");
  const canViewIncidents = hasPermission(user.activeMembership, "incidents:view");
  const canViewSettings = hasPermission(user.activeMembership, "settings:view");

  return (
    <header className="sticky top-0 z-20 flex min-h-20 items-center justify-between border-b-4 border-cars-navy bg-cars-red px-4 text-white shadow-md sm:px-6 lg:px-8">
      <div className="flex flex-1 items-center gap-3">
        <MobileSidebar membership={user.activeMembership} />
        <HistoryBackButton />
        {canSearchRiders ? (
          <form action="/riders" className="hidden h-12 w-full max-w-lg items-center gap-3 rounded-md bg-white px-4 text-sm text-slate-500 shadow-sm md:flex">
            <label htmlFor="global-rider-search" className="sr-only">Search riders</label>
            <input
              id="global-rider-search"
              name="search"
              type="search"
              placeholder="Search riders..."
              className="min-w-0 flex-1 bg-transparent text-slate-900 outline-none placeholder:text-slate-500"
            />
            <button type="submit" aria-label="Search riders" className="text-cars-navy">
              <Search className="size-5" aria-hidden="true" />
            </button>
          </form>
        ) : null}
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden items-center gap-3 text-lg font-black lg:flex">
          <span className="font-serif italic text-white">Need A Ride?</span>
          <span>CALL CARS!</span>
          <Phone className="size-6" aria-hidden="true" />
          <span className="text-2xl">417-438-2925</span>
        </div>
        {canCreateRideRequest ? (
          <Button asChild variant="secondary" size="sm" className="hidden lg:inline-flex">
            <Link href="/ride-requests/new">New request</Link>
          </Button>
        ) : null}
        {canViewIncidents ? (
          <Button asChild variant="ghost" size="icon" className="relative hidden text-white hover:bg-white/10 hover:text-white sm:inline-flex" aria-label="Open notifications">
            <Link href="/notifications">
              <Bell className="size-5" aria-hidden="true" />
              {notificationSummary && notificationSummary.total > 0 ? (
                <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-white text-xs font-bold text-cars-red">
                  {notificationSummary.total > 9 ? "9+" : notificationSummary.total}
                </span>
              ) : null}
            </Link>
          </Button>
        ) : null}
        <details className="group relative">
          <summary className="flex cursor-pointer list-none items-center gap-2 rounded-full border border-white/30 bg-cars-navy/30 p-1 pr-3 transition-colors hover:bg-cars-navy/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
            <Avatar className="size-10 border-2 border-white bg-cars-navy">
              <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
            </Avatar>
            <ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden="true" />
            <span className="sr-only">Open user menu</span>
          </summary>
          <div className="absolute right-0 mt-3 w-72 overflow-hidden rounded-lg border bg-white text-slate-950 shadow-xl">
            <div className="border-b p-4">
              <p className="font-semibold">{user.name}</p>
              <p className="truncate text-sm text-muted-foreground">{user.email}</p>
              <p className="mt-2 text-xs font-medium uppercase tracking-wide text-cars-navy">
                {user.activeMembership.organizationName}
              </p>
            </div>
            <div className="flex flex-col p-2">
              <Link
                href="/user-settings"
                className="flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-medium hover:bg-secondary"
              >
                <UserRound className="size-4 text-cars-navy" aria-hidden="true" />
                User settings
              </Link>
              {canViewSettings ? (
                <Link
                  href="/settings"
                  className="flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-medium hover:bg-secondary"
                >
                  <Settings className="size-4 text-cars-navy" aria-hidden="true" />
                  Organization settings
                </Link>
              ) : null}
              <form action={signOutAction}>
                <button
                  type="submit"
                  className="flex min-h-11 w-full items-center rounded-md px-3 text-left text-sm font-medium text-cars-red hover:bg-red-50"
                >
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </details>
      </div>
    </header>
  );
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
