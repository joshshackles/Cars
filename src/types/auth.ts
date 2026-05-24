export type AppRole =
  | "system_admin"
  | "organization_admin"
  | "program_manager"
  | "dispatcher"
  | "finance_user"
  | "driver"
  | "reporting_viewer"
  | "agency_partner";

export type Permission =
  | "dashboard:view"
  | "riders:view"
  | "riders:manage"
  | "riders:sensitive:view"
  | "drivers:view"
  | "drivers:manage"
  | "ride_requests:view"
  | "ride_requests:manage"
  | "dispatch:view"
  | "dispatch:manage"
  | "dispatch:override"
  | "driver_portal:view"
  | "driver_portal:update"
  | "mileage:view"
  | "mileage:manage"
  | "reimbursements:view"
  | "reimbursements:manage"
  | "reports:view"
  | "incidents:view"
  | "settings:view"
  | "settings:manage"
  | "settings:audit"
  | "admin:view"
  | "admin:users:manage"
  | "admin:roles:manage"
  | "admin:memberships:manage";

export type MembershipContext = {
  id: string;
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  role: AppRole;
  permissions: Permission[];
};
