import { EmptyState } from "@/components/layouts/empty-state";
import { PageHeader } from "@/components/layouts/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SettingsNavCards } from "@/components/settings/settings-nav-cards";
import { SettingsTable } from "@/components/settings/settings-table";
import { requirePermission } from "@/lib/auth/guards";
import { getOrganizationSettings } from "@/lib/settings/settings-service";

export default async function SettingsPage() {
  const membership = await requirePermission("settings:view");
  const settings = await getOrganizationSettings(membership.organizationId);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Settings"
        description={`Database-backed configuration for ${membership.organizationName}.`}
      />
      <SettingsNavCards membership={membership} />
      <Card>
        <CardHeader>
          <CardTitle>Organization settings</CardTitle>
        </CardHeader>
        <CardContent>
          {settings.length > 0 ? (
            <SettingsTable settings={settings} />
          ) : (
            <EmptyState
              title="No settings found"
              description="Run the seed script to create organization-scoped settings."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
