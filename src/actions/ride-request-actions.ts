"use server";

import { RideRequestStatus, TripLegStatus, type Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAuthenticatedUser, requirePermission } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { buildIntakeWarnings } from "@/lib/ride-requests/intake-warnings";
import { getSettingOptions, getSettingValue, isValidSettingOptionCode } from "@/lib/settings/settings-service";
import { rideRequestIntakeSchema, type RideRequestIntakeInput } from "@/schemas/ride-request-schema";

const rideRequestStatusLabels: Record<RideRequestStatus, string> = {
  DRAFT: "Draft",
  REQUESTED: "Requested",
  PENDING_REVIEW: "Pending review",
  PENDING_ASSIGNMENT: "Pending assignment",
  SCHEDULED: "Scheduled",
  COMPLETED: "Completed",
  CANCELED: "Canceled",
  DENIED: "Denied",
  UNRESOLVED: "Unresolved",
};

export async function createRideRequestIntakeAction(formData: FormData) {
  const user = await requireAuthenticatedUser();
  const membership = await requirePermission("ride_requests:manage");
  const input = await parseIntakeForm(formData);

  await validateIntakeSettings(membership.organizationId, input);

  if (input.rider.mode === "existing" && !input.rider.riderId) {
    throw new Error("Select an existing rider or switch to create rider.");
  }

  const rider =
    input.rider.mode === "existing"
      ? await db.rider.findFirstOrThrow({
          where: { id: input.rider.riderId, organizationId: membership.organizationId, deletedAt: null },
        })
      : await db.rider.create({
          data: {
            organizationId: membership.organizationId,
            firstName: input.rider.firstName || "Unknown",
            lastName: input.rider.lastName || "Rider",
            displayName: `${input.rider.firstName || "Unknown"} ${input.rider.lastName || "Rider"}`.trim(),
            phone: input.rider.phone || null,
            email: input.rider.email || null,
            county: input.rider.county || input.pickup.county,
            status: "active",
            intakeDate: new Date(),
            createdById: user.id,
            updatedById: user.id,
          },
        });

  const countiesServed = await getSettingOptions(membership.organizationId, "countiesServed");
  const notice = await getSettingValue<{ amount: number }>(membership.organizationId, "minimumSchedulingNotice");
  const warnings = buildIntakeWarnings({
    input,
    countiesServed,
    riderContact: { phone: rider.phone, email: rider.email },
    minimumNoticeDays: notice?.amount ?? 2,
  });

  const rideRequest = await db.rideRequest.create({
    data: {
      organizationId: membership.organizationId,
      riderId: rider.id,
      fundingSourceId: input.fundingSourceId || null,
      status: warnings.length > 0 ? "PENDING_REVIEW" : "PENDING_ASSIGNMENT",
      purpose: input.ridePurpose,
      requestSource: input.requestSource,
      neededAt: input.appointmentAt,
      pickupWindowStart: input.pickupWindowStart,
      pickupWindowEnd: input.pickupWindowEnd,
      returnTripNeeded: input.returnTripNeeded,
      multipleStops: input.multipleStops || input.stops.length > 0,
      recurringRide: input.recurringRide,
      specialInstructions: input.specialInstructions,
      internalNotes: input.internalNotes,
      warnings,
      createdById: user.id,
      updatedById: user.id,
      tripLegs: {
        createMany: {
          data: buildTripLegs(input, membership.organizationId, user.id),
        },
      },
    },
    include: { tripLegs: true },
  });

  await db.auditLog.create({
    data: {
      organizationId: membership.organizationId,
      actorUserId: user.id,
      action: "ride_request.intake_created",
      entityType: "RideRequest",
      entityId: rideRequest.id,
      rideRequestId: rideRequest.id,
      metadata: { warnings, tripLegCount: rideRequest.tripLegs.length },
    },
  });

  await db.statusHistory.create({
    data: {
      organizationId: membership.organizationId,
      entityType: "RideRequest",
      entityId: rideRequest.id,
      newStatus: rideRequest.status,
      changedById: user.id,
      rideRequestId: rideRequest.id,
      note: "Ride request created through intake.",
    },
  });

  revalidatePath("/ride-requests");
  redirect("/ride-requests");
}

