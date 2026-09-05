"use client";

import { AdminStepUpChip } from "@/features/admin-auth/components/admin-step-up-chip";
import { AdminSessionChip } from "@/features/admin-auth/components/admin-session-chip";
import { useAdminOverview } from "@/features/analytics/hooks/use-admin-overview";
import { resolveAdminTrail } from "@/lib/navigation/admin-navigation";
import { cn } from "@/lib/utils/cn";
import { ChevronRight, Menu, PanelLeft, Bell } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment } from "react";
import type { SidebarMode } from "@/components/layout/admin-sidebar";

type AdminTopbarProps = {
  desktopSidebarMode: SidebarMode;
  isMobileSidebarOpen: boolean;
  onDesktopSidebarToggle: () => void;
  onMobileMenuToggle: () => void;
};

/**
 * The old topbar showed a live clock. The operating system already has one,
 * so it was decoration occupying the most valuable strip on the screen.
 * Replaced with a breadcrumb trail, which tells you where you are and gets
 * you back up a level — something the sub-pages genuinely needed.
 */
export function AdminTopbar({
  desktopSidebarMode,
  isMobileSidebarOpen,
  onDesktopSidebarToggle,
  onMobileMenuToggle,
}: AdminTopbarProps) {
  const pathname = usePathname();
  const trail = resolveAdminTrail(pathname);
  const current = trail[trail.length - 1];
  const { data: overview } = useAdminOverview();
  const pendingReports = overview?.content.pendingReports ?? 0;
  const isDesktopCollapsed = desktopSidebarMode === "collapsed";

  return (
    <header className="relative z-20 flex h-[var(--sb-topbar-height)] shrink-0 items-center gap-3 border-b border-[var(--sb-border)] bg-[var(--sb-bg)] px-3 sm:px-4 lg:px-6">
      <button
        type="button"
        aria-controls="admin-sidebar"
        aria-expanded={isMobileSidebarOpen}
        aria-label="Open navigation menu"
        onClick={onMobileMenuToggle}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--sb-radius-sm)] text-[var(--sb-text-secondary)] transition-colors hover:bg-[var(--sb-surface-2)] hover:text-[var(--sb-text)] lg:hidden"
      >
        <Menu className="h-4 w-4" />
      </button>

      <button
        type="button"
        aria-controls="admin-sidebar"
        aria-expanded={!isDesktopCollapsed}
        aria-label={isDesktopCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        onClick={onDesktopSidebarToggle}
        className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-[var(--sb-radius-sm)] text-[var(--sb-text-secondary)] transition-colors hover:bg-[var(--sb-surface-2)] hover:text-[var(--sb-text)] lg:flex"
      >
        <PanelLeft className="h-4 w-4" />
      </button>

      {/* ── Breadcrumb ─────────────────────────────────────── */}
      <nav aria-label="Breadcrumb" className="min-w-0 flex-1">
        <ol className="flex min-w-0 items-center gap-1.5">
          {trail.map((item, index) => {
            const isLast = index === trail.length - 1;

            return (
              <Fragment key={item.href}>
                {index > 0 ? (
                  <ChevronRight
                    className="h-3.5 w-3.5 shrink-0 text-[var(--sb-text-tertiary)]"
                    aria-hidden="true"
                  />
                ) : null}
                <li className="min-w-0">
                  {isLast ? (
                    <span
                      aria-current="page"
                      className="block truncate text-[length:var(--sb-text-md)] font-semibold text-[var(--sb-text)]"
                    >
                      {item.label}
                    </span>
                  ) : (
                    <Link
                      href={item.href}
                      className="block truncate text-[length:var(--sb-text-base)] text-[var(--sb-text-secondary)] transition-colors hover:text-[var(--sb-text)]"
                    >
                      {item.label}
                    </Link>
                  )}
                </li>
              </Fragment>
            );
          })}
        </ol>

        {current?.description ? (
          <p className="hidden truncate text-[length:var(--sb-text-xs)] text-[var(--sb-text-tertiary)] xl:block">
            {current.description}
          </p>
        ) : null}
      </nav>

      {/* ── Actions ────────────────────────────────────────── */}
      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
        <Link
          href="/reports"
          aria-label={
            pendingReports > 0
              ? `${pendingReports} reports pending review`
              : "Reports"
          }
          className={cn(
            "relative flex h-8 w-8 items-center justify-center rounded-[var(--sb-radius-sm)]",
            "text-[var(--sb-text-secondary)] transition-colors hover:bg-[var(--sb-surface-2)] hover:text-[var(--sb-text)]",
          )}
        >
          <Bell className="h-4 w-4" />
          {pendingReports > 0 ? (
            <span className="sb-nums absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--sb-danger)] px-1 text-[10px] font-semibold text-[#0a0a0a]">
              {pendingReports > 99 ? "99+" : pendingReports}
            </span>
          ) : null}
        </Link>

        <AdminStepUpChip />
        <AdminSessionChip />
      </div>
    </header>
  );
}
