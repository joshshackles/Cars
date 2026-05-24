import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/auth/permissions";
import { getCurrentUser } from "@/lib/auth/session";
import type { Permission } from "@/types/auth";

export async function requireAuthenticatedUser() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function requirePermission(permission: Permission) {
  const user = await requireAuthenticatedUser();
  const membership = user.activeMembership;

  if (!hasPermission(membership, permission)) {
    redirect(`/access-denied?permission=${encodeURIComponent(permission)}`);
  }

  return membership;
}
