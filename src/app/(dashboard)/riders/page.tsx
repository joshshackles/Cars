import Link from "next/link";
import { EmptyState } from "@/components/layouts/empty-state";
import { PageHeader } from "@/components/layouts/page-header";
import { PaginationControls } from "@/components/riders/pagination-controls";
import { RiderFilters } from "@/components/riders/rider-filters";
import { RidersTable } from "@/components/riders/riders-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermission } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/auth/permissions";
import { getRiders } from "@/lib/riders/rider-queries";
import { getSettingOptions } from "@/lib/settings/settings-service";

type RidersPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function RidersPage({ searchParams }: RidersPageProps) {
  const membership = await requirePermission("riders:view");
  const params = (await searchParams) ?? {};
  const search = getParam(params.search);
  const status = getParam(params.status);
  const county = getParam(params.county);
  const page = Math.max(1, Number(getParam(params.page) ?? "1"));
  const [statuses, counties, riders] = await Promise.all([
    getSettingOptions(membership.organizationId, "riderStatuses"),
    getSettingOptions(membership.organizationId, "countiesServed"),
    getRiders({
      organizationId: membership.organizationId,
      search,
      status,
      county,
      page,
      pageSize: 10,
    }),
  ]);
  const statusLabels = new Map(statuses.map((option) => [option.code, option.label]));
  const countyLabels = new Map(counties.map((option) => [option.code, option.label]));
  const baseParams = new URLSearchParams();

  for (const [key, value] of Object.entries({ search, status, county })) {
    if (value) {
      baseParams.set(key, value);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Riders"
        description="Search, filter, and manage rider intake records for the active organization."
        actions={
          hasPermission(membership, "riders:manage") ? (
            <Button asChild size="sm">
              <Link href="/riders/new">Create rider</Link>
            </Button>
          ) : null
        }
      />
      <RiderFilters
        search={search}
        status={status}
        county={county}
        statuses={statuses}
        counties={counties}
      />
      <Card>
        <CardHeader>
          <CardTitle>Rider directory</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {riders.items.length > 0 ? (
            <>
              <RidersTable
                riders={riders.items}
                statusLabels={statusLabels}
                countyLabels={countyLabels}
              />
              <PaginationControls page={riders.page} pageCount={riders.pageCount} baseParams={baseParams} />
            </>
          ) : (
            <EmptyState
              title="No riders found"
              description="Adjust the search filters or create a new rider intake record."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function getParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
