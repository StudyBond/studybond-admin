"use client";

import { AdminBottomNav } from "@/components/layout/admin-bottom-nav";
import {
  AdminSidebar,
  type SidebarMode,
} from "@/components/layout/admin-sidebar";
import { AdminTopbar } from "@/components/layout/admin-topbar";
import { cn } from "@/lib/utils/cn";
import { useCallback, useEffect, useState } from "react";

const SIDEBAR_STORAGE_KEY = "studybond-admin:sidebar-mode";

export default function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [desktopSidebarMode, setDesktopSidebarMode] =
    useState<SidebarMode>("expanded");
  const [isSidebarReady, setIsSidebarReady] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(SIDEBAR_STORAGE_KEY);
      if (stored === "expanded" || stored === "collapsed") {
        setDesktopSidebarMode(stored);
      }
    } catch {
      // Storage can throw in private mode. The default is fine.
    } finally {
      setIsSidebarReady(true);
    }
  }, []);

  useEffect(() => {
    if (!isSidebarReady) return;

    try {
      window.localStorage.setItem(SIDEBAR_STORAGE_KEY, desktopSidebarMode);
    } catch {
      // Persistence is a convenience, not a requirement.
    }
  }, [desktopSidebarMode, isSidebarReady]);

  // Close the mobile drawer if the viewport grows into desktop territory.
  useEffect(() => {
    const query = window.matchMedia("(min-width: 1024px)");
    const handleChange = () => {
      if (query.matches) setIsMobileSidebarOpen(false);
    };

    handleChange();
    query.addEventListener("change", handleChange);
    return () => query.removeEventListener("change", handleChange);
  }, []);

  const closeMobileSidebar = useCallback(
    () => setIsMobileSidebarOpen(false),
    [],
  );
  const toggleMobileSidebar = useCallback(
    () => setIsMobileSidebarOpen((open) => !open),
    [],
  );
  const toggleDesktopSidebar = useCallback(
    () =>
      setDesktopSidebarMode((mode) =>
        mode === "expanded" ? "collapsed" : "expanded",
      ),
    [],
  );

  /* Matches the learner app's shell. The page is one ordinary document
     that scrolls as a whole, the sidebar is fixed to the viewport so it is
     never taller than the screen and never stretches to page height, and a
     margin on the content column reserves its space. */
  const sidebarWidth =
    desktopSidebarMode === "collapsed"
      ? "var(--sb-sidebar-width-collapsed)"
      : "var(--sb-sidebar-width)";

  return (
    <div
      className="relative flex min-h-dvh bg-[var(--sb-bg)] text-[var(--sb-text)]"
      style={{ "--sb-sidebar-w": sidebarWidth } as React.CSSProperties}
    >
      <AdminSidebar
        desktopMode={desktopSidebarMode}
        isMobileOpen={isMobileSidebarOpen}
        onMobileClose={closeMobileSidebar}
      />

      <div
        className={cn(
          "flex min-w-0 flex-1 flex-col",
          "transition-[margin] duration-[var(--sb-duration)] ease-[var(--sb-ease)]",
          "lg:ml-[var(--sb-sidebar-w)]",
        )}
      >
        <AdminTopbar
          desktopSidebarMode={desktopSidebarMode}
          isMobileSidebarOpen={isMobileSidebarOpen}
          onDesktopSidebarToggle={toggleDesktopSidebar}
          onMobileMenuToggle={toggleMobileSidebar}
        />

        <main className="sb-safe-bottom min-w-0 px-4 pt-5 sm:px-5 lg:px-6 lg:pt-6">
          {/* Content is capped so tables stay readable on ultrawide
              displays instead of stretching to 2500px. */}
          <div className="mx-auto w-full max-w-[var(--sb-content-max)]">
            {children}
          </div>
        </main>
      </div>

      <AdminBottomNav />
    </div>
  );
}
