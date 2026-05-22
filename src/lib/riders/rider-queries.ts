import { db } from "@/lib/db";

export type RiderListParams = {
  organizationId: string;
  search?: string;
  status?: string;
  county?: string;
  page?: number;
  pageSize?: number;
};

export async function getRiders({
  organizationId,
  search,
  status,
  county,
  page = 1,
  pageSize = 10,
}: RiderListParams) {
  const where = {
    organizationId,
    deletedAt: null,
    ...(status ? { status } : {}),
    ...(county ? { county } : {}),
    ...(search
      ? {
          OR: [
            { displayName: { contains: search, mode: "insensitive" as const } },
            { firstName: { contains: search, mode: "insensitive" as const } },
            { lastName: { contains: search, mode: "insensitive" as const } },
            { phone: { contains: search, mode: "insensitive" as const } },
            { email: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    db.rider.findMany({
      where,
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        _count: {
          select: {
            rideRequests: true,
            incidents: true,
            documents: true,
          },
        },
      },
    }),
    db.rider.count({ where }),
  ]);

  return {
    items,
    total,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getRiderProfile(organizationId: string, riderId: string) {
  return db.rider.findFirst({
    where: {
      id: riderId,
      organizationId,
      deletedAt: null,
    },
    include: {
      rideRequests: {
        where: { deletedAt: null },
        orderBy: { neededAt: "desc" },
        include: {
          tripLegs: {
            where: { deletedAt: null },
            orderBy: { scheduledPickupAt: "asc" },
            include: {
              assignment: {
                include: {
                  driver: true,
                },
              },
              originDestination: true,
              dropoffDestination: true,
            },
          },
        },
      },
      communicationLogs: {
        where: { deletedAt: null },
        orderBy: { occurredAt: "desc" },
        take: 25,
      },
      incidents: {
        where: { deletedAt: null },
        orderBy: { occurredAt: "desc" },
        take: 25,
      },
      documents: {
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" },
        take: 25,
      },
      statusHistories: {
        orderBy: { changedAt: "desc" },
        take: 25,
      },
    },
  });
}
