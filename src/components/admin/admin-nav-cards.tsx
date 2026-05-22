import Link from "next/link";
import { Settings, Shield, UserCog, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { hasPermission } from "@/lib/auth/permissions";
import type { MembershipContext } from "@/types/auth";

const adminSections = [
  {
    title: "Users",
    description: "View organization users and prepare invitation workflows.",
    href: "/admin/users",
    permission: "admin:users:manage" as const,
    icon: Users,
  },
  {
    title: "Roles",
    description: "Review roles and the permissions assigned to each role.",
    href: "/admin/roles",
    permission: "admin:roles:manage" as const,
    icon: Shield,
  },
  {
    title: "Memberships",
    description: "Manage the relationship between users, organizations, and roles.",
    href: "/admin/memberships",
    permission: "admin:memberships:manage" as const,
    icon: UserCog,
  },
  {
    title: "Settings",
    description: "View, edit, validate, and audit organization configuration.",
    href: "/settings",
    permission: "settings:view" as const,
    icon: Settings,
  },
];

export function AdminNavCards({
  membership,
}: Readonly<{
  membership: MembershipContext;
}>) {
  return (
    <div className="grid gap-4 lg:grid-cols-4">
      {adminSections
        .filter((section) => hasPermission(membership, section.permission))
        .map((section) => (
          <Card key={section.href}>
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <CardTitle>{section.title}</CardTitle>
                <section.icon className="size-5 text-muted-foreground" aria-hidden="true" />
              </div>
              <CardDescription>{section.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" size="sm">
                <Link href={section.href}>Open {section.title.toLowerCase()}</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
    </div>
  );
}
