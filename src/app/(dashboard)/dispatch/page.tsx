import Link from "next/link";
import { AssignmentHistory } from "@/components/dispatch/assignment-history";
import { DispatchBoard } from "@/components/dispatch/dispatch-board";
import { DispatchFilters } from "@/components/dispatch/dispatch-filters";
import { DispatchSummary } from "@/components/dispatch/dispatch-summary";
import { EmptyState } from "@/components/layouts/empty-state";
import { PageHeader } from "@/components/layouts/page-header";
import { Button } from "@/components/ui/button";
import { requirePermission } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/auth/permissions";
import {
  getAssignmentHistory,
  getDispatchFilterOptions,
  getDispatchTrips,
  getDriverSuitability,
  summarizeDispatchTrips,
} from "@/lib/dispatch/dispatch-queries";
import { formatDateInput, getDayRange } from "@/lib/dispatch/dispatch-utils";
import { getSettingOptions } from "@/lib/settings/settings-service";

type DispatchPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function DispatchPage({ searchParams }: DispatchPageProps) {
  const membership = await requirePermission("dispatch:view");
  const params = (await searchParams) ?? {};
  const date = getParam(params.date) ?? formatDateInput(new Date());
  const filters = {
    date,
    county: getParam(params.county),
    driverId: getParam(params.driverId),
    status: getParam(params.status),
    ridePurpose: getParam(params.ridePurpose),
    fundingSourceId: getParam(params.fundingSourceId),
  };
  const range = getDayRange(date);
  const [trips, options, counties, ridePurposes] = await Promise.all([
    getDispatchTrips(membership.organizationId, range, filters),
    getDispatchFilterOptions(membership.organizationId),
    getSettingOptions(membership.organizationId, "countiesServed"),
    getSettingOptions(membership.organizationId, "ridePurposes"),
  ]);
  const [suitabilityPairs, historyPairs] = await Promise.all([
    Promise.all(trips.map(async (trip) => [trip.id, await getDriverSuitability(membership.organizationId, trip.id)] as const)),
    Promise.all(trips.map(async (trip) => [trip.id, await getAssignmentHistory(membership.organizationId, trip.id)] as const)),
  ]);
  const canManage = hasPermission(membership, "dispatch:manage");
  const canOverride = hasPermission(membership, "dispatch:override");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Dispatch"
        description="Daily operational command center for trip assignment, confirmation, exceptions, and status changes."
        actions={<Button asChild variant="outline" size="sm"><Link href={`/dispatch/weekly?date=${date}`}>Weekly view</Link></Button>}
      />
      <DispatchFilters
        date={date}
        {...filters}
        counties={counties}
        drivers={options.drivers}
        ridePurposes={ridePurposes}
        fundingSources={options.fundingSources}
      />
      <DispatchSummary summary={summarizeDispatchTrips(trips)} />
      {trips.length > 0 ? (
        <>
          <DispatchBoard
            trips={trips}
            suitabilityByTrip={Object.fromEntries(suitabilityPairs)}
            canManage={canManage}
            canOverride={canOverride}
          />
          <AssignmentHistory historyByTrip={Object.fromEntries(historyPairs)} />
        </>
      ) : (
        <EmptyState
          title="No trips for this dispatch view"
          description="Adjust filters or create ride requests that generate trip legs for this date."
        />
      )}
    </div>
  );
}

function getParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
