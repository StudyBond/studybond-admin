"use client";

import { ApiErrorMessage } from "@/components/ui/api-error-message";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { PageHeader, SectionTitle } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard, StatGrid } from "@/components/ui/stat-card";
import { useAdminSession } from "@/features/admin-auth/hooks/use-admin-session";
import { useAdminStepUp } from "@/features/admin-auth/hooks/use-admin-step-up";
import { useAdminSystemHealth } from "@/features/analytics/hooks/use-admin-system-health";
import { AddInstitutionPanel } from "@/features/system/components/add-institution-panel";
import { NotificationAnnouncementsPanel } from "@/features/system/components/notification-announcements-panel";
import { useAdminSystemSettings } from "@/features/system/hooks/use-admin-system-settings";
import { adminSystemApi } from "@/lib/api/admin-system";
import { formatDateTime, formatInteger } from "@/lib/utils/format";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Mail, ShieldCheck, ShieldOff } from "lucide-react";
import { toast } from "sonner";

const adminAnnouncementsUiEnabled =
  process.env.NEXT_PUBLIC_ADMIN_ANNOUNCEMENTS_UI_ENABLED === "true";

/**
 * System settings.
 *
 * Changes worth naming:
 *
 * 1. "Complete step-up verification" appeared twice — an amber notice inside
 *    the toggle card and a full-width white button below it — and the white
 *    button used `bg-white`, a colour that appears nowhere else in the
 *    console. There is now one call to action, in the page header, where
 *    every other page puts its primary action.
 *
 * 2. A "Safety guardrails" card sat at the bottom stating that sensitive
 *    changes are audited. It was a card the admin could not act on, given
 *    the same weight as the controls themselves. The point is worth making
 *    where it applies, so it is one line under the toggle instead.
 *
 * 3. Redis being off was labelled "down" in red. Disabled and broken are
 *    different things, and this page cannot tell them apart — it is reading
 *    a config flag, not a health check. It says "Disabled" now.
 */

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { data: session, isLoading: isSessionLoading } = useAdminSession();
  const { isActive: isStepUpActive, stepUp } = useAdminStepUp();

  const isSuperadmin = session?.user?.role === "SUPERADMIN";
  const settingsQuery = useAdminSystemSettings(isSuperadmin);
  const systemHealthQuery = useAdminSystemHealth();

  const settings = settingsQuery.data;
  const systemHealth = systemHealthQuery.data;

  const toggleMutation = useMutation({
    mutationFn: async () => {
      if (!settings) {
        throw new Error("System settings are unavailable.");
      }
      if (!stepUp?.stepUpToken) {
        throw new Error("Step-up verification required.");
      }

      return adminSystemApi.toggleEmailSystem(!settings.emailEnabled, {
        stepUpToken: stepUp.stepUpToken,
      });
    },
    onSuccess: async (payload) => {
      toast.success(
        payload.emailEnabled
          ? "Email delivery enabled"
          : "Email delivery paused",
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin", "system-settings"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "system-health"] }),
      ]);
    },
    onError: (error) => {
      toast.error("Could not update settings", {
        description: (
          <ApiErrorMessage error={error} fallback="Please try again." />
        ),
      });
    },
  });

  if (isSessionLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Settings" description="Checking your access…" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!isSuperadmin) {
    return (
      <div className="sb-enter space-y-6">
        <PageHeader
          title="Settings"
          description="Platform-wide configuration and operational controls."
        />
        <div className="rounded-[var(--sb-radius-lg)] border border-[var(--sb-border)] bg-[var(--sb-surface-1)]">
          <EmptyState
            icon={<ShieldOff className="h-4 w-4" />}
            title="Superadmin only"
            description="These controls change behaviour for every user on the platform, so they are limited to superadmins. Ask a superadmin to make the change you need."
          />
        </div>
      </div>
    );
  }

  const isEmailEnabled = settings?.emailEnabled ?? false;

  return (
    <div className="sb-enter space-y-6 pb-2">
      <PageHeader
        title="Settings"
        description="Platform-wide configuration. Every change here is recorded in the audit log."
        meta={
          <Badge tone={isStepUpActive ? "success" : "warning"} dot>
            {isStepUpActive && stepUp
              ? `Step-up active until ${formatDateTime(stepUp.expiresAt)}`
              : "Step-up needed to change anything"}
          </Badge>
        }
        action={
          !isStepUpActive ? (
            <Button
              asChild
              href="/step-up?next=/settings&intent=System%20settings"
            >
              <ShieldCheck className="h-4 w-4" />
              Verify to make changes
            </Button>
          ) : null
        }
      />

      {settingsQuery.isError ? (
        <ErrorState
          title="Could not load system settings"
          error={settingsQuery.error}
          onRetry={() => settingsQuery.refetch()}
        />
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
        {/* ── Controls ────────────────────────────────────────── */}
        <section className="min-w-0 space-y-3">
          <SectionTitle title="Controls" />

          <div className="rounded-[var(--sb-radius-lg)] border border-[var(--sb-border)] bg-[var(--sb-surface-1)] p-4 sm:p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--sb-radius)] border border-[var(--sb-border)] bg-[var(--sb-surface-2)] text-[var(--sb-text-secondary)]">
                  <Mail className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[length:var(--sb-text-md)] font-medium text-[var(--sb-text)]">
                      Email delivery
                    </p>
                    <Badge tone={isEmailEnabled ? "success" : "danger"} dot>
                      {isEmailEnabled ? "Enabled" : "Paused"}
                    </Badge>
                  </div>
                  <p className="mt-1 text-[length:var(--sb-text-base)] text-[var(--sb-text-secondary)]">
                    {isEmailEnabled
                      ? "Sign-up codes, password resets, and receipts are being sent."
                      : "No transactional email is going out. Sign-ups and password resets will not reach anyone."}
                  </p>
                  <p className="mt-2 text-[length:var(--sb-text-xs)] text-[var(--sb-text-tertiary)]">
                    Last changed{" "}
                    {settings?.updatedAt
                      ? formatDateTime(settings.updatedAt)
                      : "never"}
                  </p>
                </div>
              </div>

              <Button
                type="button"
                variant={isEmailEnabled ? "danger" : "primary"}
                onClick={() => toggleMutation.mutate()}
                disabled={!isStepUpActive || toggleMutation.isPending || !settings}
                isLoading={toggleMutation.isPending}
                className="shrink-0"
              >
                {isEmailEnabled ? "Pause email" : "Enable email"}
              </Button>
            </div>

            {/* Says why the button is dead, next to the dead button. */}
            {!isStepUpActive ? (
              <p className="mt-3 border-t border-[var(--sb-border)] pt-3 text-[length:var(--sb-text-xs)] text-[var(--sb-text-tertiary)]">
                Verify with step-up before changing this. The change is logged
                against your account.
              </p>
            ) : null}
          </div>

          <AddInstitutionPanel />
        </section>

        {/* ── Runtime ─────────────────────────────────────────── */}
        <section className="min-w-0 space-y-3">
          <SectionTitle
            title="Runtime"
            description="Read-only. Set by the backend deployment."
          />
          <StatGrid className="lg:grid-cols-2">
            <StatCard
              label="Environment"
              value={systemHealth?.runtime.environment ?? "Unknown"}
            />
            <StatCard
              label="Background jobs"
              value={systemHealth?.runtime.jobsEnabled ? "Enabled" : "Disabled"}
              hint="Rollups and expiry sweeps"
              status={systemHealth?.runtime.jobsEnabled ? undefined : "warning"}
            />
            <StatCard
              label="Redis"
              value={systemHealth?.runtime.redisEnabled ? "Enabled" : "Disabled"}
              hint="Caching and rate limits"
              status={systemHealth?.runtime.redisEnabled ? undefined : "warning"}
            />
            <StatCard
              label="Live connections"
              value={formatInteger(systemHealth?.live.activeWsConnections ?? 0)}
              hint="Open WebSocket clients"
            />
          </StatGrid>
        </section>
      </div>

      {adminAnnouncementsUiEnabled ? <NotificationAnnouncementsPanel /> : null}
    </div>
  );
}
