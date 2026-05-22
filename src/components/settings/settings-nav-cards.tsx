import Link from "next/link";
import { ClipboardCheck, History, Pencil, Settings } from "lucide-react";
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

const settingsSections = [
  {
    title: "View settings",
    description: "Review active organization settings grouped by category.",
    href: "/settings",
    permission: "settings:view" as const,
    icon: Settings,
  },
  {
    title: "Edit settings",
    description: "Update database-backed setting values with validation.",
    href: "/settings/edit",
    permission: "settings:manage" as const,
    icon: Pencil,
  },
  {
    title: "Validate settings",
    description: "Check required settings and value shapes before forms consume them.",
    href: "/settings/validate",
    permission: "settings:manage" as const,
    icon: ClipboardCheck,
  },
  {
    title: "Audit changes",
    description: "Review setting edits captured in the organization audit log.",
    href: "/settings/audit",
    permission: "settings:audit" as const,
    icon: History,
  },
];

export function SettingsNavCards({
  membership,
}: Readonly<{
  membership: MembershipContext;
}>) {
  return (
    <div className="grid gap-4 lg:grid-cols-4">
      {settingsSections
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
                <Link href={section.href}>Open</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
    </div>
  );
}
