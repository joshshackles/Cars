import Link from "next/link";
import { Building2, ChevronDown } from "lucide-react";
import { CarsLogo } from "@/components/brand/cars-logo";
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
    <aside className="fixed inset-y-0 left-0 hidden w-80 border-r border-cars-navy-dark bg-cars-navy lg:flex lg:flex-col">
      <div className="flex h-32 items-center border-b border-white/10 px-6">
        <Link href="/dashboard" className="flex items-center gap-3">
          <CarsLogo />
        </Link>
      </div>
      <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-4 py-5">
        <RoleAwareNav membership={user.activeMembership} />
      </div>
      <div className="p-5">
        <div className="flex items-center gap-3 rounded-lg border border-cars-red bg-cars-navy-dark/55 p-4 text-white">
          <Building2 className="size-7 shrink-0" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{user.activeMembership.organizationName}</p>
            <Badge variant="outline" className="mt-1 border-transparent px-0 text-xs text-white/75">
              {roleLabels[user.activeMembership.role]}
            </Badge>
          </div>
          <ChevronDown className="size-4 text-white/75" aria-hidden="true" />
        </div>
      </div>
    </aside>
  );
}