export async function markRideRequestReviewedAction(rideRequestId: string) {
  await changeRideRequestStatus({
    rideRequestId,
    nextStatus: RideRequestStatus.PENDING_ASSIGNMENT,
    note: "Request reviewed and moved to assignment queue.",
  });
}

export async function completeRideRequestAction(rideRequestId: string) {
  await changeRideRequestStatus({
    rideRequestId,
    nextStatus: RideRequestStatus.COMPLETED,
    note: "Request marked completed from request queue.",
  });
}

export async function cancelRideRequestAction(rideRequestId: string, formData: FormData) {
  const reason = String(formData.get("reason") ?? "").trim();
  await changeRideRequestStatus({
    rideRequestId,
    nextStatus: RideRequestStatus.CANCELED,
    note: reason || "Request canceled from request queue.",
  });
}

export async function updateRideRequestAction(formData: FormData) {
  const user = await requireAuthenticatedUser();
  const membership = await requirePermission("ride_requests:manage");
  const rideRequestId = String(formData.get("rideRequestId") ?? "");
  const nextStatus = parseRideRequestStatus(String(formData.get("status") ?? ""));
  const purpose = String(formData.get("purpose") ?? "").trim();
  const requestSource = String(formData.get("requestSource") ?? "").trim();
  const fundingSourceId = String(formData.get("fundingSourceId") ?? "").trim() || null;
  const neededAtValue = String(formData.get("neededAt") ?? "");
  const pickupWindowStartValue = String(formData.get("pickupWindowStart") ?? "");
  const pickupWindowEndValue = String(formData.get("pickupWindowEnd") ?? "");
  const specialInstructions = String(formData.get("specialInstructions") ?? "").trim() || null;
  const internalNotes = String(formData.get("internalNotes") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!purpose) {
    throw new Error("Ride purpose is required.");
  }

  if (!requestSource) {
    throw new Error("Request source is required.");
  }

  await validateRidePurpose(membership.organizationId, purpose);

  if (fundingSourceId) {
    await db.fundingSource.findFirstOrThrow({
      where: { id: fundingSourceId, organizationId: membership.organizationId, deletedAt: null },
    });
  }

  const existing = await db.rideRequest.findFirstOrThrow({
    where: { id: rideRequestId, organizationId: membership.organizationId, deletedAt: null },
  });

  const neededAt = new Date(neededAtValue);
  if (Number.isNaN(neededAt.getTime())) {
    throw new Error("Appointment date is required.");
  }

  await db.rideRequest.update({
    where: { id: existing.id },
    data: {
      status: nextStatus,
      purpose,
      requestSource,
      fundingSourceId,
      neededAt,
      pickupWindowStart: pickupWindowStartValue ? new Date(pickupWindowStartValue) : null,
      pickupWindowEnd: pickupWindowEndValue ? new Date(pickupWindowEndValue) : null,
      specialInstructions,
      internalNotes,
      notes,
      updatedById: user.id,
    },
  });

  if (existing.status !== nextStatus) {
    await writeRideRequestStatusHistory({
      organizationId: membership.organizationId,
      userId: user.id,
      rideRequestId: existing.id,
      oldStatus: existing.status,
      newStatus: nextStatus,
      note: `Status changed to ${rideRequestStatusLabels[nextStatus]} from edit screen.`,
    });
  }

  await db.auditLog.create({
    data: {
      organizationId: membership.organizationId,
      actorUserId: user.id,
      action: "ride_request.updated",
      entityType: "RideRequest",
      entityId: existing.id,
      rideRequestId: existing.id,
      metadata: {
        previousStatus: existing.status,
        nextStatus,
        purpose,
        requestSource,
        fundingSourceId,
      },
    },
  });

  revalidateRideRequestViews();
  redirect("/ride-requests");
}

