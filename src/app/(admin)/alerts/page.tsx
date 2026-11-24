"use client";

import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminSession } from "@/features/admin-auth/hooks/use-admin-session";
import { AlertStatusPanel } from "@/features/alerts/alert-status-panel";
import { AnnouncementsPanel } from "@/features/alerts/announcements-panel";
import { ShieldOff } from "lucide-react";

/**
 * Alerts and news (canvas board 7): the pause button for alerts on
 * students' phones and laptops, and notices for the student inbox.
 * Superadmin only, with step-up for every change.
 */
export default function AlertsPage() {
  const { data: session, isLoading } = useAdminSession();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Alerts and news" description="Checking your access…" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (session?.user?.role !== "SUPERADMIN") {
    return (
      <div className="sb-enter space-y-6">
        <PageHeader title="Alerts and news" description="Pause alerts, and write notices for students." />
        <div className="rounded-[var(--sb-radius-lg)] border border-[var(--sb-border)] bg-[var(--sb-surface-1)]">
          <EmptyState
            icon={<ShieldOff className="h-4 w-4" />}
            title="Superadmin only"
            description="Pausing alerts and writing notices reach every student, so they are limited to superadmins."
          />
        </div>
      </div>
    );
  }

  return (
    <div className="sb-enter space-y-8 pb-2">
      <PageHeader
        title="Alerts and news"
        description="The pause button only stops the buzzing on phones and laptops. Notes always land in students' inboxes."
      />
      <AlertStatusPanel />
      <AnnouncementsPanel />
    </div>
  );
}
