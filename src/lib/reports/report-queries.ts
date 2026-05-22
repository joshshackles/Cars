import { db } from "@/lib/db";
import { addToMap, getReportRange, mapToRows, sum, type ReportFilters } from "@/lib/reports/report-utils";

export async function getReportFilterOptions(organizationId: string) {
  const [drivers, fundingSources, riderStatuses, destinationTypes, counties, ridePurposes] = await Promise.all([
    db.driver.findMany({
      where: { organizationId, deletedAt: null },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      select: { id: true, displayName: true },
    }),
    db.fundingSource.findMany({
      where: { organizationId, deletedAt: null, active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    db.programSetting.findUnique({
      where: { organizationId_key: { organizationId, key: "riderStatuses" } },
    }),
    db.programSetting.findUnique({
      where: { organizationId_key: { organizationId, key: "destinationTypes" } },
    }),
    db.programSetting.findUnique({
      where: { organizationId_key: { organizationId, key: "countiesServed" } },
    }),
    db.programSetting.findUnique({
      where: { organizationId_key: { organizationId, key: "ridePurposes" } },
    }),
  ]);

  return {
    drivers,
    fundingSources,
    riderStatuses: settingOptions(riderStatuses?.value),
    destinationTypes: settingOptions(destinationTypes?.value),
    counties: settingOptions(counties?.value),
    ridePurposes: settingOptions(ridePurposes?.value),
  };
}

export async function getOperationalReport(organizationId: string, filters: ReportFilters) {
  const { start, end } = getReportRange(filters);
  const rideRequestWhere = {
    organizationId,
    deletedAt: null,
    neededAt: { gte: start, lte: end },
    ...(filters.ridePurpose ? { purpose: filters.ridePurpose } : {}),
    ...(filters.fundingSourceId ? { fundingSourceId: filters.fundingSourceId } : {}),
    ...(filters.riderStatus ? { rider: { status: filters.riderStatus } } : {}),
  };
  const tripWhere = {
    organizationId,
    deletedAt: null,
    scheduledPickupAt: { gte: start, lte: end },
    ...(filters.county ? { OR: [{ pickupCounty: filters.county }, { dropoffCounty: filters.county }] } : {}),
    ...(filters.driverId ? { assignment: { driverId: filters.driverId } } : {}),
    ...(filters.destinationType ? { dropoffDestination: { destinationType: filters.destinationType } } : {}),
    rideRequest: {
      ...(filters.ridePurpose ? { purpose: filters.ridePurpose } : {}),
      ...(filters.fundingSourceId ? { fundingSourceId: filters.fundingSourceId } : {}),
      ...(filters.riderStatus ? { rider: { status: filters.riderStatus } } : {}),
    },
  };

  const [rideRequests, tripLegs, mileageRecords, reimbursementBatches, activeDrivers] = await Promise.all([
    db.rideRequest.findMany({
      where: {
        ...rideRequestWhere,
        ...(filters.county || filters.driverId || filters.destinationType
          ? {
              tripLegs: {
                some: {
                  ...(filters.county ? { OR: [{ pickupCounty: filters.county }, { dropoffCounty: filters.county }] } : {}),
                  ...(filters.driverId ? { assignment: { driverId: filters.driverId } } : {}),
                  ...(filters.destinationType ? { dropoffDestination: { destinationType: filters.destinationType } } : {}),
                },
              },
            }
          : {}),
      },
      include: { rider: true, fundingSource: true, tripLegs: { include: { dropoffDestination: true, assignment: true } } },
    }),
    db.tripLeg.findMany({
      where: tripWhere,
      include: {
        dropoffDestination: true,
        assignment: { include: { driver: true } },
        mileageRecord: true,
        rideRequest: { include: { rider: true, fundingSource: true } },
      },
    }),
    db.mileageRecord.findMany({
      where: {
        organizationId,
        deletedAt: null,
        serviceDate: { gte: start, lte: end },
        status: { not: "REJECTED" },
        ...(filters.driverId ? { driverId: filters.driverId } : {}),
        tripLeg: {
          ...(filters.county ? { OR: [{ pickupCounty: filters.county }, { dropoffCounty: filters.county }] } : {}),
          ...(filters.destinationType ? { dropoffDestination: { destinationType: filters.destinationType } } : {}),
          rideRequest: {
            ...(filters.ridePurpose ? { purpose: filters.ridePurpose } : {}),
            ...(filters.fundingSourceId ? { fundingSourceId: filters.fundingSourceId } : {}),
            ...(filters.riderStatus ? { rider: { status: filters.riderStatus } } : {}),
          },
        },
      },
      include: { driver: true, tripLeg: { include: { rideRequest: { include: { fundingSource: true } } } } },
    }),
    db.reimbursementBatch.findMany({
      where: {
        organizationId,
        deletedAt: null,
        periodStart: { lte: end },
        periodEnd: { gte: start },
        ...(filters.driverId ? { driverId: filters.driverId } : {}),
      },
      include: { driver: true },
    }),
    db.driver.count({
      where: {
        organizationId,
        deletedAt: null,
        status: "active",
        ...(filters.driverId ? { id: filters.driverId } : {}),
      },
    }),
  ]);

  const completedTripLegs = tripLegs.filter((trip) => trip.status === "COMPLETED");
  const completedRideRequestIds = new Set(completedTripLegs.map((trip) => trip.rideRequestId));
  const ridersServed = new Set(completedTripLegs.map((trip) => trip.rideRequest.riderId)).size;
  const milesDriven = sum(mileageRecords.map((record) => Number(record.miles)));
  const volunteerHours = sum(completedTripLegs.map((trip) => serviceHours(trip.scheduledPickupAt, trip.scheduledDropoffAt)));
  const reimbursementTotalCents = sum(mileageRecords.map((record) => record.amountCents));

  const countyMap = new Map<string, number>();
  const purposeMap = new Map<string, number>();
  const destinationTypeMap = new Map<string, number>();
  const fundingAmountMap = new Map<string, number>();
  const driverMap = new Map<string, { completedTrips: number; miles: number; hours: number; reimbursementCents: number }>();

  for (const trip of tripLegs) {
    addToMap(countyMap, trip.pickupCounty);
    if (trip.dropoffCounty && trip.dropoffCounty !== trip.pickupCounty) {
      addToMap(countyMap, trip.dropoffCounty);
    }
    addToMap(purposeMap, trip.rideRequest.purpose);
    addToMap(destinationTypeMap, trip.dropoffDestination?.destinationType);
    if (trip.assignment?.driver) {
      const name = trip.assignment.driver.displayName;
      const current = driverMap.get(name) ?? { completedTrips: 0, miles: 0, hours: 0, reimbursementCents: 0 };
      if (trip.status === "COMPLETED") {
        current.completedTrips += 1;
        current.hours += serviceHours(trip.scheduledPickupAt, trip.scheduledDropoffAt);
      }
      current.miles += Number(trip.mileageRecord?.miles ?? 0);
      current.reimbursementCents += trip.mileageRecord?.amountCents ?? 0;
      driverMap.set(name, current);
    }
  }

  for (const record of mileageRecords) {
    addToMap(fundingAmountMap, record.tripLeg.rideRequest.fundingSource?.name, record.amountCents);
  }

  const recurringRideVolume = rideRequests.filter((request) => request.recurringRide).length;

  return {
    filters,
    metrics: {
      ridersServed,
      ridesRequested: rideRequests.length,
      ridesCompleted: completedRideRequestIds.size,
      tripLegsCompleted: completedTripLegs.length,
      unmetRequests: rideRequests.filter((request) => request.status === "DENIED" || request.status === "UNRESOLVED").length,
      cancellations: tripLegs.filter((trip) => trip.status === "CANCELED").length + rideRequests.filter((request) => request.status === "CANCELED").length,
      noShows: tripLegs.filter((trip) => trip.status === "NO_SHOW").length,
      milesDriven,
      volunteerHours,
      activeDrivers,
      reimbursementTotalCents,
      recurringRideVolume,
    },
    charts: {
      countiesServed: mapToRows(countyMap),
      ridePurposes: mapToRows(purposeMap),
      destinationTypes: mapToRows(destinationTypeMap),
      fundingSourceTotals: mapToRows(fundingAmountMap),
      driverActivity: Array.from(driverMap.entries()).map(([driver, value]) => ({ driver, ...value })).sort((a, b) => b.completedTrips - a.completedTrips),
      reimbursementBatches: reimbursementBatches.map((batch) => ({
        batchNumber: batch.batchNumber,
        driver: batch.driver.displayName,
        totalCents: batch.totalCents,
        totalMiles: Number(batch.totalMiles),
        status: batch.status,
      })),
    },
  };
}

function serviceHours(start: Date, end: Date | null) {
  if (!end) {
    return 0;
  }

  return Math.max(0, (end.getTime() - start.getTime()) / 3_600_000);
}

function settingOptions(value: unknown): Array<{ code: string; label: string }> {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is { code: string; label: string; active?: boolean } =>
      Boolean(item && typeof item === "object" && "code" in item && "label" in item)
    )
    .filter((item) => item.active !== false)
    .map((item) => ({ code: item.code, label: item.label }));
}
