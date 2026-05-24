import { db } from "@/lib/db";

export async function getRideRequests(organizationId: string) {
  return db.rideRequest.findMany({
    where: { organizationId, deletedAt: null },
    include: {
      rider: true,
      fundingSource: true,
      tripLegs: { orderBy: { sequence: "asc" } },
    },
    orderBy: { neededAt: "desc" },
    take: 50,
  });
}

export async function getRideRequestIntakeOptions(organizationId: string) {
  const [riders, fundingSources] = await Promise.all([
    db.rider.findMany({
      where: { organizationId, deletedAt: null },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),
    db.fundingSource.findMany({
      where: { organizationId, deletedAt: null, active: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return { riders, fundingSources };
}
