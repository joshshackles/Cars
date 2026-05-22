import { UsersTable } from "@/components/admin/users-table";
import { EmptyState } from "@/components/layouts/empty-state";
import { PageHeader } from "@/components/layouts/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getOrganizationUsers } from "@/lib/admin/queries";
import { requirePermission } from "@/lib/auth/guards";

export default async function AdminUsersPage() {
  const membership = await requirePermission("admin:users:manage");
  const users = await getOrganizationUsers(membership.organizationId);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Users"
        description={`View users in ${membership.organizationName}. Invitation workflows can connect here later.`}
        actions={
          <Button variant="outline" size="sm" disabled>
            Invite user
          </Button>
        }
      />
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
