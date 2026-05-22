import { db } from "@/lib/db";

export type MileageListStatus = "SUBMITTED" | "APPROVED" | "REJECTED";

export async function getMileageRecords(organizationId: string, status: MileageListStatus) {
  return db.mileageRecord.findMany({
    where: {
      organizationId,
      status,
      deletedAt: null,
    },
    include: {
      driver: true,
      tripLeg: {
        include: {
          rideRequest: {
            include: {
              rider: true,
            },
          },
        },
      },
      reimbursementBatch: true,
    },
    orderBy: [{ serviceDate: "desc" }, { createdAt: "desc" }],
  });
}

export async function getMileageSummary(organizationId: string) {
  const [pending, approved, rejected, batched] = await Promise.all([
    db.mileageRecord.count({ where: { organizationId, status: "SUBMITTED", deletedAt: null } }),
    db.mileageRecord.count({ where: { organizationId, status: "APPROVED", deletedAt: null } }),
    db.mileageRecord.count({ where: { organizationId, status: "REJECTED", deletedAt: null } }),
    db.mileageRecord.count({ where: { organizationId, status: "BATCHED", deletedAt: null } }),
  ]);

  return { pending, approved, rejected, batched };
}

export async function getReimbursementBatches(organizationId: string) {
  return db.reimbursementBatch.findMany({
    where: { organizationId, deletedAt: null },
    include: {
      driver: true,
      mileageRecords: true,
    },
    orderBy: [{ createdAt: "desc" }],
  });
}

export async function getDriverReimbursementSummaries(organizationId: string) {
  const drivers = await db.driver.findMany({
    where: { organizationId, deletedAt: null },
    include: {
      mileageRecords: {
        where: { deletedAt: null },
        include: { reimbursementBatch: true },
      },
      reimbursementBatches: {
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  return drivers.map((driver) => {
    const approvedRecords = driver.mileageRecords.filter((record) => record.status === "APPROVED" || record.status === "BATCHED" || record.status === "PAID");
    const pendingRecords = driver.mileageRecords.filter((record) => record.status === "SUBMITTED");
    const paidBatches = driver.reimbursementBatches.filter((batch) => batch.status === "PAID");

    return {
      driver,
      tripCount: approvedRecords.length,
      pendingCount: pendingRecords.length,
      approvedMiles: approvedRecords.reduce((sum, record) => sum + Number(record.miles), 0),
      approvedCents: approvedRecords.reduce((sum, record) => sum + record.amountCents, 0),
      paidCents: paidBatches.reduce((sum, batch) => sum + batch.totalCents, 0),
      latestBatch: driver.reimbursementBatches[0] ?? null,
    };
  });
}

export async function getApprovedMileageForBatch(organizationId: string) {
  return db.mileageRecord.findMany({
    where: {
      organizationId,
      status: "APPROVED",
      reimbursementBatchId: null,
      deletedAt: null,
    },
    include: { driver: true },
    orderBy: [{ driverId: "asc" }, { serviceDate: "asc" }],
  });
}
