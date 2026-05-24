"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { requireAuthenticatedUser, requirePermission } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { permissionKeySchema } from "@/schemas/role-schema";

const emailSchema = z.string().trim().email().transform((value) => value.toLowerCase());

const createUserSchema = z.object({
  name: z.string().trim().min(1),
  email: emailSchema,
  roleId: z.string().cuid(),
});

const updateMembershipSchema = z.object({
  membershipId: z.string().cuid(),
  roleId: z.string().cuid(),
});

const createRoleSchema = z.object({
  key: z.string().trim().min(1).regex(/^[a-z0-9_:-]+$/),
  name: z.string().trim().min(1),
  description: z.string().trim().optional(),
  permissionKeys: z.array(permissionKeySchema).min(1),
});

const updateRolePermissionsSchema = z.object({
  roleId: z.string().cuid(),
  permissionKeys: z.array(permissionKeySchema),
});

export async function inviteUserAction(formData: FormData) {
  const user = await requireAuthenticatedUser();
  const membership = await requirePermission("admin:users:manage");
  const input = createUserSchema.parse({
    name: formData.get("name"),
    email: formData.get("email"),
    roleId: formData.get("roleId"),
  });
  const role = await getOrganizationRoleOrThrow(membership.organizationId, input.roleId);
  const targetUser = await db.user.upsert({
    where: { email: input.email },
    update: { name: input.name, organizationId: membership.organizationId, deletedAt: null },
    create: {
      email: input.email,
      name: input.name,
      organizationId: membership.organizationId,
    },
  });
  const targetMembership = await db.membership.upsert({
    where: {
      userId_organizationId: {
        userId: targetUser.id,
        organizationId: membership.organizationId,
      },
    },
    update: {
      roleId: role.id,
      updatedById: user.id,
      deletedAt: null,
      deletedById: null,
    },
    create: {
      userId: targetUser.id,
      organizationId: membership.organizationId,
      roleId: role.id,
      createdById: user.id,
      updatedById: user.id,
    },
  });

  await writeAdminAudit(membership.organizationId, user.id, "admin.user_upserted", "User", targetUser.id, {
    email: targetUser.email,
    role: role.key,
    membershipId: targetMembership.id,
  });
  revalidateAdmin();
}

export async function addMembershipAction(formData: FormData) {
  const user = await requireAuthenticatedUser();
  const membership = await requirePermission("admin:memberships:manage");
  const input = createUserSchema.parse({
    name: formData.get("name"),
    email: formData.get("email"),
    roleId: formData.get("roleId"),
  });
  const role = await getOrganizationRoleOrThrow(membership.organizationId, input.roleId);
  const targetUser = await db.user.upsert({
    where: { email: input.email },
    update: { name: input.name, organizationId: membership.organizationId, deletedAt: null },
    create: {
      email: input.email,
      name: input.name,
      organizationId: membership.organizationId,
    },
  });
  const targetMembership = await db.membership.upsert({
    where: {
      userId_organizationId: {
        userId: targetUser.id,
        organizationId: membership.organizationId,
      },
    },
    update: {
      roleId: role.id,
      updatedById: user.id,
      deletedAt: null,
      deletedById: null,
    },
    create: {
      userId: targetUser.id,
      organizationId: membership.organizationId,
      roleId: role.id,
      createdById: user.id,
      updatedById: user.id,
    },
  });

  await writeAdminAudit(membership.organizationId, user.id, "admin.membership_upserted", "Membership", targetMembership.id, {
    email: targetUser.email,
    role: role.key,
  });
  revalidateAdmin();
}

