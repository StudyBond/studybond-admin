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

  return (
    <div className="h-dvh overflow-hidden bg-[var(--sb-bg)] text-[var(--sb-text)]">
      <div
        className={cn(
          "h-full transition-[grid-template-columns] duration-[var(--sb-duration)] ease-[var(--sb-ease)] lg:grid",
          desktopSidebarMode === "collapsed"
            ? "lg:grid-cols-[var(--sb-sidebar-width-collapsed)_minmax(0,1fr)]"
            : "lg:grid-cols-[var(--sb-sidebar-width)_minmax(0,1fr)]",
        )}
      >
        <AdminSidebar
          desktopMode={desktopSidebarMode}
          isMobileOpen={isMobileSidebarOpen}
          onMobileClose={closeMobileSidebar}
        />

        <div className="grid h-full min-w-0 grid-rows-[auto_minmax(0,1fr)] overflow-hidden">
          <AdminTopbar
            desktopSidebarMode={desktopSidebarMode}
            isMobileSidebarOpen={isMobileSidebarOpen}
            onDesktopSidebarToggle={toggleDesktopSidebar}
            onMobileMenuToggle={toggleMobileSidebar}
          />

          <main className="sb-safe-bottom min-w-0 overflow-y-auto overscroll-contain px-4 pt-5 sm:px-5 lg:px-6 lg:pt-6">
            {/* Content is capped so tables stay readable on ultrawide
                displays instead of stretching to 2500px. */}
            <div className="mx-auto w-full max-w-[var(--sb-content-max)]">
              {children}
            </div>
          </main>

          <AdminBottomNav />
        </div>
      </div>
    </div>
  );
}
