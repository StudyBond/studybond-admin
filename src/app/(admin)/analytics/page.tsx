"use client";

import { ActivityChart } from "@/features/analytics/components/activity-chart";
import { useAdminSession } from "@/features/admin-auth/hooks/use-admin-session";
import { useAdminActivity } from "@/features/analytics/hooks/use-admin-activity";
import { useAdminOverview } from "@/features/analytics/hooks/use-admin-overview";
import { useAdminPremiumInsights } from "@/features/analytics/hooks/use-admin-premium-insights";
import { useAdminSystemHealth } from "@/features/analytics/hooks/use-admin-system-health";
import { MetricCard } from "@/components/ui/metric-card";
import { SectionHeading } from "@/components/ui/section-heading";
import { StatusBadge } from "@/components/ui/status-badge";
import { Surface } from "@/components/ui/surface";
import {
  formatCompactNumber,
  formatCurrencyNaira,
  formatInteger,
} from "@/lib/utils/format";

export default function AnalyticsPage() {
  const sessionQuery = useAdminSession();
  const isSuperadmin = sessionQuery.data?.user?.role === "SUPERADMIN";
  const overviewQuery = useAdminOverview();
  const activityQuery = useAdminActivity(7);
  const premiumQuery = useAdminPremiumInsights(30, isSuperadmin);
  const systemHealthQuery = useAdminSystemHealth();

  const overview = overviewQuery.data;
  const activity = activityQuery.data;
  const premium = premiumQuery.data;
  const systemHealth = systemHealthQuery.data;

  const metrics = overview
    ? [
        {
          label: "Exam starts (7d)",
          value: formatCompactNumber(overview.engagement.examsStartedLast7Days),
          delta: `${formatCompactNumber(overview.engagement.examsCompletedLast7Days)} completed`,
          tone: "cyan" as const,
        },
        {
          label: "Collaborations created",
          value: formatInteger(overview.engagement.collaborationCreatedLast7Days),
          delta: `${formatInteger(overview.engagement.collaborationInProgress)} currently live`,
          tone: "emerald" as const,
        },
        {
          label: "Paid subscriptions",
          value: formatInteger(overview.premium.activePaidSubscriptions),
          delta: `${formatInteger(overview.premium.activeAdminEntitlements)} admin entitlements`,
          tone: "amber" as const,
        },
        {
          label: "New users (30d)",
          value: formatCompactNumber(overview.users.newLast30Days),
          delta: `${formatInteger(overview.users.verified)} verified total`,
          tone: "rose" as const,
        },
      ]
    : [];

  const activityChartData = activity
    ? activity.daily.map((item: { date: string; examStarts: number; collaborationSessions: number }) => ({
        label: item.date.slice(5),
        exams: item.examStarts,
        collaborations: item.collaborationSessions,
      }))
    : [];

  return (
    <section className="space-y-8">
      <SectionHeading
        eyebrow="Analytics"
        title="Usage and engagement"
        description="Real-time platform activity, premium health, and system state."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge tone={activity?.dataSource === "ROLLUP" ? "cyan" : "emerald"}>
              {activity?.dataSource ?? "live"}
            </StatusBadge>
            <StatusBadge tone={systemHealth?.analytics.rollupLagDays ? "amber" : "slate"}>
              rollup lag {systemHealth?.analytics.rollupLagDays ?? 0}d
            </StatusBadge>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {(metrics.length ? metrics : new Array(4).fill(null)).map((metric: any, index: number) =>
          metric ? (
            <MetricCard key={metric.label} {...metric} />
          ) : (
            <Surface key={index} className="admin-enter h-[140px] p-5" style={{ animationDelay: `${index * 60}ms` }} />
          ),
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <ActivityChart
          data={activityChartData}
          title="7-day activity"
          description="Exam starts and collaboration sessions this week."
        />

        <Surface className="admin-enter p-6">
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[color:var(--accent-amber)]">
            Premium
          </p>
          <h3 className="mt-2 text-xl font-semibold text-white">Revenue overview</h3>

          <div className="mt-5 grid gap-3">
            <div className="rounded-xl border border-white/8 bg-black/10 p-4">
              <p className="text-sm text-[color:var(--muted-foreground)]">30-day revenue</p>
              <p className="mt-2 text-3xl font-semibold text-white">
                {isSuperadmin
                  ? formatCurrencyNaira(premium?.revenue.successfulRevenueNaira ?? 0)
                  : "Restricted"}
              </p>
              <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">
                {isSuperadmin
                  ? `${formatInteger(premium?.revenue.successfulPayments ?? 0)} payments`
                  : "Visible to superadmins only"}
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-white/8 bg-black/10 p-4">
                <p className="text-sm text-[color:var(--muted-foreground)]">Premium users</p>
                <p className="mt-2 text-2xl font-semibold text-white">
                  {formatInteger(premium?.current.activePremiumUsers ?? 0)}
                </p>
              </div>
              <div className="rounded-xl border border-white/8 bg-black/10 p-4">
                <p className="text-sm text-[color:var(--muted-foreground)]">Expiring (7d)</p>
                <p className="mt-2 text-2xl font-semibold text-white">
                  {formatInteger(premium?.current.expiringIn7Days ?? 0)}
                </p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-white/8 bg-black/10 p-4">
                <p className="text-sm text-[color:var(--muted-foreground)]">Manual grants</p>
                <p className="mt-2 text-2xl font-semibold text-white">
                  {formatInteger(premium?.adminActions.manualGrants ?? 0)}
                </p>
              </div>
              <div className="rounded-xl border border-white/8 bg-black/10 p-4">
                <p className="text-sm text-[color:var(--muted-foreground)]">Revocations</p>
                <p className="mt-2 text-2xl font-semibold text-white">
                  {formatInteger(premium?.adminActions.revocations ?? 0)}
                </p>
              </div>
            </div>
          </div>
        </Surface>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Surface className="admin-enter p-6">
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[color:var(--accent-cyan)]">
            System
          </p>
          <h3 className="mt-2 text-xl font-semibold text-white">Runtime status</h3>
          <div className="mt-5 space-y-2.5 text-sm text-[color:var(--muted-foreground)]">
            <div className="rounded-xl border border-white/8 bg-black/10 px-4 py-3">
              Environment: <span className="font-medium text-white">{systemHealth?.runtime.environment ?? "development"}</span>
            </div>
            <div className="rounded-xl border border-white/8 bg-black/10 px-4 py-3">
              Jobs: <span className="font-medium text-white">{systemHealth?.runtime.jobsEnabled ? "enabled" : "disabled"}</span>
            </div>
            <div className="rounded-xl border border-white/8 bg-black/10 px-4 py-3">
              Redis: <span className="font-medium text-white">{systemHealth?.runtime.redisEnabled ? "enabled" : "disabled"}</span>
            </div>
            <div className="rounded-xl border border-white/8 bg-black/10 px-4 py-3">
              WebSocket connections: <span className="font-medium text-white">{formatInteger(systemHealth?.live.activeWsConnections ?? 0)}</span>
            </div>
          </div>
        </Surface>

        <Surface className="admin-enter p-6">
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[color:var(--accent-emerald)]">
            Premium
          </p>
          <h3 className="mt-2 text-xl font-semibold text-white">Daily payment trail (7d)</h3>

          <div className="mt-5 overflow-x-auto rounded-xl border border-white/8">
            <table className="min-w-[640px] w-full divide-y divide-white/8 text-sm">
              <thead className="bg-black/15 text-left text-[11px] uppercase tracking-[0.16em] text-[color:var(--muted-foreground)]">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Payments</th>
                  <th className="px-4 py-3">Revenue</th>
                  <th className="px-4 py-3">Grants</th>
                  <th className="px-4 py-3">Revoked</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/8 bg-black/10">
                {(premium?.daily ?? []).slice(-7).map((row: { date: string; successfulPayments: number; revenueNaira: number; manualGrants: number; revocations: number }) => (
                  <tr key={row.date} className="hover:bg-white/[0.03]">
                    <td className="px-4 py-3 text-white">{row.date}</td>
                    <td className="px-4 py-3 text-[color:var(--muted-foreground)]">
                      {formatInteger(row.successfulPayments)}
                    </td>
                    <td className="px-4 py-3 text-[color:var(--muted-foreground)]">
                      {formatCurrencyNaira(row.revenueNaira)}
                    </td>
                    <td className="px-4 py-3 text-[color:var(--muted-foreground)]">
                      {formatInteger(row.manualGrants)}
                    </td>
                    <td className="px-4 py-3 text-[color:var(--muted-foreground)]">
                      {formatInteger(row.revocations)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Surface>
      </div>
    </section>
  );
}
