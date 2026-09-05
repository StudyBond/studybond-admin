import type { LucideIcon } from "lucide-react";
import {
  ChartNoAxesCombined,
  FileWarning,
  Gift,
  LayoutDashboard,
  LibraryBig,
  ScrollText,
  Settings,
  Sparkles,
  Trophy,
  UserRound,
  UserRoundX,
} from "lucide-react";

/**
 * Navigation is grouped by WHAT YOU ARE OPERATING ON, not by loose theme.
 *
 * The previous grouping put Users under "Overview" while Banned Users sat
 * under "Security", so the two user screens lived in unrelated groups.
 * Premium (billing) sat under "Content". Settings (system config) sat under
 * "Security". And the Free Exam Leaderboard was a top-level row even though
 * it is a sub-view of Free Exam Pool, which is itself part of Questions.
 *
 * Now: Overview / Content / People / System, and genuinely nested screens
 * are `children` — they appear in the sidebar only when you are inside
 * that section, instead of permanently padding the top level.
 */

export type AdminNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** One line, shown in the topbar. Say what the screen is FOR. */
  description: string;
  /** Sub-screens. Revealed in the sidebar only within this section. */
  children?: AdminNavItem[];
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
        description: "What needs your attention right now",
        mobile: { primary: true, order: 1 },
      },
      {
        href: "/analytics",
        label: "Analytics",
        icon: ChartNoAxesCombined,
        description: "Usage trends, engagement, and system health",
        children: [
          {
            href: "/analytics/premium",
            label: "Premium insights",
            icon: Sparkles,
            description: "Subscription revenue and conversion trends",
          },
          {
            href: "/analytics/system-health",
            label: "System health",
            icon: ScrollText,
            description: "Dependencies, queues, and delivery failures",
          },
        ],
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
        description: "Question issues reported by learners",
        mobile: { primary: true, order: 2, badge: "pendingReports" },
      },
      {
        href: "/questions",
        label: "Questions",
        icon: LibraryBig,
        description: "Search, edit, and upload the question bank",
        mobile: { primary: true, order: 3 },
      },
      {
        href: "/questions/free-exam",
        label: "Free exam pool",
        icon: Gift,
        description: "Curate the questions free learners can practise",
        children: [
          {
            href: "/questions/free-exam/leaderboard",
            label: "Leaderboard",
            icon: Trophy,
            description: "Top scorers by subject, per reset cycle",
          },
        ],
      },
    ],
  },
  {
    title: "People",
    items: [
      {
        href: "/users",
        label: "Users",
        icon: UserRound,
        description: "Search accounts, manage roles and access",
        mobile: { primary: true, order: 4 },
      },
      {
        href: "/premium",
        label: "Premium",
        icon: Sparkles,
        description: "Subscriptions, entitlements, and renewals",
        mobile: { primary: true, order: 5 },
      },
      {
        href: "/users/banned",
        label: "Banned users",
        icon: UserRoundX,
        description: "Restricted accounts and reinstatement",
      },
    ],
  },
  {
    title: "System",
    items: [
      {
        href: "/audit-logs",
        label: "Audit logs",
        icon: ScrollText,
        description: "Every admin action, with who and when",
      },
      {
        href: "/settings",
        label: "Settings",
        icon: Settings,
        description: "Institutions, announcements, and configuration",
      },
    ],
  },
];

/** Flat list including children — used for topbar/breadcrumb resolution. */
export const adminNavigationItems: AdminNavItem[] = adminNavigation.flatMap(
  (group) => group.items.flatMap((item) => [item, ...(item.children ?? [])]),
);

/** Top-level items only. */
export const adminTopLevelItems: AdminNavItem[] = adminNavigation.flatMap(
  (group) => group.items,
);

export function isAdminRouteActive(pathname: string, href: string) {
  return href === "/"
    ? pathname === "/"
    : pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Resolve the most specific matching route.
 *
 * The old version returned the first match in declaration order, so
 * /questions/free-exam/leaderboard resolved to "Questions" and the topbar
 * showed the wrong screen name. Longest matching href wins instead.
 */
export function resolveAdminRoute(pathname: string): AdminNavItem | undefined {
  return adminNavigationItems
    .filter((item) => isAdminRouteActive(pathname, item.href))
    .sort((left, right) => right.href.length - left.href.length)[0];
}

/** Breadcrumb trail: parent section then current screen. */
export function resolveAdminTrail(pathname: string): AdminNavItem[] {
  const trail: AdminNavItem[] = [];

  for (const group of adminNavigation) {
    for (const item of group.items) {
      const child = item.children?.find((entry) =>
        isAdminRouteActive(pathname, entry.href),
      );

      if (child) {
        trail.push(item, child);
        return trail;
      }

      if (isAdminRouteActive(pathname, item.href)) {
        trail.push(item);
        return trail;
      }
    }
  }

  return trail;
}

/** Section a path belongs to, so the sidebar knows what to expand. */
export function resolveAdminSection(pathname: string): AdminNavItem | undefined {
  return resolveAdminTrail(pathname)[0];
}

export const adminMobilePrimaryNavigation = adminTopLevelItems
  .filter((item) => item.mobile?.primary)
  .sort(
    (left, right) => (left.mobile?.order ?? 99) - (right.mobile?.order ?? 99),
  );
