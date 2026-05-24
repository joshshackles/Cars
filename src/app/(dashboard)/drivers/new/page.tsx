import { DriverForm } from "@/components/drivers/driver-form";
import { PageHeader } from "@/components/layouts/page-header";
import { requirePermission } from "@/lib/auth/guards";
import { getSettingOptions } from "@/lib/settings/settings-service";

export default async function NewDriverPage() {
  const membership = await requirePermission("drivers:manage");
  const [counties, rideTypes, statuses, onboardingStatuses, backgroundStatuses, reimbursementPreferences] = await Promise.all([
    getSettingOptions(membership.organizationId, "countiesServed"),
    getSettingOptions(membership.organizationId, "ridePurposes"),
    getSettingOptions(membership.organizationId, "driverStatuses"),
    getSettingOptions(membership.organizationId, "driverOnboardingStatuses"),
    getSettingOptions(membership.organizationId, "backgroundCheckStatuses"),
    getSettingOptions(membership.organizationId, "reimbursementPreferences"),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Create driver" description="Add a volunteer driver profile, verification details, and service preferences." />
      <DriverForm counties={counties} rideTypes={rideTypes} statuses={statuses} onboardingStatuses={onboardingStatuses} backgroundStatuses={backgroundStatuses} reimbursementPreferences={reimbursementPreferences} />
    </div>
  );
}
