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
              "flex min-h-12 items-center gap-4 rounded-lg px-4 py-3 text-base font-semibold text-white/90 transition-colors hover:bg-white/10 hover:text-white [&_svg]:size-6 [&_svg]:shrink-0",
              isActive && "bg-cars-red text-white shadow-[0_10px_24px_rgba(227,6,19,0.28)]"
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
