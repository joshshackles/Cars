import { PageHeader } from "@/components/layouts/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SettingsValidationTable } from "@/components/settings/settings-validation-table";
import { requirePermission } from "@/lib/auth/guards";
import { validateOrganizationSettings } from "@/lib/settings/settings-service";

export default async function SettingsValidatePage() {
  const membership = await requirePermission("settings:manage");
  const issues = await validateOrganizationSettings(membership.organizationId);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Validate settings"
        description="Check that required organization settings exist and match the value shapes forms expect."
      />
      <Card>
        <CardHeader>
          <CardTitle>Validation results</CardTitle>
        </CardHeader>
        <CardContent>
          <SettingsValidationTable issues={issues} />
        </CardContent>
      </Card>
    </div>
  );
}