async function changeRideRequestStatus({
  rideRequestId,
  nextStatus,
  note,
}: {
  rideRequestId: string;
  nextStatus: RideRequestStatus;
  note: string;
}) {
  const user = await requireAuthenticatedUser();
  const membership = await requirePermission("ride_requests:manage");

  const request = await db.rideRequest.findFirstOrThrow({
    where: { id: rideRequestId, organizationId: membership.organizationId, deletedAt: null },
    include: { tripLegs: { where: { deletedAt: null } } },
  });

  if (request.status === nextStatus) {
    return;
  }

  const nextTripStatus = getTripStatusForRequestStatus(nextStatus);
  const changedTripLegs = nextTripStatus
    ? request.tripLegs.filter((leg) => leg.status !== nextTripStatus)
    : [];

  await db.$transaction(async (tx) => {
    await tx.rideRequest.update({
      where: { id: request.id },
      data: {
        status: nextStatus,
        updatedById: user.id,
      },
    });

    await tx.statusHistory.create({
      data: {
        organizationId: membership.organizationId,
        entityType: "RideRequest",
        entityId: request.id,
        oldStatus: request.status,
        newStatus: nextStatus,
        changedById: user.id,
        rideRequestId: request.id,
        note,
      },
    });

    if (nextTripStatus && changedTripLegs.length > 0) {
      await tx.tripLeg.updateMany({
        where: {
          id: { in: changedTripLegs.map((leg) => leg.id) },
          organizationId: membership.organizationId,
          deletedAt: null,
        },
        data: {
          status: nextTripStatus,
          completedAt: nextTripStatus === TripLegStatus.COMPLETED ? new Date() : undefined,
          updatedById: user.id,
        },
      });

      await tx.statusHistory.createMany({
        data: changedTripLegs.map((leg) => ({
          organizationId: membership.organizationId,
          entityType: "TripLeg",
          entityId: leg.id,
          oldStatus: leg.status,
          newStatus: nextTripStatus,
          changedById: user.id,
          rideRequestId: request.id,
          tripLegId: leg.id,
          note: `Trip leg updated because ride request moved to ${rideRequestStatusLabels[nextStatus]}.`,
        })),
      });
    }

    await tx.auditLog.create({
      data: {
        organizationId: membership.organizationId,
        actorUserId: user.id,
        action: "ride_request.status_changed",
        entityType: "RideRequest",
        entityId: request.id,
        rideRequestId: request.id,
        metadata: {
          oldStatus: request.status,
          newStatus: nextStatus,
          note,
          affectedTripLegs: changedTripLegs.length,
        },
      },
    });
  });

  revalidateRideRequestViews();
}

function getTripStatusForRequestStatus(status: RideRequestStatus) {
  if (status === RideRequestStatus.COMPLETED) {
    return TripLegStatus.COMPLETED;
  }

  if (status === RideRequestStatus.CANCELED || status === RideRequestStatus.DENIED) {
    return TripLegStatus.CANCELED;
  }

  if (status === RideRequestStatus.PENDING_ASSIGNMENT || status === RideRequestStatus.SCHEDULED) {
    return TripLegStatus.READY_TO_ASSIGN;
  }

  return null;
}

function parseRideRequestStatus(status: string) {
  if (Object.values(RideRequestStatus).includes(status as RideRequestStatus)) {
    return status as RideRequestStatus;
  }

  throw new Error("Invalid ride request status.");
}

async function validateRidePurpose(organizationId: string, purpose: string) {
  const purposeValid = await isValidSettingOptionCode(organizationId, "ridePurposes", purpose);
  if (!purposeValid) throw new Error("Ride purpose is not valid for this organization.");
}

async function writeRideRequestStatusHistory({
  organizationId,
  userId,
  rideRequestId,
  oldStatus,
  newStatus,
  note,
}: {
  organizationId: string;
  userId: string;
  rideRequestId: string;
  oldStatus: RideRequestStatus;
  newStatus: RideRequestStatus;
  note: string;
}) {
  await db.statusHistory.create({
    data: {
      organizationId,
      entityType: "RideRequest",
      entityId: rideRequestId,
      oldStatus,
      newStatus,
      changedById: userId,
      rideRequestId,
      note,
    },
  });
}

function revalidateRideRequestViews() {
  revalidatePath("/ride-requests");
  revalidatePath("/dashboard");
  revalidatePath("/dispatch");
  revalidatePath("/dispatch/weekly");
  revalidatePath("/reports");
}

