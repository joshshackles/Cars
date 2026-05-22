import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layouts/page-header";
import {
  RiderOverview,
  RiderRelatedActivity,
  RiderRides,
} from "@/components/riders/rider-profile-sections";
import { Button } from "@/components/ui/button";
import { requirePermission } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/auth/permissions";
import { getRiderProfile } from "@/lib/riders/rider-queries";
import { getSettingOptions } from "@/lib/settings/settings-service";

type RiderProfilePageProps = {
  params: Promise<{
    riderId: string;
  }>;
};

export default async function RiderProfilePage({ params }: RiderProfilePageProps) {
  const membership = await requirePermission("riders:view");
  const { riderId } = await params;
  const [rider, statuses, counties] = await Promise.all([
    getRiderProfile(membership.organizationId, riderId),
    getSettingOptions(membership.organizationId, "riderStatuses"),
    getSettingOptions(membership.organizationId, "countiesServed"),
  ]);

  if (!rider) {
    notFound();
  }

  const statusLabels = new Map(statuses.map((option) => [option.code, option.label]));
  const countyLabels = new Map(counties.map((option) => [option.code, option.label]));
  const canViewSensitiveNotes = hasPermission(membership, "riders:sensitive:view");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={rider.displayName}
        description="Rider profile, service history, communication, incidents, documents, and status history."
        actions={
          hasPermission(membership, "riders:manage") ? (
            <Button asChild size="sm">
              <Link href={`/riders/${rider.id}/edit`}>Edit rider</Link>
            </Button>
          ) : null
        }
      />
      <RiderOverview
        rider={rider}
        canViewSensitiveNotes={canViewSensitiveNotes}
        statusLabel={statusLabels.get(rider.status) ?? rider.status}
        countyLabel={countyLabels.get(rider.county ?? "") ?? rider.county ?? "Not set"}
      />
      <RiderRides rider={rider} />
      <RiderRelatedActivity rider={rider} />
    </div>
  );
}
