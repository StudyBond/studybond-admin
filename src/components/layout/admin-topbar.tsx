"use client";

import { AdminStepUpChip } from "@/features/admin-auth/components/admin-step-up-chip";
import { AdminSessionChip } from "@/features/admin-auth/components/admin-session-chip";
import { useAdminOverview } from "@/features/analytics/hooks/use-admin-overview";
import { resolveAdminRoute } from "@/lib/navigation/admin-navigation";
import { cn } from "@/lib/utils/cn";
import { usePathname } from "next/navigation";
import {
  Bell,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { SidebarMode } from "@/components/layout/admin-sidebar";

function LiveClock() {
  const [time, setTime] = useState("");

  useEffect(() => {
    const fmt = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }),
      );
    };
    fmt();
    const id = setInterval(fmt, 30_000);
    return () => clearInterval(id);
  }, []);

  if (!time) return null;
  return (
    <span className="hidden text-xs tabular-nums text-[color:var(--muted-foreground)] xl:block">
      {time}
    </span>
  );
}

type AdminTopbarProps = {
  desktopSidebarMode: SidebarMode;
  isMobileSidebarOpen: boolean;
  onDesktopSidebarToggle: () => void;
  onMobileMenuToggle: () => void;
};

export function AdminTopbar({
  desktopSidebarMode,
  isMobileSidebarOpen,
  onDesktopSidebarToggle,
  onMobileMenuToggle,
}: AdminTopbarProps) {
  const pathname = usePathname();
  const currentRoute = resolveAdminRoute(pathname);
  const { data: overview } = useAdminOverview();
  const pendingReports = overview?.content.pendingReports ?? 0;
  const isDesktopCollapsed = desktopSidebarMode === "collapsed";

  return (
    <header className="relative z-20 shrink-0 overflow-x-clip border-b border-white/[0.04] bg-[rgba(12,12,15,0.82)] px-4 py-3 backdrop-blur-xl sm:px-5 md:px-6 lg:px-8">
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            aria-controls="admin-sidebar"
            aria-label={isMobileSidebarOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={isMobileSidebarOpen}
            onClick={onMobileMenuToggle}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/8 bg-white/[0.03] text-[color:var(--muted-foreground)] transition hover:border-white/14 hover:text-white lg:hidden"
          >
            {isMobileSidebarOpen ? (
              <PanelLeftClose className="h-4 w-4" />
            ) : (
              <Menu className="h-4 w-4" />
            )}
          </button>

          <button
            type="button"
            aria-controls="admin-sidebar"
            aria-label={isDesktopCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!isDesktopCollapsed}
            onClick={onDesktopSidebarToggle}
            className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/8 bg-white/[0.03] text-[color:var(--muted-foreground)] transition hover:border-white/14 hover:text-white lg:inline-flex"
          >
            {isDesktopCollapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </button>

          <div className="min-w-0">
            <h2 className="text-[15px] font-semibold text-white sm:text-base">
              {currentRoute?.label ?? "Dashboard"}
            </h2>
            <p className="mt-0.5 hidden truncate text-[13px] text-[color:var(--muted-foreground)] md:block">
              {currentRoute?.description ?? "Platform summary and key metrics"}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <LiveClock />

          {/* Notifications — linked to pending reports */}
          <Link
            href="/reports"
            className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.04] bg-white/[0.02] text-[color:var(--muted-foreground)] transition-colors hover:border-white/8 hover:text-white"
          >
            <Bell className="h-4 w-4" />
            {pendingReports > 0 ? (
              <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[color:var(--accent-rose)] px-1 text-[10px] font-bold text-white shadow-[0_2px_6px_rgba(184,120,114,0.4)]">
                {pendingReports > 99 ? "99+" : pendingReports}
              </span>
            ) : null}
          </Link>

          <div className="hidden h-5 w-px bg-white/[0.06] sm:block" />

          <div className="flex items-center gap-2 sm:gap-3">
            <AdminStepUpChip />
            <AdminSessionChip />
          </div>
        </div>
      </div>
    </header>
  );
}
