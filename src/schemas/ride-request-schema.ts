import { z } from "zod";

const locationSchema = z.object({
  address: z.string().default(""),
  city: z.string().default(""),
  county: z.string().default(""),
  state: z.string().default("MO"),
  postalCode: z.string().optional(),
});

export const intakeRiderSchema = z.object({
  mode: z.enum(["existing", "create"]),
  riderId: z.string().cuid().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  county: z.string().optional(),
});

export const rideRequestIntakeSchema = z.object({
  rider: intakeRiderSchema,
  pickup: locationSchema,
  destination: locationSchema,
  stops: z.array(locationSchema).default([]),
  appointmentAt: z.coerce.date(),
  pickupWindowStart: z.coerce.date().optional(),
  pickupWindowEnd: z.coerce.date().optional(),
  returnTripNeeded: z.boolean().default(false),
  returnPickupAt: z.coerce.date().optional(),
  multipleStops: z.boolean().default(false),
  recurringRide: z.boolean().default(false),
  ridePurpose: z.string().min(1),
  requestSource: z.string().min(1),
  fundingSourceId: z.string().cuid().optional(),
  specialInstructions: z.string().optional(),
  internalNotes: z.string().optional(),
});

export type RideRequestIntakeInput = z.infer<typeof rideRequestIntakeSchema>;
