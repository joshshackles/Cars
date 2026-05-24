import { z } from "zod";

export const driverFormSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  countiesServed: z.array(z.string()).default([]),
  preferredRideTypes: z.array(z.string()).default([]),
  vehicleMake: z.string().optional(),
  vehicleModel: z.string().optional(),
  vehicleYear: z.coerce.number().int().min(1900).max(2100).optional(),
  licenseVerificationDate: z.coerce.date().optional(),
  insuranceVerificationDate: z.coerce.date().optional(),
  backgroundCheckStatus: z.string().optional(),
  onboardingStatus: z.string().optional(),
  reimbursementPreference: z.string().optional(),
  status: z.string().min(1),
  driverNotes: z.string().optional(),
});

export const driverAvailabilitySchema = z.object({
  availabilityType: z.enum(["one_time", "recurring", "blackout"]),
  status: z.enum(["AVAILABLE", "UNAVAILABLE", "TENTATIVE"]),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
  recurrenceRule: z.string().optional(),
  blackoutDate: z.coerce.date().optional(),
  preferredCounties: z.array(z.string()).default([]),
  maxDistanceMiles: z.coerce.number().int().min(0).optional(),
  notes: z.string().optional(),
});
