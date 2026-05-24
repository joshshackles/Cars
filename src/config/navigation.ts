import {
  AlertTriangle,
  Bell,
  Car,
  ClipboardList,
  Gauge,
  Home,
  Landmark,
  Map,
  Navigation,
  Settings,
  Shield,
  Users,
  WalletCards,
} from "lucide-react";
import type { NavigationItem } from "@/types/navigation";

export const navigationItems: NavigationItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: Home, permission: "dashboard:view" },
  { label: "Riders", href: "/riders", icon: Users, permission: "riders:view" },
  { label: "Drivers", href: "/drivers", icon: Car, permission: "drivers:view" },
  { label: "Ride Requests", href: "/ride-requests", icon: ClipboardList, permission: "ride_requests:view" },
  { label: "Dispatch", href: "/dispatch", icon: Map, permission: "dispatch:view" },
  { label: "Driver Portal", href: "/driver-portal", icon: Navigation, permission: "driver_portal:view" },
  { label: "Mileage", href: "/mileage", icon: Gauge, permission: "mileage:view" },
  { label: "Reimbursements", href: "/reimbursements", icon: WalletCards, permission: "reimbursements:view" },
  { label: "Reports", href: "/reports", icon: Landmark, permission: "reports:view" },
  { label: "Notifications", href: "/notifications", icon: Bell, permission: "incidents:view" },
  { label: "Incidents", href: "/incidents", icon: AlertTriangle, permission: "incidents:view" },
  { label: "Settings", href: "/settings", icon: Settings, permission: "settings:view" },
  { label: "Admin", href: "/admin", icon: Shield, permission: "admin:view" },
];
