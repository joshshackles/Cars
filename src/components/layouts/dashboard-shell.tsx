import { Sidebar } from "@/components/layouts/sidebar";
import { TopBar } from "@/components/layouts/top-bar";
import type { SessionUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { getNotificationSummary } from "@/lib/notifications/notification-queries";

export async function DashboardShell({
  user,
  children,
}: Readonly<{
  user: SessionUser;
  children: React.ReactNode;
}>) {
  const notificationSummary = hasPermission(user.activeMembership, "incidents:view")
    ? await getNotificationSummary(user.activeMembership.organizationId)
    : null;

  return (
    <div className="min-h-screen bg-[#f7fbff]">
      <Sidebar user={user} />
      <div className="lg:pl-80">
        <TopBar user={user} notificationSummary={notificationSummary} />
        <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
        <footer className="mx-auto flex w-full max-w-7xl flex-col gap-2 px-4 pb-6 text-xs text-muted-foreground sm:px-6 md:flex-row md:items-center md:gap-8 lg:px-8">
          <span>CARS Dispatch is a program of Economic Security Corporation</span>
          <span className="hidden h-4 w-px bg-border md:block" />
          <span>Community Action Ride System</span>
          <span className="hidden h-4 w-px bg-border md:block" />
          <span>Serving Barton, Jasper, Newton, and McDonald Counties</span>
        </footer>
      </div>
    </div>
  );
}
