import { z } from "zod";

const optionSchema = z.object({
  code: z.string().min(1),
  label: z.string().min(1),
  active: z.boolean().optional(),
});

const timeValueSchema = z.string().regex(/^\d{2}:\d{2}$/).nullable();

export const settingValueSchemas = {
  countiesServed: z.array(optionSchema).min(1),
  ridePurposes: z.array(optionSchema).min(1),
  cancellationReasons: z.array(optionSchema).min(1),
  noShowReasons: z.array(optionSchema).min(1),
  incidentTypes: z.array(optionSchema).min(1),
  driverStatuses: z.array(optionSchema).min(1),
  driverOnboardingStatuses: z.array(optionSchema).min(1),
  backgroundCheckStatuses: z.array(optionSchema).min(1),
  reimbursementPreferences: z.array(optionSchema).min(1),
  riderStatuses: z.array(optionSchema).min(1),
  serviceHours: z.object({
    timezone: z.string().min(1),
    weekly: z.array(
      z.object({
        day: z.string().min(1),
        opensAt: timeValueSchema,
        closesAt: timeValueSchema,
        active: z.boolean(),
      })
    ),
  }),
  minimumSchedulingNotice: z.object({
    amount: z.number().int().min(0),
    unit: z.string().min(1),
  }),
  reimbursementRate: z.object({
    rateCents: z.number().int().min(0),
    unit: z.string().min(1),
    effectiveDate: z.string().min(1),
  }),
  reminderTemplates: z.array(
    optionSchema.extend({
      channel: z.string().min(1),
      body: z.string().min(1),
    })
  ),
  fundingSources: z.array(optionSchema).min(1),
  destinationTypes: z.array(optionSchema).min(1),
};

export const settingKeySchema = z.enum([
  "countiesServed",
  "ridePurposes",
  "cancellationReasons",
  "noShowReasons",
  "incidentTypes",
  "driverStatuses",
  "driverOnboardingStatuses",
  "backgroundCheckStatuses",
  "reimbursementPreferences",
  "riderStatuses",
  "serviceHours",
  "minimumSchedulingNotice",
  "reimbursementRate",
  "reminderTemplates",
  "fundingSources",
  "destinationTypes",
]);

export const updateSettingSchema = z.object({
  settingId: z.string().cuid(),
  key: settingKeySchema,
  value: z.string().min(1),
});
