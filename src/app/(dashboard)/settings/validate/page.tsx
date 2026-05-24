import { PageHeader } from "@/components/layouts/page-header";
import { SettingsSummaryCards } from "@/components/settings/settings-summary-cards";
import { SettingsValidationTable } from "@/components/settings/settings-validation-table";
import { requirePermission } from "@/lib/auth/guards";
import {
  getOrganizationSettings,
  validateOrganizationSettings,
} from "@/lib/settings/settings-service";

export default async function SettingsValidatePage() {
  const membership = await requirePermission("settings:manage");
  const [settings, issues] = await Promise.all([
    getOrganizationSettings(membership.organizationId),
    validateOrganizationSettings(membership.organizationId),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Validate settings"
        description="Check that required organization settings exist and match the value shapes forms expect."
      />
      <SettingsSummaryCards settings={settings} issues={issues} />
      <SettingsValidationTable issues={issues} />
    </div>
  );
}
