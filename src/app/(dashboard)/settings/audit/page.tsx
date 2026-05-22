import { EmptyState } from "@/components/layouts/empty-state";
import { PageHeader } from "@/components/layouts/page-header";
import { SettingsAuditTable } from "@/components/settings/settings-audit-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermission } from "@/lib/auth/guards";
import { getSettingAuditLogs } from "@/lib/settings/settings-service";

export default async function SettingsAuditPage() {
  const membership = await requirePermission("settings:audit");
  const logs = await getSettingAuditLogs(membership.organizationId);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Settings audit"
        description="Review audited setting changes for the active organization."
      />
      <Card>
        <CardHeader>
          <CardTitle>Recent setting changes</CardTitle>
        </CardHeader>
        <CardContent>
          {logs.length > 0 ? (
            <SettingsAuditTable logs={logs} />
          ) : (
            <EmptyState
              title="No setting changes yet"
              description="Setting updates will appear here after administrators save changes."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
