import { Mail, ShieldCheck, UserRound } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/layouts/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAuthenticatedUser } from "@/lib/auth/guards";
import { roleLabels } from "@/lib/auth/permissions";

export default async function UserSettingsPage() {
  const user = await requireAuthenticatedUser();
  const membership = user.activeMembership;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="User settings"
        description="Review your account, role, organization, and workspace access."
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Account</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <InfoTile icon={UserRound} label="Name" value={user.name} />
            <InfoTile icon={Mail} label="Email" value={user.email} />
            <InfoTile
              icon={ShieldCheck}
              label="Role"
              value={roleLabels[membership.role]}
              badge={membership.role}
            />
            <InfoTile label="Organization" value={membership.organizationName} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Access</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              Your navigation and page access are controlled by this membership role.
            </p>
            <div className="flex flex-wrap gap-2">
              {membership.permissions.slice(0, 8).map((permission) => (
                <Badge key={permission} variant="secondary">
                  {permission}
                </Badge>
              ))}
              {membership.permissions.length > 8 ? (
                <Badge variant="outline">+{membership.permissions.length - 8} more</Badge>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function InfoTile({
  icon: Icon,
  label,
  value,
  badge,
}: Readonly<{
  icon?: LucideIcon;
  label: string;
  value: string;
  badge?: string;
}>) {
  return (
    <div className="rounded-md border bg-background p-4">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        {Icon ? <Icon className="size-4" aria-hidden="true" /> : null}
        {label}
      </div>
      <p className="mt-2 break-words text-base font-semibold text-cars-navy">{value}</p>
      {badge ? (
        <Badge className="mt-3" variant="outline">
          {badge}
        </Badge>
      ) : null}
    </div>
  );
}
