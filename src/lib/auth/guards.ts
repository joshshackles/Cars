import { notFound, redirect } from "next/navigation";
import { hasPermission } from "@/lib/auth/permissions";
import { getCurrentUser, requireActiveMembership } from "@/lib/auth/session";
import type { Permission } from "@/types/auth";

export async function requireAuthenticatedUser() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function requirePermission(permission: Permission) {
  const membership = await requireActiveMembership();

  if (!hasPermission(membership, permission)) {
    notFound();
  }

  return membership;
}
