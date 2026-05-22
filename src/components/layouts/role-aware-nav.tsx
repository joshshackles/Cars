"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navigationItems } from "@/config/navigation";
import { hasPermission } from "@/lib/auth/permissions";
import { cn } from "@/lib/utils";
import type { MembershipContext } from "@/types/auth";

export function RoleAwareNav({
  membership,
}: Readonly<{
  membership: MembershipContext;
}>) {
  const pathname = usePathname();
  const visibleItems = navigationItems.filter((item) =>
    hasPermission(membership, item.permission)
  );

  return (
    <nav className="flex flex-col gap-1" aria-label="Primary">
      {visibleItems.map((item) => {
        const isActive =
          item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground [&_svg]:size-4 [&_svg]:shrink-0",
              isActive && "bg-secondary text-foreground"
            )}
          >
            <item.icon aria-hidden="true" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
