import { MembershipCreateForm } from "@/components/admin/membership-create-form";
import { MembershipsTable } from "@/components/admin/memberships-table";
import { EmptyState } from "@/components/layouts/empty-state";
import { PageHeader } from "@/components/layouts/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getOrganizationMemberships, getOrganizationRoles } from "@/lib/admin/queries";
import { requirePermission } from "@/lib/auth/guards";

export default async function AdminMembershipsPage() {
  const membership = await requirePermission("admin:memberships:manage");
  const [memberships, roles] = await Promise.all([
    getOrganizationMemberships(membership.organizationId),
    getOrganizationRoles(membership.organizationId),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Memberships"
        description="Manage which users belong to the active organization and which role they hold."
      />
      <Card>
        <CardHeader>
          <CardTitle>Add membership</CardTitle>
        </CardHeader>
        <CardContent>
          <MembershipCreateForm roles={roles} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Organization memberships</CardTitle>
        </CardHeader>
        <CardContent>
          {memberships.length > 0 ? (
            <MembershipsTable memberships={memberships} roles={roles} />
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