export async function updateMembershipRoleAction(formData: FormData) {
  const user = await requireAuthenticatedUser();
  const membership = await requirePermission("admin:memberships:manage");
  const input = updateMembershipSchema.parse({
    membershipId: formData.get("membershipId"),
    roleId: formData.get("roleId"),
  });
  const [targetMembership, role] = await Promise.all([
    db.membership.findFirstOrThrow({
      where: { id: input.membershipId, organizationId: membership.organizationId, deletedAt: null },
      include: { role: true, user: true },
    }),
    getOrganizationRoleOrThrow(membership.organizationId, input.roleId),
  ]);

  await db.membership.update({
    where: { id: targetMembership.id },
    data: { roleId: role.id, updatedById: user.id },
  });
  await writeAdminAudit(membership.organizationId, user.id, "admin.membership_role_changed", "Membership", targetMembership.id, {
    userEmail: targetMembership.user.email,
    oldRole: targetMembership.role.key,
    newRole: role.key,
  });
  revalidateAdmin();
}

export async function createRoleAction(formData: FormData) {
  const user = await requireAuthenticatedUser();
  const membership = await requirePermission("admin:roles:manage");
  const permissionKeys = formData.getAll("permissionKeys").map(String);
  const input = createRoleSchema.parse({
    key: formData.get("key"),
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    permissionKeys,
  });
  const permissions = await getPermissionsByKey(input.permissionKeys);
  const role = await db.role.create({
    data: {
      organizationId: membership.organizationId,
      key: input.key,
      name: input.name,
      description: input.description,
      createdById: user.id,
      updatedById: user.id,
      rolePermissions: {
        createMany: {
          data: permissions.map((permission) => ({
            permissionId: permission.id,
            createdById: user.id,
          })),
        },
      },
    },
  });

  await writeAdminAudit(membership.organizationId, user.id, "admin.role_created", "Role", role.id, {
    key: role.key,
    permissions: input.permissionKeys,
  });
  revalidateAdmin();
}

export async function updateRolePermissionsAction(formData: FormData) {
  const user = await requireAuthenticatedUser();
  const membership = await requirePermission("admin:roles:manage");
  const input = updateRolePermissionsSchema.parse({
    roleId: formData.get("roleId"),
    permissionKeys: formData.getAll("permissionKeys").map(String),
  });
  const role = await db.role.findFirstOrThrow({
    where: { id: input.roleId, organizationId: membership.organizationId, deletedAt: null },
    include: { rolePermissions: { include: { permission: true } } },
  });
  const permissions = await getPermissionsByKey(input.permissionKeys);

  const rolePermissionWrites = permissions.length > 0
    ? [
        db.rolePermission.createMany({
          data: permissions.map((permission) => ({
            roleId: role.id,
            permissionId: permission.id,
            createdById: user.id,
          })),
          skipDuplicates: true,
        }),
      ]
    : [];

  await db.$transaction([
    db.rolePermission.deleteMany({ where: { roleId: role.id } }),
    ...rolePermissionWrites,
    db.role.update({
      where: { id: role.id },
      data: { updatedById: user.id },
    }),
  ]);
  await writeAdminAudit(membership.organizationId, user.id, "admin.role_permissions_updated", "Role", role.id, {
    key: role.key,
    oldPermissions: role.rolePermissions.map((item) => item.permission.key).sort(),
    newPermissions: input.permissionKeys.sort(),
  });
  revalidateAdmin();
}

async function getOrganizationRoleOrThrow(organizationId: string, roleId: string) {
  return db.role.findFirstOrThrow({
    where: { id: roleId, organizationId, deletedAt: null },
  });
}

async function getPermissionsByKey(permissionKeys: string[]) {
  return db.permission.findMany({
    where: { key: { in: permissionKeys } },
    orderBy: { key: "asc" },
  });
}

async function writeAdminAudit(
  organizationId: string,
  actorUserId: string,
  action: string,
  entityType: string,
  entityId: string,
  metadata: Prisma.InputJsonValue
) {
  await db.auditLog.create({
    data: {
      organizationId,
      actorUserId,
      action,
      entityType,
      entityId,
      metadata,
    },
  });
}

function revalidateAdmin() {
  revalidatePath("/admin");
  revalidatePath("/admin/users");
  revalidatePath("/admin/roles");
  revalidatePath("/admin/memberships");
}
