import type { AppRole, Permission, MembershipContext } from "@/types/auth";

export const rolePermissions: Record<AppRole, Permission[]> = {
  system_admin: [
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
  ],
  organization_admin: [
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
  ],
  program_manager: [
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
    "reports:view",
    "incidents:view",
  ],
  dispatcher: [
    "dashboard:view",
    "riders:view",
    "riders:manage",
    "drivers:view",
    "drivers:manage",
    "ride_requests:view",
    "ride_requests:manage",
    "dispatch:view",
    "dispatch:manage",
    "incidents:view",
  ],
  finance_user: ["dashboard:view", "mileage:view", "mileage:manage", "reimbursements:view", "reimbursements:manage", "reports:view"],
  driver: ["dashboard:view", "driver_portal:view", "driver_portal:update", "mileage:view"],
  reporting_viewer: ["dashboard:view", "reports:view"],
  agency_partner: ["dashboard:view", "ride_requests:view", "reports:view"],
};

export const roleLabels: Record<AppRole, string> = {
  system_admin: "System Admin",
  organization_admin: "Organization Admin",
  program_manager: "Program Manager",
  dispatcher: "Dispatcher",
  finance_user: "Finance User",
  driver: "Driver",
  reporting_viewer: "Reporting Viewer",
  agency_partner: "Agency Partner",
};

export function hasPermission(
  membership: Pick<MembershipContext, "permissions"> | null,
  permission: Permission
) {
  return Boolean(membership?.permissions.includes(permission));
}

export function hasAnyPermission(
  membership: Pick<MembershipContext, "permissions"> | null,
  permissions: Permission[]
) {
  return permissions.some((permission) => hasPermission(membership, permission));
}

export function getPermissionsForRole(role: AppRole) {
  return rolePermissions[role];
}
