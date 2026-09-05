"use client";

import { useAdminSession } from "@/features/admin-auth/hooks/use-admin-session";
import {
  adminNavigation,
  isAdminRouteActive,
  resolveAdminSection,
  type AdminNavItem,
} from "@/lib/navigation/admin-navigation";
import { cn } from "@/lib/utils/cn";
import { X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

export type SidebarMode = "expanded" | "collapsed";

type AdminSidebarProps = {
  desktopMode: SidebarMode;
  isMobileOpen: boolean;
  onMobileClose: () => void;
};

function NavRow({
  item,
  isActive,
  isCollapsed,
  isChild,
  onNavigate,
}: {
  item: AdminNavItem;
  isActive: boolean;
  isCollapsed: boolean;
  isChild?: boolean;
  onNavigate: () => void;
}) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={isActive ? "page" : undefined}
      title={isCollapsed ? item.label : undefined}
      className={cn(
        "group relative flex items-center gap-2.5 rounded-[var(--sb-radius)] px-2.5 py-2",
        "text-[length:var(--sb-text-base)] transition-colors duration-[var(--sb-duration-fast)]",
        isActive
          ? "bg-[var(--sb-accent-soft)] font-medium text-[var(--sb-accent-text)]"
          : "text-[var(--sb-text-secondary)] hover:bg-[var(--sb-surface-2)] hover:text-[var(--sb-text)]",
        isChild && !isCollapsed && "ml-3.5 py-1.5",
        isCollapsed && "lg:justify-center lg:px-0",
      )}
    >
      {/* Active rail. Always in the DOM at the same size, only its opacity
          changes — so switching pages cannot shift the row. */}
      <span
        aria-hidden="true"
        className={cn(
          "absolute -left-2.5 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-r-full bg-[var(--sb-accent)] transition-opacity duration-[var(--sb-duration-fast)]",
          isActive ? "opacity-100" : "opacity-0",
          isCollapsed && "lg:hidden",
        )}
      />

      <Icon
        className={cn(
          "h-4 w-4 shrink-0",
          isChild && !isCollapsed && "h-3.5 w-3.5",
        )}
      />

      <span className={cn("min-w-0 truncate", isCollapsed && "lg:hidden")}>
        {item.label}
      </span>
    </Link>
  );
}

export function AdminSidebar({
  desktopMode,
  isMobileOpen,
  onMobileClose,
}: AdminSidebarProps) {
  const pathname = usePathname();
  const { data: session } = useAdminSession();
  const isCollapsed = desktopMode === "collapsed";
  const activeSection = resolveAdminSection(pathname);

  const displayName =
    session?.user?.fullName?.trim() || session?.user?.email || "Admin";
  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const isSuperadmin = session?.user?.role === "SUPERADMIN";

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
          "fixed inset-0 z-30 bg-black/60 backdrop-blur-sm transition-opacity duration-[var(--sb-duration)] lg:hidden",
          isMobileOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />

      <aside
        id="admin-sidebar"
        aria-label="Admin navigation"
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-[min(84vw,300px)] flex-col",
          "border-r border-[var(--sb-border)] bg-[var(--sb-surface-1)]",
          "transition-transform duration-[var(--sb-duration)] ease-[var(--sb-ease)]",
          "lg:relative lg:inset-auto lg:z-0 lg:h-full lg:w-auto lg:translate-x-0",
          isMobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* ── Brand ─────────────────────────────────────────── */}
        <div
          className={cn(
            "flex h-[var(--sb-topbar-height)] shrink-0 items-center gap-2.5 border-b border-[var(--sb-border)] px-4",
            isCollapsed && "lg:justify-center lg:px-0",
          )}
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--sb-radius-sm)] bg-[var(--sb-accent)] text-[length:var(--sb-text-xs)] font-bold text-[#0a0a0a]">
            SB
          </span>
          <span
            className={cn(
              "text-[length:var(--sb-text-md)] font-semibold tracking-tight text-[var(--sb-text)]",
              isCollapsed && "lg:hidden",
            )}
          >
            StudyBond
          </span>

          <button
            type="button"
            onClick={onMobileClose}
            aria-label="Close navigation menu"
            className="ml-auto flex h-8 w-8 items-center justify-center rounded-[var(--sb-radius-sm)] text-[var(--sb-text-secondary)] transition-colors hover:bg-[var(--sb-surface-2)] hover:text-[var(--sb-text)] lg:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── Nav ───────────────────────────────────────────── */}
        <nav className="flex-1 overflow-y-auto overscroll-contain px-3 py-4">
          <div className="space-y-5">
            {adminNavigation.map((group) => (
              <div key={group.title}>
                <p
                  className={cn(
                    "mb-1.5 px-2.5 text-[length:var(--sb-text-xs)] font-medium text-[var(--sb-text-tertiary)]",
                    isCollapsed && "lg:hidden",
                  )}
                >
                  {group.title}
                </p>

                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const isActive = isAdminRouteActive(pathname, item.href);
                    const isInSection = activeSection?.href === item.href;

                    return (
                      <div key={item.href} className="space-y-0.5">
                        <NavRow
                          item={item}
                          isActive={isActive}
                          isCollapsed={isCollapsed}
                          onNavigate={onMobileClose}
                        />

                        {/* Sub-screens appear only inside their section. */}
                        {item.children && isInSection && !isCollapsed
                          ? item.children.map((child) => (
                              <NavRow
                                key={child.href}
                                item={child}
                                isChild
                                isActive={isAdminRouteActive(
                                  pathname,
                                  child.href,
                                )}
                                isCollapsed={isCollapsed}
                                onNavigate={onMobileClose}
                              />
                            ))
                          : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </nav>

        {/* ── Signed-in admin ───────────────────────────────── */}
        {session?.user ? (
          <div
            className={cn(
              "shrink-0 border-t border-[var(--sb-border)] p-3",
              isCollapsed && "lg:flex lg:justify-center",
            )}
          >
            <div
              className={cn(
                "flex items-center gap-2.5",
                isCollapsed && "lg:gap-0",
              )}
              title={isCollapsed ? displayName : undefined}
            >
              <span
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--sb-radius-sm)] text-[length:var(--sb-text-xs)] font-semibold",
                  isSuperadmin
                    ? "bg-[var(--sb-gold-soft)] text-[var(--sb-gold)]"
                    : "bg-[var(--sb-accent-soft)] text-[var(--sb-accent-text)]",
                )}
              >
                {initials}
              </span>

              <div className={cn("min-w-0", isCollapsed && "lg:hidden")}>
                <p className="truncate text-[length:var(--sb-text-sm)] font-medium text-[var(--sb-text)]">
                  {displayName}
                </p>
                <p className="text-[length:var(--sb-text-xs)] text-[var(--sb-text-tertiary)]">
                  {isSuperadmin ? "Superadmin" : "Admin"}
                </p>
              </div>
            </div>
          </div>
        ) : null}
      </aside>
    </>
  );
}
