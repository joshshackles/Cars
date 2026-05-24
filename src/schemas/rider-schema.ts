import { z } from "zod";

export const riderFormSchema = z.object({
  firstName: z.string().min(1, "First name is required."),
  lastName: z.string().min(1, "Last name is required."),
  phone: z.string().optional(),
  email: z.string().email("Enter a valid email.").optional().or(z.literal("")),
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
  city: z.string().optional(),
  county: z.string().min(1, "County is required."),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  communicationPreference: z.string().optional(),
  mobilityNotes: z.string().optional(),
  riderNotes: z.string().optional(),
  sensitiveNotes: z.string().optional(),
  eligibilityConfirmed: z.boolean(),
  intakeDate: z.coerce.date().optional(),
  pickupInstructions: z.string().optional(),
  status: z.string().min(1, "Status is required."),
});

export type RiderFormInput = z.infer<typeof riderFormSchema>;
