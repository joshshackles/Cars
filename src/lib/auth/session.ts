import { cookies } from "next/headers";
import { isDemoLoginEmail, sessionCookieName } from "@/lib/auth/demo-users";
import { rolePermissions } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import type { AppRole, MembershipContext } from "@/types/auth";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  activeMembership: MembershipContext;
};

const requestedDemoRole = process.env.CARS_DEMO_ROLE ?? "organization_admin";
const demoRole = isAppRole(requestedDemoRole) ? requestedDemoRole : "organization_admin";
const demoEmail =
  process.env.CARS_DEMO_EMAIL ?? (demoRole === "driver" ? "driver@esc.example" : "admin@esc.example");
const demoName = process.env.CARS_DEMO_NAME ?? (demoRole === "driver" ? "Drew Driver" : "Olivia Admin");

const demoMembership: MembershipContext = {
  id: "demo-membership-economic-security-corporation",
  organizationId: "demo-economic-security-corporation",
  organizationName: "Economic Security Corporation",
  organizationSlug: "economic-security-corporation",
  role: demoRole,
  permissions: rolePermissions[demoRole] ?? rolePermissions.organization_admin,
};

export async function getCurrentUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const selectedEmail = cookieStore.get(sessionCookieName)?.value;
  const sessionEmail = selectedEmail && isDemoLoginEmail(selectedEmail) ? selectedEmail : null;

  if (!sessionEmail) {
    return null;
  }

  const databaseUser = await db.user.findUnique({
    where: { email: sessionEmail },
    include: {
      memberships: {
        where: { deletedAt: null },
        include: {
          organization: true,
          role: {
            include: {
              rolePermissions: {
                include: {
                  permission: true,
                },
              },
            },
          },
        },
        take: 1,
      },
    },
  });
  const activeMembership = databaseUser?.memberships[0];

  if (databaseUser && activeMembership) {
    const role = isAppRole(activeMembership.role.key) ? activeMembership.role.key : demoRole;
    const permissions = activeMembership.role.rolePermissions
      .map((item) => item.permission.key)
      .filter((permission): permission is MembershipContext["permissions"][number] =>
        isPermission(permission)
      );

    return {
      id: databaseUser.id,
      name: databaseUser.name,
      email: databaseUser.email,
      activeMembership: {
        id: activeMembership.id,
        organizationId: activeMembership.organizationId,
        organizationName: activeMembership.organization.name,
        organizationSlug: activeMembership.organization.slug,
        role,
        permissions: permissions.length > 0 ? permissions : rolePermissions[role],
      },
    };
  }

  return {
    id: "demo-user",
    name: demoName,
    email: sessionEmail ?? demoEmail,
    activeMembership: demoMembership,
  };
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("Authentication is not configured yet.");
  }

  return user;
}

export async function requireActiveMembership(): Promise<MembershipContext> {
  const user = await requireUser();

  return user.activeMembership;
}

function isAppRole(role: string): role is AppRole {
  return role in rolePermissions;
}

function isPermission(permission: string): permission is MembershipContext["permissions"][number] {
  return Object.values(rolePermissions).some((permissions) =>
    permissions.includes(permission as MembershipContext["permissions"][number])
  );
}
