import { db } from "@/lib/db";
import type { SessionUser } from "@/lib/auth/session";

export type DriverPortalDateRange = {
  start: Date;
  end: Date;
};

export async function getCurrentPortalDriver(organizationId: string, user: Pick<SessionUser, "email">) {
  return db.driver.findFirst({
    where: {
      organizationId,
      email: user.email,
      deletedAt: null,
    },
  });
}

export async function getDriverManifest(organizationId: string, driverId: string, range: DriverPortalDateRange) {
  return db.assignment.findMany({
    where: {
      organizationId,
      driverId,
      deletedAt: null,
      status: {
        notIn: ["CANCELED"],
      },
      tripLeg: {
        deletedAt: null,
        scheduledPickupAt: {
          gte: range.start,
          lt: range.end,
        },
      },
    },
    select: {
      id: true,
      status: true,
      mileageRecord: {
        select: {
          miles: true,
          status: true,
          mileageSource: true,
          gpsDistanceMiles: true,
          gpsPointCount: true,
        },
      },
      tripLeg: {
        select: {
          id: true,
          status: true,
          scheduledPickupAt: true,
          pickupAddress: true,
          pickupCity: true,
          pickupState: true,
          pickupPostalCode: true,
          pickupCounty: true,
          dropoffAddress: true,
          dropoffCity: true,
          dropoffState: true,
          dropoffPostalCode: true,
          dropoffCounty: true,
          rideRequest: {
            select: {
              id: true,
              purpose: true,
              specialInstructions: true,
              rider: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  phone: true,
                  communicationPreference: true,
                  mobilityNotes: true,
                  riderNotes: true,
                  pickupInstructions: true,
                },
              },
            },
          },
        },
      },
    },
    orderBy: [{ tripLeg: { scheduledPickupAt: "asc" } }, { createdAt: "asc" }],
  });
}

export async function getDriverPortalWorkspace(organizationId: string, driverId: string) {
  const now = new Date();

  const [driver, upcomingAssignments, pastAssignments, mileageRecords, reimbursementBatches] =
    await Promise.all([
      db.driver.findFirstOrThrow({
        where: {
          id: driverId,
          organizationId,
          deletedAt: null,
        },
        include: {
          availabilities: {
            where: { deletedAt: null },
            orderBy: [{ startsAt: "asc" }],
            take: 12,
          },
        },
      }),
      db.assignment.findMany({
        where: {
          organizationId,
          driverId,
          deletedAt: null,
          status: "ACCEPTED",
          tripLeg: {
            deletedAt: null,
            scheduledPickupAt: { gte: now },
          },
        },
        include: {
          tripLeg: {
            include: {
              rideRequest: {
                include: {
                  rider: true,
                },
              },
            },
          },
        },
        orderBy: [{ tripLeg: { scheduledPickupAt: "asc" } }],
        take: 8,
      }),
      db.assignment.findMany({
        where: {
          organizationId,
          driverId,
          deletedAt: null,
          OR: [{ status: "COMPLETED" }, { tripLeg: { status: "COMPLETED" } }],
        },
        include: {
          mileageRecord: true,
          tripLeg: {
            include: {
              rideRequest: {
                include: {
                  rider: true,
                },
              },
            },
          },
        },
        orderBy: [{ tripLeg: { scheduledPickupAt: "desc" } }],
        take: 8,
      }),
      db.mileageRecord.findMany({
        where: {
          organizationId,
          driverId,
          deletedAt: null,
        },
        include: {
          reimbursementBatch: true,
          tripLeg: {
            include: {
              rideRequest: {
                include: {
                  rider: true,
                },
              },
            },
          },
        },
        orderBy: [{ serviceDate: "desc" }],
        take: 12,
      }),
      db.reimbursementBatch.findMany({
        where: {
          organizationId,
          driverId,
          deletedAt: null,
        },
        orderBy: [{ periodEnd: "desc" }],
        take: 6,
      }),
    ]);

  const pendingCents = mileageRecords
    .filter((record) => ["SUBMITTED", "APPROVED", "BATCHED"].includes(record.status))
    .reduce((total, record) => total + record.amountCents, 0);
  const paidCents = reimbursementBatches
    .filter((batch) => batch.status === "PAID")
    .reduce((total, batch) => total + batch.totalCents, 0);

  return {
    driver,
    upcomingAssignments,
    pastAssignments,
    mileageRecords,
    reimbursementBatches,
    reimbursementSummary: {
      pendingCents,
      paidCents,
      pendingMileageCount: mileageRecords.filter((record) => ["SUBMITTED", "APPROVED", "BATCHED"].includes(record.status)).length,
      latestBatch: reimbursementBatches[0] ?? null,
    },
  };
}

export function getDayRange(date = new Date()): DriverPortalDateRange {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 1);

  return { start, end };
}
