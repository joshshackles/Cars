import { SettingsEditList } from "@/components/settings/settings-edit-list";
import { EmptyState } from "@/components/layouts/empty-state";
import { PageHeader } from "@/components/layouts/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { requirePermission } from "@/lib/auth/guards";
import { getOrganizationSettings } from "@/lib/settings/settings-service";

export default async function SettingsEditPage() {
  const membership = await requirePermission("settings:manage");
  const settings = await getOrganizationSettings(membership.organizationId);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Edit settings"
        description="Edit organization-scoped JSON setting values. Saved changes are validated and audited."
      />
      {settings.length > 0 ? (
        <SettingsEditList settings={settings} />
      ) : (
        <Card>
          <CardContent className="pt-6">
            <EmptyState
              title="No settings found"
              description="Run the seed script before editing organization settings."
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
