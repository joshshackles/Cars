"use client";

import { Menu } from "lucide-react";
import { CarsLogo } from "@/components/brand/cars-logo";
import { RoleAwareNav } from "@/components/layouts/role-aware-nav";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { MembershipContext } from "@/types/auth";

export function MobileSidebar({
  membership,
}: Readonly<{
  membership: MembershipContext;
}>) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="lg:hidden" aria-label="Open navigation">
          <Menu aria-hidden="true" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-80 border-cars-navy-dark bg-cars-navy p-0 text-white">
        <SheetHeader className="border-b border-white/10 px-5 py-4 text-left">
          <SheetTitle>
            <CarsLogo />
          </SheetTitle>
        </SheetHeader>
        <div className="px-4 py-5">
          <RoleAwareNav membership={membership} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
