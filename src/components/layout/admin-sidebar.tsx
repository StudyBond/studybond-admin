"use client";

import { AdminSessionChip } from "@/features/admin-auth/components/admin-session-chip";
import { AdminStepUpChip } from "@/features/admin-auth/components/admin-step-up-chip";
import { useAdminSession } from "@/features/admin-auth/hooks/use-admin-session";
import {
  adminNavigation,
  isAdminRouteActive,
} from "@/lib/navigation/admin-navigation";
import { cn } from "@/lib/utils/cn";
import { ChevronRight, PanelLeftClose } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

export type SidebarMode = "expanded" | "collapsed";

type AdminSidebarProps = {
  desktopMode: SidebarMode;
  isMobileOpen: boolean;
  onMobileClose: () => void;
};

export function AdminSidebar({
  desktopMode,
  isMobileOpen,
  onMobileClose,
}: AdminSidebarProps) {
  const pathname = usePathname();
  const { data: session } = useAdminSession();
  const isCollapsed = desktopMode === "collapsed";
  const displayName =
    session?.user?.fullName?.trim() || session?.user?.email || "Admin";
  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  useEffect(() => {
    onMobileClose();
  }, [pathname, onMobileClose]);

  useEffect(() => {
    if (
      !isMobileOpen ||
      typeof window === "undefined" ||
      window.matchMedia("(min-width: 1024px)").matches
    ) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onMobileClose();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMobileOpen, onMobileClose]);

  return (
    <>
      <button
        type="button"
        aria-label="Close navigation menu"
        onClick={onMobileClose}
        className={cn(
          "fixed inset-0 z-30 bg-slate-950/72 backdrop-blur-sm transition duration-300 lg:hidden",
          isMobileOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />

      <aside
        id="admin-sidebar"
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-[min(88vw,320px)] max-w-full flex-col overflow-y-auto overscroll-contain border-r border-white/[0.04] bg-[rgba(10,10,13,0.96)] px-4 py-5 shadow-[0_24px_64px_rgba(0,0,0,0.42)] backdrop-blur-xl transition-[transform,width,padding] duration-300 ease-out lg:relative lg:inset-auto lg:z-0 lg:h-full lg:min-h-0 lg:w-auto lg:translate-x-0 lg:shadow-none",
          isMobileOpen ? "translate-x-0" : "-translate-x-full",
          isCollapsed ? "lg:px-3 lg:py-4" : "lg:px-5 lg:py-6",
        )}
      >
        <div className="flex min-h-full flex-col">
          <div className="mb-4 flex items-center justify-between lg:hidden">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[color:var(--muted-foreground)]">
              Navigation
            </p>
            <button
              type="button"
              onClick={onMobileClose}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/8 bg-white/[0.03] text-[color:var(--muted-foreground)] transition hover:border-white/14 hover:text-white"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          </div>

          <div
            className={cn(
              "rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 transition-[padding,background-color,border-color] duration-300",
              isCollapsed && "lg:border-transparent lg:bg-transparent lg:p-0",
            )}
          >
            <div
              className={cn(
                "flex items-center gap-3",
                isCollapsed &&
                  "lg:h-14 lg:w-14 lg:justify-center lg:rounded-2xl lg:border lg:border-white/[0.06] lg:bg-white/[0.02]",
              )}
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-[color:var(--accent-cyan)] to-[color:var(--accent-emerald)] shadow-[0_2px_8px_rgba(110,196,184,0.2)]">
                <span className="text-xs font-bold text-[color:var(--background)]">
                  SB
                </span>
              </div>
              <div className={cn(isCollapsed && "lg:hidden")}>
                <p className="text-sm font-semibold text-white">StudyBond</p>
                <p className="text-[10px] text-[color:var(--muted-foreground)]">
                  Admin workspace
                </p>
              </div>
            </div>
          </div>

          <nav className="mt-6 flex-1 space-y-6">
            {adminNavigation.map((group) => (
              <div key={group.title}>
                <p
                  className={cn(
                    "mb-2.5 pl-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[color:var(--muted-foreground)]/50",
                    isCollapsed && "lg:hidden",
                  )}
                >
                  {group.title}
                </p>
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const isActive = isAdminRouteActive(pathname, item.href);
                    const Icon = item.icon;

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onMobileClose}
                        aria-label={item.label}
                        title={isCollapsed ? item.label : undefined}
                        className={cn(
                          "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-200",
                          isActive
                            ? "bg-white/[0.06] text-white"
                            : "text-[color:var(--muted-foreground)] hover:bg-white/[0.03] hover:text-white",
                          isCollapsed && "lg:justify-center lg:px-2",
                        )}
                      >
                        <span
                          className={cn(
                            "absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full transition-all duration-300 ease-[var(--ease-out-expo)]",
                            isActive
                              ? "scale-y-100 bg-[color:var(--accent-cyan)] opacity-100"
                              : "scale-y-0 bg-transparent opacity-0",
                          )}
                        />

                        <span
                          className={cn(
                            "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all duration-200",
                            isActive
                              ? "bg-[color:var(--accent-cyan)]/10 text-[color:var(--accent-cyan)]"
                              : "text-[color:var(--muted-foreground)] group-hover:text-white",
                          )}
                        >
                          <Icon className="h-4 w-4" />
                        </span>

                        <span
                          className={cn(
                            "min-w-0 flex-1",
                            isCollapsed && "lg:hidden",
                          )}
                        >
                          <span className="block text-[13px] font-medium leading-tight">
                            {item.label}
                          </span>
                          {isActive ? (
                            <span className="mt-0.5 block truncate text-[11px] text-[color:var(--muted-foreground)]">
                              {item.description}
                            </span>
                          ) : null}
                        </span>

                        <ChevronRight
                          className={cn(
                            "h-3 w-3 shrink-0 transition-all duration-200",
                            isActive
                              ? "text-[color:var(--accent-cyan)]/50"
                              : "text-white/8 group-hover:text-white/25",
                            isCollapsed && "lg:hidden",
                          )}
                        />
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          {session?.user ? (
            <>
              <div
                className={cn(
                  "mt-4 rounded-xl border border-white/[0.04] bg-white/[0.02] p-3",
                  isCollapsed && "lg:hidden",
                )}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-lg text-[11px] font-bold",
                      session.user.role === "SUPERADMIN"
                        ? "bg-[color:var(--accent-amber)]/12 text-[color:var(--accent-amber)]"
                        : "bg-[color:var(--accent-cyan)]/12 text-[color:var(--accent-cyan)]",
                    )}
                  >
                    {initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-white">
                      {displayName}
                    </p>
                    <p className="text-[10px] text-[color:var(--muted-foreground)]">
                      {session.user.role === "SUPERADMIN"
                        ? "Superadmin"
                        : "Admin"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 hidden lg:flex lg:justify-center">
                <div
                  title={`${displayName} • ${session.user.role === "SUPERADMIN" ? "Superadmin" : "Admin"}`}
                  className={cn(
                    "relative hidden h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.03] text-[11px] font-bold text-white",
                    isCollapsed && "lg:flex",
                  )}
                >
                  {initials}
                  <span
                    className={cn(
                      "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[color:var(--background)]",
                      session.user.role === "SUPERADMIN"
                        ? "bg-[color:var(--accent-amber)]"
                        : "bg-[color:var(--accent-cyan)]",
                    )}
                  />
                </div>
              </div>
            </>
          ) : null}

          <div
            className={cn(
              "mt-4 grid gap-3 xl:hidden",
              isCollapsed && "lg:hidden",
            )}
          >
            <AdminStepUpChip />
            <AdminSessionChip />
          </div>
        </div>
      </aside>
    </>
  );
}
