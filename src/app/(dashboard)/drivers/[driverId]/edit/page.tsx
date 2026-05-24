import { notFound } from "next/navigation";
import { DriverForm } from "@/components/drivers/driver-form";
import { PageHeader } from "@/components/layouts/page-header";
import { requirePermission } from "@/lib/auth/guards";
import { getDriverProfile } from "@/lib/drivers/driver-queries";
import { getSettingOptions } from "@/lib/settings/settings-service";

type EditDriverPageProps = { params: Promise<{ driverId: string }> };

export default async function EditDriverPage({ params }: EditDriverPageProps) {
  const membership = await requirePermission("drivers:manage");
  const { driverId } = await params;
  const [driver, counties, rideTypes, statuses, onboardingStatuses, backgroundStatuses, reimbursementPreferences] = await Promise.all([
    getDriverProfile(membership.organizationId, driverId),
    getSettingOptions(membership.organizationId, "countiesServed"),
    getSettingOptions(membership.organizationId, "ridePurposes"),
    getSettingOptions(membership.organizationId, "driverStatuses"),
    getSettingOptions(membership.organizationId, "driverOnboardingStatuses"),
    getSettingOptions(membership.organizationId, "backgroundCheckStatuses"),
    getSettingOptions(membership.organizationId, "reimbursementPreferences"),
  ]);
  if (!driver) notFound();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={`Edit ${driver.displayName}`} description="Update driver details, documents, service area, preferences, and status." />
      <DriverForm driver={driver} counties={counties} rideTypes={rideTypes} statuses={statuses} onboardingStatuses={onboardingStatuses} backgroundStatuses={backgroundStatuses} reimbursementPreferences={reimbursementPreferences} />
    </div>
  );
}
