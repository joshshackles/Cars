import { UserCreateForm } from "@/components/admin/user-create-form";
import { UsersTable } from "@/components/admin/users-table";
import { EmptyState } from "@/components/layouts/empty-state";
import { PageHeader } from "@/components/layouts/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getOrganizationRoles, getOrganizationUsers } from "@/lib/admin/queries";
import { requirePermission } from "@/lib/auth/guards";

export default async function AdminUsersPage() {
  const membership = await requirePermission("admin:users:manage");
  const [users, roles] = await Promise.all([
    getOrganizationUsers(membership.organizationId),
    getOrganizationRoles(membership.organizationId),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Users"
        description={`View and add users in ${membership.organizationName}. Invitations can connect to this flow later.`}
      />
      <Card>
        <CardHeader>
          <CardTitle>Add user</CardTitle>
        </CardHeader>
        <CardContent>
          <UserCreateForm roles={roles} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Organization users</CardTitle>
        </CardHeader>
        <CardContent>
          {users.length > 0 ? (
            <UsersTable users={users} />
          ) : (
            <EmptyState
              title="No users found"
              description="Seed the database or invite users when the invitation flow is implemented."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
