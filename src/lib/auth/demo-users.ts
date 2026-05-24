import type { AppRole } from "@/types/auth";

export const sessionCookieName = "cars_session_email";

export type DemoLoginUser = {
  email: string;
  name: string;
  role: AppRole;
  description: string;
};

export const demoLoginUsers: DemoLoginUser[] = [
  {
    email: "admin@esc.example",
    name: "Olivia Admin",
    role: "organization_admin",
    description: "Full organization administration and setup access.",
  },
  {
    email: "dispatcher@esc.example",
    name: "Dana Dispatcher",
    role: "dispatcher",
    description: "Ride intake, dispatch board, assignment, and exceptions.",
  },
  {
    email: "driver@esc.example",
    name: "Drew Driver",
    role: "driver",
    description: "Mobile driver portal and assigned trip workflow.",
  },
  {
    email: "finance@esc.example",
    name: "Finley Finance",
    role: "finance_user",
    description: "Mileage review, reimbursements, and finance exports.",
  },
  {
    email: "reports@esc.example",
    name: "Riley Reports",
    role: "reporting_viewer",
    description: "Read-only operational reporting and metrics.",
  },
];

export function isDemoLoginEmail(email: string) {
  return demoLoginUsers.some((user) => user.email === email);
}
