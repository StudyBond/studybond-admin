import type { LucideIcon } from "lucide-react";
import {
  Activity,
  BadgeDollarSign,
  FileWarning,
  Gift,
  LayoutDashboard,
  LibraryBig,
  ShieldCheck,
  Trophy,
  UserRoundSearch,
  Users,
  Wrench,
} from "lucide-react";

export type AdminNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  description: string;
  mobile?: {
    primary?: boolean;
    order?: number;
    badge?: "pendingReports";
  };
};

export type AdminNavGroup = {
  title: string;
  items: AdminNavItem[];
};

export const adminNavigation: AdminNavGroup[] = [
  {
    title: "Overview",
    items: [
      {
        href: "/",
        label: "Dashboard",
        icon: LayoutDashboard,
        description: "Platform summary and key metrics",
        mobile: {
          primary: true,
          order: 1,
        },
      },
      {
        href: "/analytics",
        label: "Analytics",
        icon: Activity,
        description: "Usage trends and engagement data",
      },
      {
        href: "/users",
        label: "Users",
        icon: Users,
        description: "Manage user accounts",
        mobile: {
          primary: true,
          order: 4,
        },
      },
    ],
  },
  {
    title: "Content",
    items: [
      {
        href: "/reports",
        label: "Reports",
        icon: FileWarning,
        description: "Review reported questions",
        mobile: {
          primary: true,
          order: 2,
          badge: "pendingReports",
        },
      },
      {
        href: "/questions",
        label: "Questions",
        icon: LibraryBig,
        description: "Question bank management",
        mobile: {
          primary: true,
          order: 3,
        },
      },
      {
        href: "/questions/free-exam",
        label: "Free Exam Pool",
        icon: Gift,
        description: "Curate free exam questions",
      },
      {
        href: "/questions/free-exam/leaderboard",
        label: "Free Exam Leaderboard",
        icon: Trophy,
        description: "Top scorers by subject per reset cycle",
      },
      {
        href: "/premium",
        label: "Premium",
        icon: BadgeDollarSign,
        description: "Subscriptions and entitlements",
        mobile: {
          primary: true,
          order: 5,
        },
      },
    ],
  },
  {
    title: "Security",
    items: [
      {
        href: "/audit-logs",
        label: "Audit Logs",
        icon: ShieldCheck,
        description: "Admin activity history",
      },
      {
        href: "/settings",
        label: "Settings",
        icon: Wrench,
        description: "System configuration",
      },
      {
        href: "/users/banned",
        label: "Banned Users",
        icon: UserRoundSearch,
        description: "Manage restricted accounts",
      },
    ],
  },
];

export const adminNavigationItems = adminNavigation.flatMap((group) => group.items);

export function isAdminRouteActive(pathname: string, href: string) {
  return href === "/"
    ? pathname === "/"
    : pathname === href || pathname.startsWith(`${href}/`);
}

export function resolveAdminRoute(pathname: string) {
  return adminNavigationItems.find((item: any) => isAdminRouteActive(pathname, item.href));
}

export const adminMobilePrimaryNavigation = adminNavigationItems
  .filter((item: any) => item.mobile?.primary)
  .sort((left, right) => (left.mobile?.order ?? 99) - (right.mobile?.order ?? 99));
