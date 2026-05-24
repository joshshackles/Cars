import { z } from "zod";

export const userRoleSchema = z.enum([
  "system_admin",
  "organization_admin",
  "program_manager",
  "dispatcher",
  "finance_user",
  "driver",
  "reporting_viewer",
  "agency_partner",
]);

export const inviteUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  role: userRoleSchema,
  organizationId: z.string().cuid(),
});

export type InviteUserInput = z.infer<typeof inviteUserSchema>;
