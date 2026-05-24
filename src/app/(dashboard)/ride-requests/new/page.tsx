import { PageHeader } from "@/components/layouts/page-header";
import { RideRequestIntakeForm } from "@/components/ride-requests/ride-request-intake-form";
import { requirePermission } from "@/lib/auth/guards";
import { getRideRequestIntakeOptions } from "@/lib/ride-requests/ride-request-queries";
import { getSettingOptions } from "@/lib/settings/settings-service";

export default async function NewRideRequestPage() {
  const membership = await requirePermission("ride_requests:manage");
  const [{ riders, fundingSources }, counties, ridePurposes] = await Promise.all([
    getRideRequestIntakeOptions(membership.organizationId),
    getSettingOptions(membership.organizationId, "countiesServed"),
    getSettingOptions(membership.organizationId, "ridePurposes"),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Ride request intake"
        description="Capture request details, create a rider when needed, and generate trip legs automatically."
      />
      <RideRequestIntakeForm
        riders={riders}
        counties={counties}
        ridePurposes={ridePurposes}
        fundingSources={fundingSources}
      />
    </div>
  );
}
