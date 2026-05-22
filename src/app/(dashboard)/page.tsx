import { DashboardHome } from "@/components/features/dashboard-home";
import { requirePermission } from "@/lib/auth/guards";

export default async function DashboardPage() {
  await requirePermission("dashboard:view");

  return <DashboardHome />;
}
