"use client";

import { useAdminOverview } from "@/features/analytics/hooks/use-admin-overview";
import {
  adminMobilePrimaryNavigation,
  isAdminRouteActive,
} from "@/lib/navigation/admin-navigation";
import { cn } from "@/lib/utils/cn";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function AdminBottomNav() {
  const pathname = usePathname();
  const { data: overview } = useAdminOverview();
  const pendingReports = overview?.content.pendingReports ?? 0;

  return (
    <nav
      aria-label="Primary"
      className="sb-bottom-nav-inset fixed inset-x-0 bottom-0 z-20 border-t border-[var(--sb-border)] bg-[var(--sb-surface-1)] lg:hidden"
    >
      <ul className="mx-auto flex h-[var(--sb-bottom-nav-height)] max-w-lg items-stretch">
        {adminMobilePrimaryNavigation.map((item) => {
          const Icon = item.icon;
          const isActive = isAdminRouteActive(pathname, item.href);
          const badgeCount =
            item.mobile?.badge === "pendingReports" ? pendingReports : 0;

          return (
            <li key={item.href} className="min-w-0 flex-1">
              <Link
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "relative flex h-full flex-col items-center justify-center gap-1 px-1",
                  "text-[length:var(--sb-text-xs)] transition-colors duration-[var(--sb-duration-fast)]",
                  isActive
                    ? "text-[var(--sb-accent-text)]"
                    : "text-[var(--sb-text-tertiary)]",
                )}
              >
                {/* Active marker sits on the top edge, so the icon and label
                    never move between tabs. */}
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute inset-x-4 top-0 h-[2px] rounded-b-full bg-[var(--sb-accent)] transition-opacity duration-[var(--sb-duration-fast)]",
                    isActive ? "opacity-100" : "opacity-0",
                  )}
                />

                <span className="relative">
                  <Icon className="h-5 w-5" />
                  {badgeCount > 0 ? (
                    <span className="sb-nums absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--sb-danger)] px-1 text-[10px] font-semibold text-[#0a0a0a]">
                      {badgeCount > 99 ? "99+" : badgeCount}
                    </span>
                  ) : null}
                </span>

                <span className="w-full truncate text-center leading-none">
                  {item.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
