import { EmptyState } from "@/components/layouts/empty-state";
import { PageHeader } from "@/components/layouts/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { SettingsNavCards } from "@/components/settings/settings-nav-cards";
import { SettingsSummaryCards } from "@/components/settings/settings-summary-cards";
import { SettingsTable } from "@/components/settings/settings-table";
import { requirePermission } from "@/lib/auth/guards";
import {
  getOrganizationSettings,
  validateOrganizationSettings,
} from "@/lib/settings/settings-service";

export default async function SettingsPage() {
  const membership = await requirePermission("settings:view");
  const [settings, issues] = await Promise.all([
    getOrganizationSettings(membership.organizationId),
    validateOrganizationSettings(membership.organizationId),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Settings"
        description={`Database-backed configuration for ${membership.organizationName}.`}
      />
      <SettingsSummaryCards settings={settings} issues={issues} />
      <SettingsNavCards membership={membership} />
      {settings.length > 0 ? (
        <SettingsTable settings={settings} />
      ) : (
        <Card>
          <CardContent className="pt-6">
            <EmptyState
              title="No settings found"
              description="Run the seed script to create organization-scoped settings."
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
