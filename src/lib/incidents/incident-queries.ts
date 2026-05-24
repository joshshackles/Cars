import { db } from "@/lib/db";

export async function getIncidents(organizationId: string) {
  return db.incident.findMany({
    where: {
      organizationId,
      deletedAt: null,
    },
    include: {
      rider: true,
      driver: true,
      rideRequest: true,
      tripLeg: true,
    },
    orderBy: [{ status: "asc" }, { occurredAt: "desc" }],
  });
}

export async function getIncidentOptions(organizationId: string) {
  const [riders, drivers, tripLegs] = await Promise.all([
    db.rider.findMany({
      where: { organizationId, deletedAt: null },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),
    db.driver.findMany({
      where: { organizationId, deletedAt: null },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),
    db.tripLeg.findMany({
      where: { organizationId, deletedAt: null },
      include: {
        rideRequest: {
          include: {
            rider: true,
          },
        },
      },
      orderBy: { scheduledPickupAt: "desc" },
      take: 50,
    }),
  ]);

  return { riders, drivers, tripLegs };
}
