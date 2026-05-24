import { db } from "@/lib/db";

export async function getOrganizationUsers(organizationId: string) {
  return db.user.findMany({
    where: {
      memberships: {
        some: {
          organizationId,
          deletedAt: null,
        },
      },
      deletedAt: null,
    },
    include: {
      memberships: {
        where: {
          organizationId,
          deletedAt: null,
        },
        include: {
          role: true,
        },
      },
    },
    orderBy: {
      name: "asc",
    },
  });
}

export async function getOrganizationRoles(organizationId: string) {
  return db.role.findMany({
    where: {
      organizationId,
      deletedAt: null,
    },
    include: {
      rolePermissions: {
        include: {
          permission: true,
        },
        orderBy: {
          permission: {
            key: "asc",
          },
        },
      },
      _count: {
        select: {
          memberships: true,
        },
      },
    },
    orderBy: {
      name: "asc",
    },
  });
}

export async function getPermissions() {
  return db.permission.findMany({
    orderBy: { key: "asc" },
  });
}

export async function getOrganizationMemberships(organizationId: string) {
  return db.membership.findMany({
    where: {
      organizationId,
      deletedAt: null,
    },
    include: {
      user: true,
      role: true,
      organization: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}
