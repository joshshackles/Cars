import { PlaceholderPage } from "@/components/layouts/placeholder-page";
import { requirePermission } from "@/lib/auth/guards";

export default async function IncidentsPage() {
  await requirePermission("incidents:view");

  return (
    <PlaceholderPage
      title="Incidents"
      description="Prepare incident documentation, review, and escalation surfaces."
      emptyTitle="No incident workflow yet"
      emptyDescription="Incident handling will be added with the correct operational and compliance process."
    />
  );
}
