"use client";

import { useAdminOverview } from "@/features/analytics/hooks/use-admin-overview";
import {
  adminMobilePrimaryNavigation,
  isAdminRouteActive,
} from "@/lib/navigation/admin-navigation";
import { cn } from "@/lib/utils/cn";
import Link from "next/link";
import { usePathname } from "next/navigation";

function resolveBadgeCount(badge: "pendingReports" | undefined, pendingReports: number) {
  if (badge === "pendingReports") {
    return pendingReports;
  }

  return 0;
}

export function AdminBottomNav() {
  const pathname = usePathname();
  const { data: overview } = useAdminOverview();
  const pendingReports = overview?.content.pendingReports ?? 0;

  return (
    <nav
      aria-label="Primary admin navigation"
      className="admin-mobile-bottom-nav fixed inset-x-0 bottom-0 z-20 border-t border-white/[0.05] bg-[rgba(10,10,13,0.94)] backdrop-blur-xl lg:hidden"
    >
      <div className="mx-auto flex w-full max-w-screen-md items-center justify-between gap-1 px-2 pt-2">
        {adminMobilePrimaryNavigation.map((item: any) => {
          const Icon = item.icon;
          const isActive = isAdminRouteActive(pathname, item.href);
          const badgeCount = resolveBadgeCount(item.mobile?.badge, pendingReports);

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "group relative flex min-w-0 flex-1 flex-col items-center gap-1.5 rounded-[1.35rem] px-2 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] transition-colors duration-200",
                isActive
                  ? "text-white"
                  : "text-[color:var(--muted-foreground)] hover:text-white",
              )}
            >
              <span
                className={cn(
                  "relative flex h-10 w-10 items-center justify-center rounded-2xl border transition-all duration-200",
                  isActive
                    ? "border-[color:var(--accent-cyan)]/20 bg-[color:var(--accent-cyan)]/12 text-[color:var(--accent-cyan)] shadow-[0_10px_22px_rgba(110,196,184,0.12)]"
                    : "border-white/8 bg-white/[0.03] text-current group-hover:border-white/14 group-hover:bg-white/[0.05]",
                )}
              >
                <Icon className="h-4 w-4" />
                {badgeCount > 0 ? (
                  <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[color:var(--accent-rose)] px-1 text-[10px] font-bold text-white shadow-[0_2px_6px_rgba(184,120,114,0.4)]">
                    {badgeCount > 99 ? "99+" : badgeCount}
                  </span>
                ) : null}
              </span>

              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
