import Link from "next/link";
import { DriverFilters } from "@/components/drivers/driver-filters";
import { DriversTable } from "@/components/drivers/drivers-table";
import { EmptyState } from "@/components/layouts/empty-state";
import { PageHeader } from "@/components/layouts/page-header";
import { PaginationControls } from "@/components/riders/pagination-controls";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermission } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/auth/permissions";
import { getDrivers } from "@/lib/drivers/driver-queries";
import { getSettingOptions } from "@/lib/settings/settings-service";

type DriversPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function DriversPage({ searchParams }: DriversPageProps) {
  const membership = await requirePermission("drivers:view");
  const params = (await searchParams) ?? {};
  const activeOnly = getParam(params.activeOnly);
  const county = getParam(params.county);
  const onboardingStatus = getParam(params.onboardingStatus);
  const expiredDocuments = getParam(params.expiredDocuments);
  const page = Math.max(1, Number(getParam(params.page) ?? "1"));
  const [counties, statuses, onboardingStatuses, drivers] = await Promise.all([
    getSettingOptions(membership.organizationId, "countiesServed"),
    getSettingOptions(membership.organizationId, "driverStatuses"),
    getSettingOptions(membership.organizationId, "driverOnboardingStatuses"),
    getDrivers({
      organizationId: membership.organizationId,
      activeOnly: activeOnly === "true",
      county,
      onboardingStatus,
      expiredDocuments: expiredDocuments === "true",
      page,
      pageSize: 10,
    }),
  ]);
  const baseParams = new URLSearchParams();
  for (const [key, value] of Object.entries({ activeOnly, county, onboardingStatus, expiredDocuments })) {
    if (value) baseParams.set(key, value);
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Drivers"
        description="Manage volunteer driver records, onboarding, documents, service preferences, and availability."
        actions={
          hasPermission(membership, "drivers:manage") ? (
            <Button asChild size="sm"><Link href="/drivers/new">Create driver</Link></Button>
          ) : null
        }
      />
      <DriverFilters activeOnly={activeOnly} county={county} onboardingStatus={onboardingStatus} expiredDocuments={expiredDocuments} counties={counties} onboardingStatuses={onboardingStatuses} />
      <Card>
        <CardHeader><CardTitle>Driver directory</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-4">
          {drivers.items.length > 0 ? (
            <>
              <DriversTable
                drivers={drivers.items}
                statusLabels={new Map(statuses.map((option) => [option.code, option.label]))}
                countyLabels={new Map(counties.map((option) => [option.code, option.label]))}
                onboardingLabels={new Map(onboardingStatuses.map((option) => [option.code, option.label]))}
              />
              <PaginationControls page={drivers.page} pageCount={drivers.pageCount} baseParams={baseParams} />
            </>
          ) : <EmptyState title="No drivers found" description="Adjust filters or create a driver record." />}
        </CardContent>
      </Card>
    </div>
  );
}

function getParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
