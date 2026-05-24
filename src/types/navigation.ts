import type { LucideIcon } from "lucide-react";
import type { Permission } from "@/types/auth";

export type NavigationItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  permission: Permission;
};
