"use client";

import { AdminBottomNav } from "@/components/layout/admin-bottom-nav";
import {
  AdminSidebar,
  type SidebarMode,
} from "@/components/layout/admin-sidebar";
import { AdminTopbar } from "@/components/layout/admin-topbar";
import { cn } from "@/lib/utils/cn";
import {
  useCallback,
  useEffect,
  useState,
} from "react";

const DESKTOP_SIDEBAR_STORAGE_KEY = "studybond-admin:sidebar-mode";

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [desktopSidebarMode, setDesktopSidebarMode] = useState<SidebarMode>("expanded");
  const [isDesktopSidebarReady, setIsDesktopSidebarReady] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const storedValue = window.localStorage.getItem(DESKTOP_SIDEBAR_STORAGE_KEY);
      if (storedValue === "expanded" || storedValue === "collapsed") {
        setDesktopSidebarMode(storedValue);
      }
    } catch {
      // Ignore storage failures and fall back to the default expanded desktop sidebar.
    } finally {
      setIsDesktopSidebarReady(true);
    }
  }, []);

  useEffect(() => {
    if (!isDesktopSidebarReady || typeof window === "undefined") {
      return;
    }

    try {
      window.localStorage.setItem(DESKTOP_SIDEBAR_STORAGE_KEY, desktopSidebarMode);
    } catch {
      // Ignore storage failures. The UI still works without persistence.
    }
  }, [desktopSidebarMode, isDesktopSidebarReady]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const mediaQuery = window.matchMedia("(min-width: 1024px)");
    const handleViewportChange = (event?: MediaQueryListEvent) => {
      if (event ? event.matches : mediaQuery.matches) {
        setIsMobileSidebarOpen(false);
      }
    };

    handleViewportChange();

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", handleViewportChange);
      return () => mediaQuery.removeEventListener("change", handleViewportChange);
    }

    mediaQuery.addListener(handleViewportChange);
    return () => mediaQuery.removeListener(handleViewportChange);
  }, []);

  const closeMobileSidebar = useCallback(() => setIsMobileSidebarOpen(false), []);
  const toggleMobileSidebar = useCallback(() => {
    setIsMobileSidebarOpen((current) => !current);
  }, []);
  const toggleDesktopSidebar = useCallback(() => {
    setDesktopSidebarMode((current) => (current === "expanded" ? "collapsed" : "expanded"));
  }, []);

  return (
    <div className="h-dvh overflow-hidden bg-[color:var(--background)] text-[color:var(--foreground)]">
      <div
        className={cn(
          "relative h-full min-h-0 overflow-hidden transition-[grid-template-columns] duration-300 ease-out lg:grid",
          desktopSidebarMode === "collapsed"
            ? "lg:grid-cols-[88px_minmax(0,1fr)]"
            : "lg:grid-cols-[272px_minmax(0,1fr)]",
        )}
      >
        <AdminSidebar
          desktopMode={desktopSidebarMode}
          isMobileOpen={isMobileSidebarOpen}
          onMobileClose={closeMobileSidebar}
        />
        <div className="grid h-full min-h-0 min-w-0 overflow-hidden grid-rows-[auto,minmax(0,1fr)]">
          <AdminTopbar
            desktopSidebarMode={desktopSidebarMode}
            isMobileSidebarOpen={isMobileSidebarOpen}
            onDesktopSidebarToggle={toggleDesktopSidebar}
            onMobileMenuToggle={toggleMobileSidebar}
          />
          <main className="admin-safe-bottom relative min-h-0 overflow-x-clip overflow-y-auto overscroll-contain px-4 pb-8 pt-4 sm:px-5 sm:pt-5 md:px-6 md:pb-10 md:pt-6 lg:px-8">
            <div className="relative mx-auto w-full max-w-full">{children}</div>
          </main>
          <AdminBottomNav />
        </div>
      </div>
    </div>
  );
}
