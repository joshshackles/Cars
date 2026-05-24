import { RideRequestStatus, TripLegStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { getDayRange } from "@/lib/dispatch/dispatch-utils";

const activeTripStatuses: TripLegStatus[] = [
  TripLegStatus.ASSIGNED,
  TripLegStatus.DRIVER_CONFIRMED,
  TripLegStatus.IN_PROGRESS,
  TripLegStatus.EN_ROUTE,
  TripLegStatus.ARRIVED,
];

const pendingRequestStatuses: RideRequestStatus[] = [
  RideRequestStatus.REQUESTED,
  RideRequestStatus.PENDING_REVIEW,
  RideRequestStatus.PENDING_ASSIGNMENT,
];

export async function getDashboardOverview(organizationId: string) {
  const today = getDayRange();
  const baseTripWhere = {
    organizationId,
    deletedAt: null,
    scheduledPickupAt: {
      gte: today.start,
      lt: today.end,
    },
  };

  const [
    riders,
    drivers,
    activeDrivers,
    pendingRequests,
    todayTrips,
    activeTrips,
    completedToday,
    noShowsToday,
    urgentExceptions,
    operationTrips,
  ] = await Promise.all([
    db.rider.count({
      where: { organizationId, deletedAt: null },
    }),
    db.driver.count({
      where: { organizationId, deletedAt: null },
    }),
    db.driver.count({
      where: { organizationId, deletedAt: null, status: "active" },
    }),
    db.rideRequest.count({
      where: {
        organizationId,
        deletedAt: null,
        status: { in: pendingRequestStatuses },
      },
    }),
    db.tripLeg.count({
      where: baseTripWhere,
    }),
    db.tripLeg.count({
      where: {
        ...baseTripWhere,
        status: { in: activeTripStatuses },
      },
    }),
    db.tripLeg.count({
      where: {
        organizationId,
        deletedAt: null,
        status: TripLegStatus.COMPLETED,
        OR: [
          { completedAt: { gte: today.start, lt: today.end } },
          {
            completedAt: null,
            scheduledPickupAt: { gte: today.start, lt: today.end },
          },
        ],
      },
    }),
    db.tripLeg.count({
      where: {
        ...baseTripWhere,
        status: TripLegStatus.NO_SHOW,
      },
    }),
    db.tripLeg.count({
      where: {
        ...baseTripWhere,
        OR: [
          { assignment: null },
          { status: { in: [TripLegStatus.NEEDS_ATTENTION, TripLegStatus.NO_SHOW, TripLegStatus.CANCELED] } },
        ],
      },
    }),
    db.tripLeg.findMany({
      where: baseTripWhere,
      include: {
        rideRequest: {
          include: {
            rider: true,
          },
        },
        assignment: {
          include: {
            driver: true,
          },
        },
      },
      orderBy: [{ scheduledPickupAt: "asc" }, { sequence: "asc" }],
      take: 5,
    }),
  ]);

  return {
    riders,
    drivers,
    activeDrivers,
    pendingRequests,
    todayTrips,
    activeTrips,
    completedToday,
    noShowsToday,
    urgentExceptions,
    operationTrips: operationTrips.map((trip) => ({
      id: trip.id,
      status: trip.status,
      scheduledPickupAt: trip.scheduledPickupAt,
      riderName: trip.rideRequest.rider.displayName,
      pickupCounty: trip.pickupCounty,
      dropoffCounty: trip.dropoffCounty,
      driverName: trip.assignment?.driver.displayName ?? null,
    })),
  };
}

export type DashboardOverview = Awaited<ReturnType<typeof getDashboardOverview>>;
