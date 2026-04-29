"use client";

import { ApiErrorMessage } from "@/components/ui/api-error-message";
import { MetricCard } from "@/components/ui/metric-card";
import { SectionHeading } from "@/components/ui/section-heading";
import { StatusBadge } from "@/components/ui/status-badge";
import { Surface } from "@/components/ui/surface";
import { useAdminSystemHealth } from "@/features/analytics/hooks/use-admin-system-health";
import {
  formatCompactNumber,
  formatDateTime,
  formatDurationSeconds,
  formatInteger,
} from "@/lib/utils/format";
import { Activity, Database, Mail, Radio, ShieldCheck } from "lucide-react";

export default function SystemHealthPage() {
  const systemHealthQuery = useAdminSystemHealth();
  const health = systemHealthQuery.data;

  const metrics: Array<{
    label: string;
    value: string;
    delta: string;
    tone: "amber" | "cyan" | "emerald" | "rose";
  }> = health
    ? [
        {
          label: "Database",
          value: health.dependencies.databaseReachable ? "Live" : "Down",
          delta: `Updated ${formatDateTime(health.generatedAt)}`,
          tone: health.dependencies.databaseReachable ? "emerald" : "rose",
        },
        {
          label: "Email failures (24h)",
          value: formatInteger(health.queues.recentEmailFailuresLast24Hours),
          delta: health.dependencies.emailEnabled ? "Delivery enabled" : "Email paused",
          tone: health.queues.recentEmailFailuresLast24Hours > 0 ? "rose" : "amber",
        },
        {
          label: "Queue backlog",
          value: formatInteger(health.queues.leaderboardProjectionBacklog),
          delta: `${formatInteger(health.queues.pendingQuestionReports)} reports pending`,
          tone: health.queues.leaderboardProjectionBacklog > 0 ? "amber" : "cyan",
        },
        {
          label: "Active sockets",
          value: formatCompactNumber(health.live.activeWsConnections),
          delta: `${formatCompactNumber(health.live.totalHttpRequests)} HTTP requests tracked`,
          tone: "cyan" as const,
        },
      ]
    : [];

  return (
    <section className="space-y-6">
      <SectionHeading
        eyebrow="Analytics"
        title="System health"
        description="Live operational signals for infrastructure, queues, and activity in the admin platform."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge tone={health?.dependencies.databaseReachable ? "emerald" : "rose"}>
              {health?.dependencies.databaseReachable ? "database live" : "database down"}
            </StatusBadge>
            <StatusBadge tone={health?.runtime.redisEnabled ? "cyan" : "rose"}>
              {health?.runtime.redisEnabled ? "redis live" : "redis down"}
            </StatusBadge>
          </div>
        }
      />

      {systemHealthQuery.isError ? (
        <Surface glow="rose" className="p-6">
          <p className="text-base font-semibold text-white">Could not load system health.</p>
          <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">
            <ApiErrorMessage
              error={systemHealthQuery.error}
              fallback="Check backend connectivity and admin permissions."
            />
          </p>
        </Surface>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {(metrics.length ? metrics : new Array(4).fill(null)).map((metric, index) =>
          metric ? (
            <MetricCard key={metric.label} {...metric} className="admin-enter" style={{ animationDelay: `${index * 80}ms` }} />
          ) : (
            <Surface key={index} className="h-[140px] p-5 shimmer-line" />
          ),
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.96fr_1.04fr]">
        <Surface glow="cyan" className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[color:var(--accent-cyan)]">
                Runtime
              </p>
              <h2 className="mt-2 text-xl font-semibold text-white">Environment snapshot</h2>
            </div>
            <StatusBadge tone="slate">{health?.runtime.environment ?? "..."}</StatusBadge>
          </div>

          <div className="mt-5 grid gap-3">
            <div className="rounded-xl border border-white/8 bg-black/10 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Activity className="h-4 w-4 text-[color:var(--accent-cyan)]" />
                  <span className="text-sm text-white">Uptime</span>
                </div>
                <span className="text-sm font-semibold text-white">
                  {formatDurationSeconds(health?.runtime.uptimeSeconds)}
                </span>
              </div>
            </div>
            <div className="rounded-xl border border-white/8 bg-black/10 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Radio className="h-4 w-4 text-[color:var(--accent-emerald)]" />
                  <span className="text-sm text-white">Background jobs</span>
                </div>
                <StatusBadge tone={health?.runtime.jobsEnabled ? "emerald" : "amber"}>
                  {health?.runtime.jobsEnabled ? "enabled" : "paused"}
                </StatusBadge>
              </div>
            </div>
            <div className="rounded-xl border border-white/8 bg-black/10 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Database className="h-4 w-4 text-[color:var(--accent-cyan)]" />
                  <span className="text-sm text-white">Leaderboard projection</span>
                </div>
                <StatusBadge tone={health?.runtime.leaderboardProjectionEnabled ? "emerald" : "amber"}>
                  {health?.runtime.leaderboardProjectionEnabled ? "enabled" : "disabled"}
                </StatusBadge>
              </div>
            </div>
            <div className="rounded-xl border border-white/8 bg-black/10 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="h-4 w-4 text-[color:var(--accent-amber)]" />
                  <span className="text-sm text-white">Pending step-up challenges</span>
                </div>
                <StatusBadge tone={(health?.queues.pendingStepUpChallenges ?? 0) > 0 ? "amber" : "slate"}>
                  {formatInteger(health?.queues.pendingStepUpChallenges ?? 0)}
                </StatusBadge>
              </div>
            </div>
          </div>
        </Surface>

        <div className="grid gap-6">
          <Surface glow="emerald" className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[color:var(--accent-emerald)]">
                  Dependencies
                </p>
                <h2 className="mt-2 text-xl font-semibold text-white">Service state</h2>
              </div>
              <StatusBadge tone={(health?.analytics.rollupLagDays ?? 0) > 0 ? "amber" : "emerald"}>
                lag {health?.analytics.rollupLagDays ?? 0}d
              </StatusBadge>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-white/8 bg-black/10 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Database className="h-4 w-4 text-[color:var(--accent-cyan)]" />
                    <span className="text-sm text-white">Database</span>
                  </div>
                  <StatusBadge tone={health?.dependencies.databaseReachable ? "emerald" : "rose"}>
                    {health?.dependencies.databaseReachable ? "reachable" : "offline"}
                  </StatusBadge>
                </div>
              </div>
              <div className="rounded-xl border border-white/8 bg-black/10 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-[color:var(--accent-amber)]" />
                    <span className="text-sm text-white">Email delivery</span>
                  </div>
                  <StatusBadge tone={health?.dependencies.emailEnabled ? "emerald" : "amber"}>
                    {health?.dependencies.emailEnabled ? "enabled" : "paused"}
                  </StatusBadge>
                </div>
              </div>
              <div className="rounded-xl border border-white/8 bg-black/10 p-4">
                <p className="text-xs text-[color:var(--muted-foreground)]">Latest analytics rollup</p>
                <p className="mt-2 text-sm font-semibold text-white">
                  {health?.analytics.latestRollupDate ?? "Unavailable"}
                </p>
                <p className="mt-1 text-xs text-[color:var(--muted-foreground)]">
                  {health?.analytics.latestRollupUpdatedAt
                    ? `Updated ${formatDateTime(health.analytics.latestRollupUpdatedAt)}`
                    : "No rollup recorded yet"}
                </p>
              </div>
              <div className="rounded-xl border border-white/8 bg-black/10 p-4">
                <p className="text-xs text-[color:var(--muted-foreground)]">Redis read mode</p>
                <p className="mt-2 text-sm font-semibold text-white">
                  {health?.runtime.leaderboardRedisReadEnabled ? "Projection cache active" : "Direct database reads"}
                </p>
                <p className="mt-1 text-xs text-[color:var(--muted-foreground)]">
                  Adjusts leaderboard reads depending on projection mode.
                </p>
              </div>
            </div>
          </Surface>

          <Surface className="p-6">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[color:var(--accent-amber)]">
                Queues and traffic
              </p>
              <h2 className="mt-2 text-xl font-semibold text-white">Live counters</h2>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-white/8 bg-black/10 p-4">
                <p className="text-xs text-[color:var(--muted-foreground)]">Projection backlog</p>
                <p className="mt-2 text-2xl font-semibold text-white">
                  {formatInteger(health?.queues.leaderboardProjectionBacklog ?? 0)}
                </p>
              </div>
              <div className="rounded-xl border border-white/8 bg-black/10 p-4">
                <p className="text-xs text-[color:var(--muted-foreground)]">Pending reports</p>
                <p className="mt-2 text-2xl font-semibold text-white">
                  {formatInteger(health?.queues.pendingQuestionReports ?? 0)}
                </p>
              </div>
              <div className="rounded-xl border border-white/8 bg-black/10 p-4">
                <p className="text-xs text-[color:var(--muted-foreground)]">Dropped WS events</p>
                <p className="mt-2 text-2xl font-semibold text-white">
                  {formatInteger(health?.live.totalWsDroppedOutboundEvents ?? 0)}
                </p>
              </div>
              <div className="rounded-xl border border-white/8 bg-black/10 p-4">
                <p className="text-xs text-[color:var(--muted-foreground)]">WS outbound queue</p>
                <p className="mt-2 text-2xl font-semibold text-white">
                  {formatInteger(health?.live.wsOutboundQueueLength ?? 0)}
                </p>
              </div>
            </div>
          </Surface>
        </div>
      </div>
    </section>
  );
}
