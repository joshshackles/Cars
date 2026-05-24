import { IncidentCreateForm } from "@/components/incidents/incident-create-form";
import { IncidentsTable } from "@/components/incidents/incidents-table";
import { EmptyState } from "@/components/layouts/empty-state";
import { PageHeader } from "@/components/layouts/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermission } from "@/lib/auth/guards";
import { getIncidentOptions, getIncidents } from "@/lib/incidents/incident-queries";

export default async function IncidentsPage() {
  const membership = await requirePermission("incidents:view");
  const [incidents, options] = await Promise.all([
    getIncidents(membership.organizationId),
    getIncidentOptions(membership.organizationId),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Incidents"
        description="Document safety, service, vehicle, and rider/driver issues with audit-ready status tracking."
      />
      <Card>
        <CardHeader>
          <CardTitle>Create incident</CardTitle>
        </CardHeader>
        <CardContent>
          <IncidentCreateForm options={options} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Incident queue</CardTitle>
        </CardHeader>
        <CardContent>
          {incidents.length > 0 ? (
            <IncidentsTable incidents={incidents} />
          ) : (
            <EmptyState
              title="No incidents"
              description="Incidents submitted by staff or drivers will appear here for review and resolution."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
