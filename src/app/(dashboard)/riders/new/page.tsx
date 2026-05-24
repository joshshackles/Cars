import { RiderForm } from "@/components/riders/rider-form";
import { PageHeader } from "@/components/layouts/page-header";
import { requirePermission } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/auth/permissions";
import { getSettingOptions } from "@/lib/settings/settings-service";

export default async function NewRiderPage() {
  const membership = await requirePermission("riders:manage");
  const [counties, statuses] = await Promise.all([
    getSettingOptions(membership.organizationId, "countiesServed"),
    getSettingOptions(membership.organizationId, "riderStatuses"),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Create rider"
        description="Add a new rider intake record for the active organization."
      />
      <RiderForm
        counties={counties}
        statuses={statuses}
        canViewSensitiveNotes={hasPermission(membership, "riders:sensitive:view")}
      />
    </div>
  );
}