function buildTripLegs(
  input: RideRequestIntakeInput,
  organizationId: string,
  userId: string
): Prisma.TripLegCreateManyRideRequestInput[] {
  const stops = input.stops;
  const outboundSegments = [input.pickup, ...stops].map((pickup, index) => ({
    pickup,
    dropoff: stops[index] ?? input.destination,
  }));
  const legs = outboundSegments.map((segment, index) =>
    legData({ organizationId, userId, sequence: index + 1, pickup: segment.pickup, dropoff: segment.dropoff, scheduledPickupAt: input.pickupWindowStart ?? input.appointmentAt, scheduledDropoffAt: input.appointmentAt, notes: input.specialInstructions })
  );

  if (input.returnTripNeeded) {
    legs.push(
      legData({
        organizationId,
        userId,
        sequence: legs.length + 1,
        pickup: input.destination,
        dropoff: input.pickup,
        scheduledPickupAt: input.returnPickupAt ?? input.appointmentAt,
        notes: "Return trip",
      })
    );
  }

  return legs;
}

function legData({
  organizationId,
  userId,
  sequence,
  pickup,
  dropoff,
  scheduledPickupAt,
  scheduledDropoffAt,
  notes,
}: {
  organizationId: string;
  userId: string;
  sequence: number;
  pickup: RideRequestIntakeInput["pickup"];
  dropoff: RideRequestIntakeInput["destination"];
  scheduledPickupAt: Date;
  scheduledDropoffAt?: Date;
  notes?: string;
}): Prisma.TripLegCreateManyRideRequestInput {
  return {
    organizationId,
    sequence,
    status: "READY_TO_ASSIGN",
    scheduledPickupAt,
    scheduledDropoffAt,
    pickupAddress: pickup.address,
    pickupCity: pickup.city,
    pickupCounty: pickup.county,
    pickupState: pickup.state,
    pickupPostalCode: pickup.postalCode,
    dropoffAddress: dropoff.address,
    dropoffCity: dropoff.city,
    dropoffCounty: dropoff.county,
    dropoffState: dropoff.state,
    dropoffPostalCode: dropoff.postalCode,
    notes,
    createdById: userId,
    updatedById: userId,
  };
}

async function validateIntakeSettings(organizationId: string, input: RideRequestIntakeInput) {
  await validateRidePurpose(organizationId, input.ridePurpose);
}

async function parseIntakeForm(formData: FormData) {
  const stopIndexes = ["1", "2", "3"];
  return rideRequestIntakeSchema.parse({
    rider: {
      mode: formData.get("riderMode"),
      riderId: formData.get("riderId") || undefined,
      firstName: formData.get("firstName") || undefined,
      lastName: formData.get("lastName") || undefined,
      phone: formData.get("phone") || undefined,
      email: formData.get("email") || undefined,
      county: formData.get("riderCounty") || undefined,
    },
    pickup: locationFromForm(formData, "pickup"),
    destination: locationFromForm(formData, "destination"),
    stops: stopIndexes.map((index) => locationFromForm(formData, `stop${index}`)).filter((location) => location.address || location.city || location.county),
    appointmentAt: formData.get("appointmentAt"),
    pickupWindowStart: formData.get("pickupWindowStart") || undefined,
    pickupWindowEnd: formData.get("pickupWindowEnd") || undefined,
    returnTripNeeded: formData.get("returnTripNeeded") === "on",
    returnPickupAt: formData.get("returnPickupAt") || undefined,
    multipleStops: formData.get("multipleStops") === "on",
    recurringRide: formData.get("recurringRide") === "on",
    ridePurpose: formData.get("ridePurpose"),
    requestSource: formData.get("requestSource"),
    fundingSourceId: formData.get("fundingSourceId") || undefined,
    specialInstructions: formData.get("specialInstructions") || undefined,
    internalNotes: formData.get("internalNotes") || undefined,
  });
}

function locationFromForm(formData: FormData, prefix: string) {
  return {
    address: String(formData.get(`${prefix}Address`) ?? ""),
    city: String(formData.get(`${prefix}City`) ?? ""),
    county: String(formData.get(`${prefix}County`) ?? ""),
    state: String(formData.get(`${prefix}State`) || "MO"),
    postalCode: String(formData.get(`${prefix}PostalCode`) ?? "") || undefined,
  };
}
