import { createHash, randomBytes } from "crypto";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { rolePermissions } from "@/lib/auth/permissions";
import type { AppRole, MembershipContext } from "@/types/auth";

const mobileSessionDays = 30;

export type MobileUserContext = Awaited<ReturnType<typeof requireMobileUser>>;

export async function createMobileSession(email: string, deviceName?: string, accessCode?: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const requiredAccessCode = process.env.MOBILE_LOGIN_CODE;

  if (requiredAccessCode && accessCode !== requiredAccessCode) {
    throw new Error("Invalid mobile login.");
  }

  const user = await db.user.findUnique({
    where: { email: normalizedEmail },
    include: {
      memberships: {
        where: { deletedAt: null },
        include: {
          organization: true,
          role: {
            include: {
              rolePermissions: {
                include: { permission: true },
              },
            },
          },
        },
      },
    },
  });

  if (!user || user.deletedAt) {
    throw new Error("Invalid mobile login.");
  }

  const membership = user.memberships[0];

  if (!membership) {
    throw new Error("No active organization membership was found.");
  }

  const driver = await db.driver.findFirst({
    where: {
      organizationId: membership.organizationId,
      email: user.email,
      deletedAt: null,
    },
  });

  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + mobileSessionDays);

  await db.mobileAuthSession.create({
    data: {
      userId: user.id,
      organizationId: membership.organizationId,
      tokenHash: hashToken(token),
      deviceName,
      platform: "android",
      expiresAt,
    },
  });

  return {
    token,
    expiresAt,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
    },
    organization: {
      id: membership.organization.id,
      name: membership.organization.name,
      slug: membership.organization.slug,
    },
    role: isAppRole(membership.role.key) ? membership.role.key : "driver",
    permissions: membership.role.rolePermissions
      .map((item) => item.permission.key)
      .filter((permission): permission is MembershipContext["permissions"][number] => isPermission(permission)),
    driver: driver
      ? {
          id: driver.id,
          name: driver.displayName,
          status: driver.status,
        }
      : null,
  };
}

export async function requireMobileUser(request: NextRequest) {
  const token = getBearerToken(request);

  if (!token) {
    throw new Error("Missing mobile authorization token.");
  }

  const session = await db.mobileAuthSession.findUnique({
    where: { tokenHash: hashToken(token) },
    include: {
      user: {
        include: {
          memberships: {
            where: { deletedAt: null },
            include: {
              organization: true,
              role: {
                include: {
                  rolePermissions: {
                    include: { permission: true },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!session || session.revokedAt || session.expiresAt <= new Date() || session.user.deletedAt) {
    throw new Error("Invalid or expired mobile session.");
  }

  const membership = session.user.memberships.find((item) => item.organizationId === session.organizationId);

  if (!membership) {
    throw new Error("No active organization membership was found.");
  }

  const permissions = membership.role.rolePermissions
    .map((item) => item.permission.key)
    .filter((permission): permission is MembershipContext["permissions"][number] =>
      isPermission(permission)
    );
  const role = isAppRole(membership.role.key) ? membership.role.key : "driver";

  const driver = await db.driver.findFirst({
    where: {
      organizationId: membership.organizationId,
      email: session.user.email,
      deletedAt: null,
    },
  });

  await db.mobileAuthSession.update({
    where: { id: session.id },
    data: { lastUsedAt: new Date() },
  });

  return {
    sessionId: session.id,
    user: {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
    },
    membership: {
      id: membership.id,
      organizationId: membership.organizationId,
      organizationName: membership.organization.name,
      organizationSlug: membership.organization.slug,
      role,
      permissions: permissions.length > 0 ? permissions : rolePermissions[role],
    },
    driver,
  };
}

export async function revokeMobileSession(request: NextRequest) {
  const token = getBearerToken(request);

  if (!token) {
    return;
  }

  await db.mobileAuthSession.updateMany({
    where: {
      tokenHash: hashToken(token),
      revokedAt: null,
    },
    data: { revokedAt: new Date() },
  });
}

function getBearerToken(request: NextRequest) {
  return request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() || null;
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function isAppRole(role: string): role is AppRole {
  return role in rolePermissions;
}

function isPermission(permission: string): permission is MembershipContext["permissions"][number] {
  return Object.values(rolePermissions).some((permissions) =>
    permissions.includes(permission as MembershipContext["permissions"][number])
  );
}
