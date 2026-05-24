import Link from "next/link";
import { Building2, ChevronDown, PanelLeftClose, PanelLeftOpen } from "lucide-react";
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
    <aside className="dashboard-sidebar fixed inset-y-0 left-0 z-30 hidden border-r border-cars-navy-dark bg-cars-navy lg:flex lg:flex-col">
      <div className="flex h-28 items-center justify-between gap-3 border-b border-white/10 px-5">
        <Link href="/dashboard" className="sidebar-logo flex min-w-0 items-center gap-3">
          <CarsLogo className="min-w-0" />
        </Link>
        <label
          htmlFor="sidebar-cabinet-toggle"
          className="sidebar-toggle-button inline-flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-md border border-white/20 text-white transition-colors hover:bg-white/10"
          aria-label="Open or close navigation cabinet"
          title="Open or close navigation cabinet"
        >
          <PanelLeftClose className="sidebar-collapse-icon size-5" aria-hidden="true" />
          <PanelLeftOpen className="sidebar-expand-icon hidden size-5" aria-hidden="true" />
        </label>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden px-4 py-4">
        <RoleAwareNav membership={user.activeMembership} />
      </div>
      <div className="p-4">
        <div className="sidebar-org-card flex items-center gap-3 rounded-lg border border-cars-red bg-cars-navy-dark/55 p-3 text-white">
          <Building2 className="size-7 shrink-0" aria-hidden="true" />
          <div className="sidebar-expanded-only min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{user.activeMembership.organizationName}</p>
            <Badge variant="outline" className="mt-1 border-transparent px-0 text-xs text-white/75">
              {roleLabels[user.activeMembership.role]}
            </Badge>
          </div>
          <ChevronDown className="sidebar-expanded-only size-4 text-white/75" aria-hidden="true" />
        </div>
      </div>
    </aside>
  );
}
