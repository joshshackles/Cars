import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layouts/page-header";
import { RiderForm } from "@/components/riders/rider-form";
import { requirePermission } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/auth/permissions";
import { getRiderProfile } from "@/lib/riders/rider-queries";
import { getSettingOptions } from "@/lib/settings/settings-service";

type EditRiderPageProps = {
  params: Promise<{
    riderId: string;
  }>;
};

export default async function EditRiderPage({ params }: EditRiderPageProps) {
  const membership = await requirePermission("riders:manage");
  const { riderId } = await params;
  const [rider, counties, statuses] = await Promise.all([
    getRiderProfile(membership.organizationId, riderId),
    getSettingOptions(membership.organizationId, "countiesServed"),
    getSettingOptions(membership.organizationId, "riderStatuses"),
  ]);

  if (!rider) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`Edit ${rider.displayName}`}
        description="Update rider intake, eligibility, communication, notes, and operational details."
      />
      <RiderForm
        rider={rider}
        counties={counties}
        statuses={statuses}
        canViewSensitiveNotes={hasPermission(membership, "riders:sensitive:view")}
      />
    </div>
  );
}
