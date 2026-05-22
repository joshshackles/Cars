import { Sidebar } from "@/components/layouts/sidebar";
import { TopBar } from "@/components/layouts/top-bar";
import type { SessionUser } from "@/lib/auth/session";

export function DashboardShell({
  user,
  children,
}: Readonly<{
  user: SessionUser;
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar user={user} />
      <div className="lg:pl-72">
        <TopBar user={user} />
        <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
