import Link from "next/link";
import { notFound } from "next/navigation";
import { DriverAvailabilityPanel, DriverMileageAndReimbursements, DriverOverview, DriverRelatedActivity, DriverTrips } from "@/components/drivers/driver-profile-sections";
import { PageHeader } from "@/components/layouts/page-header";
import { Button } from "@/components/ui/button";
import { requirePermission } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/auth/permissions";
import { getDriverProfile } from "@/lib/drivers/driver-queries";
import { getSettingOptions } from "@/lib/settings/settings-service";

type DriverProfilePageProps = { params: Promise<{ driverId: string }> };

export default async function DriverProfilePage({ params }: DriverProfilePageProps) {
  const membership = await requirePermission("drivers:view");
  const { driverId } = await params;
  const [driver, counties, rideTypes, statuses, onboarding, background, reimbursement] = await Promise.all([
    getDriverProfile(membership.organizationId, driverId),
    getSettingOptions(membership.organizationId, "countiesServed"),
    getSettingOptions(membership.organizationId, "ridePurposes"),
    getSettingOptions(membership.organizationId, "driverStatuses"),
    getSettingOptions(membership.organizationId, "driverOnboardingStatuses"),
    getSettingOptions(membership.organizationId, "backgroundCheckStatuses"),
    getSettingOptions(membership.organizationId, "reimbursementPreferences"),
  ]);
  if (!driver) notFound();

  const labels = {
    counties: new Map(counties.map((option) => [option.code, option.label])),
    rideTypes: new Map(rideTypes.map((option) => [option.code, option.label])),
    statuses: new Map(statuses.map((option) => [option.code, option.label])),
    onboarding: new Map(onboarding.map((option) => [option.code, option.label])),
    background: new Map(background.map((option) => [option.code, option.label])),
    reimbursement: new Map(reimbursement.map((option) => [option.code, option.label])),
  };
  const canManage = hasPermission(membership, "drivers:manage");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={driver.displayName} description="Driver profile, assignments, mileage, reimbursements, incidents, documents, and availability." actions={canManage ? <Button asChild size="sm"><Link href={`/drivers/${driver.id}/edit`}>Edit driver</Link></Button> : null} />
      <DriverOverview driver={driver} labels={labels} />
      <DriverAvailabilityPanel driver={driver} counties={counties} canManage={canManage} />
      <DriverTrips driver={driver} />
      <DriverMileageAndReimbursements driver={driver} />
      <DriverRelatedActivity driver={driver} />
    </div>
  );
}
