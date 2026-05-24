import { db } from "@/lib/db";
import { asStringArray, isDocumentCurrent, type DispatchFilterParams } from "@/lib/dispatch/dispatch-utils";

type TripLegStatusValue =
  | "PENDING"
  | "READY_TO_ASSIGN"
  | "ASSIGNED"
  | "DRIVER_CONFIRMED"
  | "IN_PROGRESS"
  | "EN_ROUTE"
  | "ARRIVED"
  | "COMPLETED"
  | "CANCELED"
  | "NO_SHOW"
  | "NEEDS_ATTENTION";

export async function getDispatchTrips(
  organizationId: string,
  range: { start: Date; end: Date },
  filters: DispatchFilterParams
) {
  return db.tripLeg.findMany({
    where: {
      organizationId,
      deletedAt: null,
      scheduledPickupAt: { gte: range.start, lt: range.end },
      ...(filters.county
        ? {
            OR: [{ pickupCounty: filters.county }, { dropoffCounty: filters.county }],
          }
        : {}),
      ...(filters.status ? { status: filters.status as TripLegStatusValue } : {}),
      ...(filters.driverId ? { assignment: { driverId: filters.driverId } } : {}),
      rideRequest: {
        ...(filters.ridePurpose ? { purpose: filters.ridePurpose } : {}),
        ...(filters.fundingSourceId ? { fundingSourceId: filters.fundingSourceId } : {}),
      },
    },
    include: {
      rideRequest: {
        include: {
          rider: true,
          fundingSource: true,
        },
      },
      assignment: {
        include: {
          driver: true,
        },
      },
      statusHistories: {
        orderBy: { changedAt: "desc" },
        take: 5,
      },
    },
    orderBy: [{ scheduledPickupAt: "asc" }, { sequence: "asc" }],
  });
}

export async function getDispatchFilterOptions(organizationId: string) {
  const [drivers, fundingSources] = await Promise.all([
    db.driver.findMany({
      where: { organizationId, deletedAt: null },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),
    db.fundingSource.findMany({
      where: { organizationId, deletedAt: null, active: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return { drivers, fundingSources };
}

export async function getDriverSuitability(organizationId: string, tripLegId: string) {
  const trip = await db.tripLeg.findFirstOrThrow({
    where: { id: tripLegId, organizationId, deletedAt: null },
    include: {
      rideRequest: true,
    },
  });
  const drivers = await db.driver.findMany({
    where: { organizationId, deletedAt: null, status: "active" },
    include: {
      availabilities: {
        where: {
          deletedAt: null,
          startsAt: { lte: trip.scheduledPickupAt },
          endsAt: { gte: trip.scheduledPickupAt },
        },
      },
      assignments: {
        where: {
          deletedAt: null,
          tripLeg: {
            scheduledPickupAt: {
              gte: new Date(trip.scheduledPickupAt.getTime() - 90 * 60 * 1000),
              lte: new Date(trip.scheduledPickupAt.getTime() + 90 * 60 * 1000),
            },
          },
        },
        include: { tripLeg: true },
      },
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  return drivers.map((driver) => {
    const counties = asStringArray(driver.countiesServed);
    const countyCompatible =
      !trip.pickupCounty ||
      !trip.dropoffCounty ||
      counties.includes(trip.pickupCounty) ||
      counties.includes(trip.dropoffCounty);
    const availability = driver.availabilities.some((item) => item.status !== "UNAVAILABLE");
    const documentsValid =
      isDocumentCurrent(driver.licenseVerificationDate) &&
      isDocumentCurrent(driver.insuranceVerificationDate) &&
      driver.backgroundCheckStatus === "cleared";
    const conflicts = driver.assignments.filter((assignment) => assignment.tripLegId !== trip.id).length;

    return {
      driver,
      availability,
      countyCompatible,
      documentsValid,
      conflicts,
      warnings: [
        !availability ? "No matching availability" : null,
        !countyCompatible ? "County mismatch" : null,
        !documentsValid ? "Document review needed" : null,
        conflicts > 0 ? "Scheduling conflict" : null,
      ].filter((warning): warning is string => Boolean(warning)),
    };
  });
}

export async function getAssignmentHistory(organizationId: string, tripLegId: string) {
  return db.auditLog.findMany({
    where: {
      organizationId,
      tripLegId,
      action: {
        in: [
          "dispatch.assigned",
          "dispatch.reassigned",
          "dispatch.status_changed",
          "dispatch.note_added",
          "driver_portal.accepted",
          "driver_portal.declined",
          "driver_portal.en_route",
          "driver_portal.arrived",
          "driver_portal.completed",
          "driver_portal.issue_reported",
          "driver_portal.mileage_submitted",
        ],
      },
    },
    include: { actorUser: true },
    orderBy: { createdAt: "desc" },
  });
}

export function summarizeDispatchTrips<T extends { status: string; assignment: unknown }>(trips: T[]) {
  return {
    today: trips.length,
    unassigned: trips.filter((trip) => !trip.assignment).length,
    assigned: trips.filter((trip) => trip.status === "ASSIGNED").length,
    confirmed: trips.filter((trip) => trip.status === "DRIVER_CONFIRMED").length,
    completed: trips.filter((trip) => trip.status === "COMPLETED").length,
    canceled: trips.filter((trip) => trip.status === "CANCELED").length,
    noShows: trips.filter((trip) => trip.status === "NO_SHOW").length,
    urgentExceptions: trips.filter(
      (trip) => !trip.assignment || trip.status === "NO_SHOW" || trip.status === "CANCELED" || trip.status === "NEEDS_ATTENTION"
    ).length,
  };
}
