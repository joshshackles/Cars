import Link from "next/link";
import { RoleAwareNav } from "@/components/layouts/role-aware-nav";
import { Badge } from "@/components/ui/badge";
import { roleLabels } from "@/lib/auth/permissions";
import type { SessionUser } from "@/lib/auth/session";

export function Sidebar({
  user,
}: Readonly<{
  user: SessionUser;
}>) {
  return (
    <aside className="fixed inset-y-0 left-0 hidden w-72 border-r bg-card lg:flex lg:flex-col">
      <div className="flex h-16 items-center gap-3 border-b px-6">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-md bg-primary text-sm font-semibold text-primary-foreground">
            CD
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold">CARS Dispatch</span>
            <span className="text-xs text-muted-foreground">Volunteer operations</span>
          </div>
        </Link>
      </div>
      <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-4 py-5">
        <RoleAwareNav membership={user.activeMembership} />
      </div>
      <div className="border-t p-4">
        <Badge variant="outline">{roleLabels[user.activeMembership.role]}</Badge>
      </div>
    </aside>
  );
}
