import { RideRequestStatus, TripLegStatus } from "@prisma/client";
import { db } from "@/lib/db";
import type { MobileUserContext } from "@/lib/mobile-api/auth";
import { getSettingOptions } from "@/lib/settings/settings-service";

type ProfileInput = {
  name?: string;
  phone?: string;
  addressLine1?: string;
  city?: string;
  county?: string;
  state?: string;
  postalCode?: string;
  communicationPreference?: string;
  pickupInstructions?: string;
};

type RideRequestInput = {
  pickupAddress?: string;
  pickupCity?: string;
  pickupCounty?: string;
  pickupState?: string;
  pickupPostalCode?: string;
  dropoffAddress?: string;
  dropoffCity?: string;
  dropoffCounty?: string;
  dropoffState?: string;
  dropoffPostalCode?: string;
  appointmentAt?: string;
  ridePurpose?: string;
  specialInstructions?: string;
};

export async function updateMobileProfile(context: MobileUserContext, input: ProfileInput) {
  const name = clean(input.name) || context.user.name;
  const nameParts = splitName(name);
  const phone = clean(input.phone);
  const email = context.user.email;

  await db.user.update({
    where: { id: context.user.id },
    data: { name },
  });

  const existingRider = await findMobileRider(context);
  const rider = existingRider
    ? await db.rider.update({
        where: { id: existingRider.id },
        data: {
          displayName: name,
          firstName: nameParts.firstName,
          lastName: nameParts.lastName,
          phone,
          addressLine1: clean(input.addressLine1),
          city: clean(input.city),
          county: clean(input.county),
          state: clean(input.state) || "MO",
          postalCode: clean(input.postalCode),
          communicationPreference: clean(input.communicationPreference),
          pickupInstructions: clean(input.pickupInstructions),
          updatedById: context.user.id,
        },
      })
    : await db.rider.create({
        data: {
          organizationId: context.membership.organizationId,
          displayName: name,
          firstName: nameParts.firstName,
          lastName: nameParts.lastName,
          email,
          phone,
          addressLine1: clean(input.addressLine1),
          city: clean(input.city),
          county: clean(input.county),
          state: clean(input.state) || "MO",
          postalCode: clean(input.postalCode),
          communicationPreference: clean(input.communicationPreference),
          pickupInstructions: clean(input.pickupInstructions),
          status: "active",
          intakeDate: new Date(),
          createdById: context.user.id,
          updatedById: context.user.id,
        },
      });

  if (context.driver) {
    await db.driver.update({
      where: { id: context.driver.id },
      data: {
        displayName: name,
        firstName: nameParts.firstName,
        lastName: nameParts.lastName,
        phone,
        addressLine1: clean(input.addressLine1),
        city: clean(input.city),
        state: clean(input.state) || "MO",
        postalCode: clean(input.postalCode),
        updatedById: context.user.id,
      },
    });
  }

  await db.auditLog.create({
    data: {
      organizationId: context.membership.organizationId,
      actorUserId: context.user.id,
      action: "mobile.profile_updated",
      entityType: "User",
      entityId: context.user.id,
      riderId: rider.id,
      driverId: context.driver?.id,
      metadata: { source: "android" },
    },
  });

  return { ok: true, riderId: rider.id };
}

export async function createMobileRideRequest(context: MobileUserContext, input: RideRequestInput) {
  const appointmentAt = input.appointmentAt ? new Date(input.appointmentAt) : null;

  if (!appointmentAt || Number.isNaN(appointmentAt.getTime())) {
    throw new Error("Appointment date and time are required.");
  }

  const pickupAddress = clean(input.pickupAddress);
  const dropoffAddress = clean(input.dropoffAddress);
  const pickupCity = clean(input.pickupCity);
  const dropoffCity = clean(input.dropoffCity);

  if (!pickupAddress || !dropoffAddress || !pickupCity || !dropoffCity) {
    throw new Error("Pickup and dropoff address details are required.");
  }

  const ridePurpose = clean(input.ridePurpose) || (await defaultRidePurpose(context.membership.organizationId));
  const rider = (await findMobileRider(context)) ?? (await createDefaultMobileRider(context));

  const rideRequest = await db.rideRequest.create({
    data: {
      organizationId: context.membership.organizationId,
      riderId: rider.id,
      status: RideRequestStatus.PENDING_REVIEW,
      purpose: ridePurpose,
      requestSource: "mobile_app",
      neededAt: appointmentAt,
      specialInstructions: clean(input.specialInstructions),
      warnings: [],
      createdById: context.user.id,
      updatedById: context.user.id,
      tripLegs: {
        createMany: {
          data: {
            organizationId: context.membership.organizationId,
            sequence: 1,
            status: TripLegStatus.READY_TO_ASSIGN,
            scheduledPickupAt: appointmentAt,
            pickupAddress,
            pickupCity,
            pickupCounty: clean(input.pickupCounty),
            pickupState: clean(input.pickupState) || "MO",
            pickupPostalCode: clean(input.pickupPostalCode),
            dropoffAddress,
            dropoffCity,
            dropoffCounty: clean(input.dropoffCounty),
            dropoffState: clean(input.dropoffState) || "MO",
            dropoffPostalCode: clean(input.dropoffPostalCode),
            notes: clean(input.specialInstructions),
            createdById: context.user.id,
            updatedById: context.user.id,
          },
        },
      },
    },
    include: { tripLegs: true },
  });

  await db.statusHistory.create({
    data: {
      organizationId: context.membership.organizationId,
      entityType: "RideRequest",
      entityId: rideRequest.id,
      newStatus: rideRequest.status,
      changedById: context.user.id,
      rideRequestId: rideRequest.id,
      note: "Ride requested from Android mobile app.",
    },
  });

  await db.auditLog.create({
    data: {
      organizationId: context.membership.organizationId,
      actorUserId: context.user.id,
      action: "mobile.ride_requested",
      entityType: "RideRequest",
      entityId: rideRequest.id,
      riderId: rider.id,
      rideRequestId: rideRequest.id,
      metadata: { source: "android", tripLegCount: rideRequest.tripLegs.length },
    },
  });

  return {
    id: rideRequest.id,
    status: rideRequest.status,
    tripLegCount: rideRequest.tripLegs.length,
  };
}

async function findMobileRider(context: MobileUserContext) {
  return db.rider.findFirst({
    where: {
      organizationId: context.membership.organizationId,
      deletedAt: null,
      OR: [
        { email: context.user.email },
        ...(context.driver?.phone ? [{ phone: context.driver.phone }] : []),
      ],
    },
    orderBy: { updatedAt: "desc" },
  });
}

async function createDefaultMobileRider(context: MobileUserContext) {
  const nameParts = splitName(context.user.name);
  return db.rider.create({
    data: {
      organizationId: context.membership.organizationId,
      displayName: context.user.name,
      firstName: nameParts.firstName,
      lastName: nameParts.lastName,
      email: context.user.email,
      phone: context.driver?.phone,
      status: "active",
      intakeDate: new Date(),
      createdById: context.user.id,
      updatedById: context.user.id,
    },
  });
}

async function defaultRidePurpose(organizationId: string) {
  const purposes = await getSettingOptions(organizationId, "ridePurposes");
  return purposes[0]?.code ?? "medical";
}

function splitName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] ?? "Mobile",
    lastName: parts.slice(1).join(" ") || "Rider",
  };
}

function clean(value?: string | null) {
  const next = value?.trim();
  return next ? next : null;
}
