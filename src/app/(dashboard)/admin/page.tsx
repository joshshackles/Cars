import { AdminNavCards } from "@/components/admin/admin-nav-cards";
import { PageHeader } from "@/components/layouts/page-header";
import { Badge } from "@/components/ui/badge";
import { requirePermission } from "@/lib/auth/guards";
import { roleLabels } from "@/lib/auth/permissions";

export default async function AdminPage() {
  const membership = await requirePermission("admin:view");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Admin"
        description={`Manage users, roles, and memberships for ${membership.organizationName}.`}
        actions={<Badge variant="secondary">{roleLabels[membership.role]}</Badge>}
      />
      <AdminNavCards membership={membership} />
    </div>
  );
}
