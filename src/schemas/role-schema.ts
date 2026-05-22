import { z } from "zod";

export const permissionKeySchema = z.enum([
  "dashboard:view",
  "riders:view",
  "riders:manage",
  "riders:sensitive:view",
  "drivers:view",
  "drivers:manage",
  "ride_requests:view",
  "ride_requests:manage",
  "dispatch:view",
  "dispatch:manage",
  "dispatch:override",
  "driver_portal:view",
  "driver_portal:update",
  "mileage:view",
  "mileage:manage",
  "reimbursements:view",
  "reimbursements:manage",
  "reports:view",
  "incidents:view",
  "settings:view",
  "settings:manage",
  "settings:audit",
  "admin:view",
  "admin:users:manage",
  "admin:roles:manage",
  "admin:memberships:manage",
]);

export const roleSchema = z.object({
  key: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  permissionKeys: z.array(permissionKeySchema),
});

export type RoleInput = z.infer<typeof roleSchema>;
