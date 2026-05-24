import { z } from "zod";

export const membershipSchema = z.object({
  userId: z.string().cuid(),
  organizationId: z.string().cuid(),
  roleId: z.string().cuid(),
});

export type MembershipInput = z.infer<typeof membershipSchema>;
