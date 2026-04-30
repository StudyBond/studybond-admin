"use client";

import { ApiErrorMessage } from "@/components/ui/api-error-message";
import { SectionHeading } from "@/components/ui/section-heading";
import { StatusBadge } from "@/components/ui/status-badge";
import { Surface } from "@/components/ui/surface";
import { useAdminSession } from "@/features/admin-auth/hooks/use-admin-session";
import { useAdminStepUp } from "@/features/admin-auth/hooks/use-admin-step-up";
import { useAdminSystemHealth } from "@/features/analytics/hooks/use-admin-system-health";
import { useAdminSystemSettings } from "@/features/system/hooks/use-admin-system-settings";
import { AddInstitutionPanel } from "@/features/system/components/add-institution-panel";
import { adminSystemApi } from "@/lib/api/admin-system";
import { formatDateTime, formatInteger } from "@/lib/utils/format";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Mail, ShieldCheck, ShieldOff, Wrench } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { data: session, isLoading: isSessionLoading } = useAdminSession();
  const { isActive: isStepUpActive, stepUp } = useAdminStepUp();
  const settingsQuery = useAdminSystemSettings(session?.user?.role === "SUPERADMIN");
  const systemHealthQuery = useAdminSystemHealth();

  const isSuperadmin = session?.user?.role === "SUPERADMIN";
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
    onSuccess: async (payload: any) => {
      toast.success(`Email delivery ${payload.emailEnabled ? "enabled" : "disabled"}`);
      await queryClient.invalidateQueries({ queryKey: ["admin", "system-settings"] });
      await queryClient.invalidateQueries({ queryKey: ["admin", "system-health"] });
    },
    onError: (error) => {
      toast.error("Could not update settings", {
        description: <ApiErrorMessage error={error} fallback="Please try again." />,
      });
    },
  });

  if (isSessionLoading) {
    return (
      <section className="space-y-6">
        <SectionHeading
          eyebrow="System"
          title="Settings"
          description="System configuration and operational controls."
        />
        <Surface className="p-6">
          <p className="text-sm text-[color:var(--muted-foreground)]">Verifying admin access...</p>
        </Surface>
      </section>
    );
  }

  if (!isSuperadmin) {
    return (
      <section className="space-y-6">
        <SectionHeading
          eyebrow="System"
          title="Settings"
          description="System configuration and operational controls."
        />
        <Surface glow="amber" className="p-6">
          <div className="flex items-start gap-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[color:var(--accent-amber)]/20 bg-[color:var(--accent-amber)]/10 text-[color:var(--accent-amber)]">
              <ShieldOff className="h-5 w-5" />
            </span>
            <div>
              <p className="text-base font-semibold text-white">Superadmin access required</p>
              <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">
                System controls are restricted to superadmins. Please request elevated access to proceed.
              </p>
            </div>
          </div>
        </Surface>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <SectionHeading
        eyebrow="System"
        title="Settings"
        description="System configuration and operational controls."
      />

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Surface className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[color:var(--accent-cyan)]">
                Controls
              </p>
              <h3 className="mt-2 text-xl font-semibold text-white">Operational toggles</h3>
            </div>
            <StatusBadge tone={isStepUpActive ? "emerald" : "amber"}>
              {isStepUpActive ? "Step-up active" : "Step-up required"}
            </StatusBadge>
          </div>

          <div className="mt-5 space-y-3">
            <div className="rounded-xl border border-white/8 bg-black/10 p-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-[color:var(--accent-cyan)]">
                    <Mail className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-white">Email delivery</p>
                    <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">
                      Enable or pause transactional email across the platform.
                    </p>
                    <p className="mt-2 text-xs text-[color:var(--muted-foreground)]">
                      Last updated {settings?.updatedAt ? formatDateTime(settings.updatedAt) : "—"}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <StatusBadge tone={settings?.emailEnabled ? "emerald" : "rose"}>
                    {settings?.emailEnabled ? "Enabled" : "Disabled"}
                  </StatusBadge>
                  <button
                    type="button"
                    onClick={() => toggleMutation.mutate()}
                    disabled={!isStepUpActive || toggleMutation.isPending || !settings}
                    className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white transition hover:border-white/20 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {settings?.emailEnabled ? "Disable" : "Enable"}
                  </button>
                </div>
              </div>

              {!isStepUpActive ? (
                <div className="mt-4 rounded-lg border border-[color:var(--accent-amber)]/25 bg-[color:var(--accent-amber)]/10 px-3 py-2 text-xs text-white">
                  Step-up verification is required before making changes.
                </div>
              ) : null}
            </div>
            
            <AddInstitutionPanel />
          </div>

          {!isStepUpActive ? (
            <Link
              href="/step-up?next=/settings&intent=System%20settings"
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-[color:var(--background)] transition hover:opacity-90"
            >
              Complete step-up verification
              <ArrowRight className="h-4 w-4" />
            </Link>
          ) : null}
        </Surface>

        <div className="grid gap-6">
          <Surface className="p-6">
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[color:var(--accent-emerald)]">
              System
            </p>
            <h3 className="mt-2 text-xl font-semibold text-white">Runtime snapshot</h3>
            <div className="mt-5 space-y-2.5 text-sm text-[color:var(--muted-foreground)]">
              <div className="flex items-center justify-between rounded-xl border border-white/8 bg-black/10 px-4 py-3">
                <span>Environment</span>
                <span className="font-medium text-white">{systemHealth?.runtime.environment ?? "—"}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-white/8 bg-black/10 px-4 py-3">
                <span>Jobs</span>
                <StatusBadge tone={systemHealth?.runtime.jobsEnabled ? "emerald" : "amber"}>
                  {systemHealth?.runtime.jobsEnabled ? "enabled" : "paused"}
                </StatusBadge>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-white/8 bg-black/10 px-4 py-3">
                <span>Redis</span>
                <StatusBadge tone={systemHealth?.runtime.redisEnabled ? "emerald" : "rose"}>
                  {systemHealth?.runtime.redisEnabled ? "live" : "down"}
                </StatusBadge>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-white/8 bg-black/10 px-4 py-3">
                <span>Active WS connections</span>
                <span className="font-medium text-white">
                  {formatInteger(systemHealth?.live.activeWsConnections ?? 0)}
                </span>
              </div>
            </div>
          </Surface>

          <Surface className="p-6">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-[color:var(--accent-cyan)]">
                <ShieldCheck className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-semibold text-white">Safety guardrails</p>
                <p className="text-xs text-[color:var(--muted-foreground)]">
                  All sensitive changes are logged in audit trails and require step-up verification.
                </p>
              </div>
            </div>
          </Surface>
        </div>
      </div>
    </section>
  );
}
