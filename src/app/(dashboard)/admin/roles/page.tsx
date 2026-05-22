import { RolesTable } from "@/components/admin/roles-table";
import { EmptyState } from "@/components/layouts/empty-state";
import { PageHeader } from "@/components/layouts/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getOrganizationRoles } from "@/lib/admin/queries";
import { requirePermission } from "@/lib/auth/guards";

export default async function AdminRolesPage() {
  const membership = await requirePermission("admin:roles:manage");
  const roles = await getOrganizationRoles(membership.organizationId);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Roles"
        description="Review role definitions and permission assignments for the active organization."
        actions={
          <Button variant="outline" size="sm" disabled>
            Create role
          </Button>
        }
      />
      <Card>
        <CardHeader>
          <CardTitle>Organization roles</CardTitle>
        </CardHeader>
        <CardContent>
          {roles.length > 0 ? (
            <RolesTable roles={roles} />
          ) : (
            <EmptyState
              title="No roles found"
              description="Seed the database to create the default CARS Dispatch roles."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
