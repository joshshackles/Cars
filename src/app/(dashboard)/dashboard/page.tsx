import { DashboardHome } from "@/components/features/dashboard-home";
import { requirePermission } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/auth/permissions";
import { getDashboardOverview } from "@/lib/dashboard/dashboard-queries";

export default async function DashboardPage() {
  const membership = await requirePermission("dashboard:view");
  const overview = await getDashboardOverview(membership.organizationId);

  return (
    <DashboardHome
      overview={overview}
      permissions={{
        canCreateRideRequest: hasPermission(membership, "ride_requests:manage"),
        canViewDispatch: hasPermission(membership, "dispatch:view"),
        canViewIncidents: hasPermission(membership, "incidents:view"),
        canViewRideRequests: hasPermission(membership, "ride_requests:view"),
      }}
    />
  );
}
