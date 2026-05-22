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
        },
      },
      tripLeg: {
        select: {
          id: true,
          status: true,
          scheduledPickupAt: true,
          pickupAddress: true,
          pickupCounty: true,
          dropoffAddress: true,
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

export function getDayRange(date = new Date()): DriverPortalDateRange {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 1);

  return { start, end };
}
