import { IncidentStatus, TripLegStatus } from "@prisma/client";
import { db } from "@/lib/db";

export async function getNotificationSummary(organizationId: string) {
  const [openIncidents, attentionTrips, recentMessages] = await Promise.all([
    db.incident.count({
      where: {
        organizationId,
        deletedAt: null,
        status: {
          in: [IncidentStatus.OPEN, IncidentStatus.REVIEWING],
        },
      },
    }),
    db.tripLeg.count({
      where: {
        organizationId,
        deletedAt: null,
        status: TripLegStatus.NEEDS_ATTENTION,
      },
    }),
    db.communicationLog.count({
      where: {
        organizationId,
        deletedAt: null,
        occurredAt: {
          gte: hoursAgo(48),
        },
      },
    }),
  ]);

  return {
    openIncidents,
    attentionTrips,
    recentMessages,
    total: openIncidents + attentionTrips + recentMessages,
  };
}

export async function getNotificationInbox(organizationId: string) {
  const [incidents, attentionTrips, communications] = await Promise.all([
    db.incident.findMany({
      where: {
        organizationId,
        deletedAt: null,
        status: {
          in: [IncidentStatus.OPEN, IncidentStatus.REVIEWING],
        },
      },
      include: {
        rider: true,
        driver: true,
      },
      orderBy: [{ severity: "desc" }, { occurredAt: "desc" }],
      take: 12,
    }),
    db.tripLeg.findMany({
      where: {
        organizationId,
        deletedAt: null,
        status: TripLegStatus.NEEDS_ATTENTION,
      },
      include: {
        assignment: {
          include: {
            driver: true,
          },
        },
        rideRequest: {
          include: {
            rider: true,
          },
        },
      },
      orderBy: [{ scheduledPickupAt: "asc" }],
      take: 12,
    }),
    db.communicationLog.findMany({
      where: {
        organizationId,
        deletedAt: null,
        occurredAt: {
          gte: hoursAgo(48),
        },
      },
      include: {
        rider: true,
        driver: true,
        tripLeg: true,
      },
      orderBy: { occurredAt: "desc" },
      take: 12,
    }),
  ]);

  return { incidents, attentionTrips, communications };
}

function hoursAgo(hours: number) {
  const date = new Date();
  date.setHours(date.getHours() - hours);
  return date;
}
