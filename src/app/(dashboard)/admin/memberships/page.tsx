import { MembershipsTable } from "@/components/admin/memberships-table";
import { EmptyState } from "@/components/layouts/empty-state";
import { PageHeader } from "@/components/layouts/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getOrganizationMemberships } from "@/lib/admin/queries";
import { requirePermission } from "@/lib/auth/guards";

export default async function AdminMembershipsPage() {
  const membership = await requirePermission("admin:memberships:manage");
  const memberships = await getOrganizationMemberships(membership.organizationId);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Memberships"
        description="Manage which users belong to the active organization and which role they hold."
        actions={
          <Button variant="outline" size="sm" disabled>
            Add membership
          </Button>
        }
      />
      <Card>
        <CardHeader>
          <CardTitle>Organization memberships</CardTitle>
        </CardHeader>
        <CardContent>
          {memberships.length > 0 ? (
            <MembershipsTable memberships={memberships} />
          ) : (
            <EmptyState
              title="No memberships found"
              description="Seed the database to create test memberships for Economic Security Corporation."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
