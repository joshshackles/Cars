import { db } from "@/lib/db";

export type DriverListParams = {
  organizationId: string;
  activeOnly?: boolean;
  county?: string;
  onboardingStatus?: string;
  expiredDocuments?: boolean;
  page?: number;
  pageSize?: number;
};

export async function getDrivers({
  organizationId,
  activeOnly,
  county,
  onboardingStatus,
  expiredDocuments,
  page = 1,
  pageSize = 10,
}: DriverListParams) {
  const expirationCutoff = new Date();
  expirationCutoff.setFullYear(expirationCutoff.getFullYear() - 1);
  const where = {
    organizationId,
    deletedAt: null,
    ...(activeOnly ? { status: "active" } : {}),
    ...(onboardingStatus ? { onboardingStatus } : {}),
    ...(county ? { countiesServed: { array_contains: county } } : {}),
    ...(expiredDocuments
      ? {
          OR: [
            { licenseVerificationDate: { lt: expirationCutoff } },
            { insuranceVerificationDate: { lt: expirationCutoff } },
            { licenseVerificationDate: null },
            { insuranceVerificationDate: null },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    db.driver.findMany({
      where,
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        _count: {
          select: {
            assignments: true,
            mileageRecords: true,
            incidents: true,
            documents: true,
          },
        },
      },
    }),
    db.driver.count({ where }),
  ]);

  return {
    items,
    total,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getDriverProfile(organizationId: string, driverId: string) {
  return db.driver.findFirst({
    where: { id: driverId, organizationId, deletedAt: null },
    include: {
      assignments: {
        where: { deletedAt: null },
        orderBy: { offeredAt: "desc" },
        include: {
          tripLeg: {
            include: {
              rideRequest: { include: { rider: true } },
              originDestination: true,
              dropoffDestination: true,
            },
          },
        },
      },
      mileageRecords: {
        where: { deletedAt: null },
        orderBy: { serviceDate: "desc" },
        include: { reimbursementBatch: true },
      },
      incidents: {
        where: { deletedAt: null },
        orderBy: { occurredAt: "desc" },
      },
      documents: {
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" },
      },
      availabilities: {
        where: { deletedAt: null },
        orderBy: { startsAt: "asc" },
      },
      statusHistories: {
        orderBy: { changedAt: "desc" },
        take: 25,
      },
    },
  });
}
