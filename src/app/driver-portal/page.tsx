import { DriverManifest } from "@/components/driver-portal/driver-manifest";
import { DriverPortalShell } from "@/components/driver-portal/driver-portal-shell";
import { Card, CardContent } from "@/components/ui/card";
import { requireAuthenticatedUser, requirePermission } from "@/lib/auth/guards";
import {
  getCurrentPortalDriver,
  getDayRange,
  getDriverManifest,
} from "@/lib/driver-portal/driver-portal-queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function DriverPortalPage() {
  const user = await requireAuthenticatedUser();
  const membership = await requirePermission("driver_portal:view");
  const driver = await getCurrentPortalDriver(membership.organizationId, user);

  if (!driver) {
    return (
      <DriverPortalShell driverName={user.name}>
        <Card className="border-white/10 bg-white text-slate-950">
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold">Driver profile not linked</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Your user account needs to be connected to a driver profile before assigned rides can appear here.
            </p>
          </CardContent>
        </Card>
      </DriverPortalShell>
    );
  }

  const range = getDayRange();
  const assignments = await getDriverManifest(membership.organizationId, driver.id, range);

  return (
    <DriverPortalShell driverName={`${driver.firstName} ${driver.lastName}`}>
      <DriverManifest date={range.start} assignments={assignments} />
    </DriverPortalShell>
  );
}
