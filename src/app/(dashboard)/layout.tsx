import { DashboardShell } from "@/components/layouts/dashboard-shell";
import { requireAuthenticatedUser } from "@/lib/auth/guards";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await requireAuthenticatedUser();

  return <DashboardShell user={user}>{children}</DashboardShell>;
}
