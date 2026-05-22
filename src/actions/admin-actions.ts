"use server";

import { requirePermission } from "@/lib/auth/guards";

export async function inviteUserAction() {
  await requirePermission("admin:users:manage");
  throw new Error("Invitations are not implemented yet.");
}

export async function updateMembershipRoleAction() {
  await requirePermission("admin:memberships:manage");
  throw new Error("Membership role updates are not implemented yet.");
}

export async function updateRolePermissionsAction() {
  await requirePermission("admin:roles:manage");
  throw new Error("Role permission updates are not implemented yet.");
}
