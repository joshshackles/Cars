import { Search } from "lucide-react";
import { MobileSidebar } from "@/components/layouts/mobile-sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { SessionUser } from "@/lib/auth/session";

export function TopBar({
  user,
}: Readonly<{
  user: SessionUser;
}>) {
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur sm:px-6 lg:px-8">
      <div className="flex items-center gap-3">
        <MobileSidebar membership={user.activeMembership} />
        <div className="hidden items-center gap-2 rounded-md border bg-card px-3 py-2 text-sm text-muted-foreground md:flex">
          <Search className="size-4" aria-hidden="true" />
          <span>Search placeholder</span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm">
          New request
        </Button>
        <Avatar className="size-9">
          <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
