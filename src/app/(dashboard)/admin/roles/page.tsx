import { RoleCreateForm } from "@/components/admin/role-create-form";
import { RolesTable } from "@/components/admin/roles-table";
import { EmptyState } from "@/components/layouts/empty-state";
import { PageHeader } from "@/components/layouts/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getOrganizationRoles, getPermissions } from "@/lib/admin/queries";
import { requirePermission } from "@/lib/auth/guards";

export default async function AdminRolesPage() {
  const membership = await requirePermission("admin:roles:manage");
  const [roles, permissions] = await Promise.all([
    getOrganizationRoles(membership.organizationId),
    getPermissions(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Roles"
        description="Review role definitions and permission assignments for the active organization."
      />
      <Card>
        <CardHeader>
          <CardTitle>Create role</CardTitle>
        </CardHeader>
        <CardContent>
          <RoleCreateForm permissions={permissions} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Organization roles</CardTitle>
        </CardHeader>
        <CardContent>
          {roles.length > 0 ? (
            <RolesTable roles={roles} permissions={permissions} />
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
