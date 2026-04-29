"use client";

import Link from "next/link";
import { ApiErrorMessage } from "@/components/ui/api-error-message";
import { ActivityChart } from "@/features/analytics/components/activity-chart";
import { useAdminActivity } from "@/features/analytics/hooks/use-admin-activity";
import { useAdminOverview } from "@/features/analytics/hooks/use-admin-overview";
import { useAdminSystemHealth } from "@/features/analytics/hooks/use-admin-system-health";
import { useAdminReports } from "@/features/reports/hooks/use-admin-reports";
import { MetricCard } from "@/components/ui/metric-card";
import { SectionHeading } from "@/components/ui/section-heading";
import { StatusBadge } from "@/components/ui/status-badge";
import { Surface } from "@/components/ui/surface";
import {
  formatCompactNumber,
  formatDateTime,
  formatInteger,
} from "@/lib/utils/format";
import type { AdminReportsListResponse } from "@/lib/api/types";
import {
  AlertTriangle,
  ArrowRight,
  BookOpenText,
  Database,
  Layers3,
  Mail,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { useMemo } from "react";

type PriorityItem = {
  title: string;
  detail: string;
  href: string;
  tone: "rose" | "amber" | "emerald" | "cyan";
  value: number | string;
};

const quickActions = [
  {
    href: "/reports",
    title: "Reports",
    detail: "Review and resolve reported question issues.",
    icon: AlertTriangle,
  },
  {
    href: "/questions",
    title: "Questions",
    detail: "Browse, edit, and upload questions to the question bank.",
    icon: BookOpenText,
  },
  {
    href: "/users",
    title: "Users",
    detail: "Search user accounts, manage roles, and handle bans.",
    icon: Users,
  },
  {
    href: "/premium",
    title: "Premium",
    detail: "Manage subscriptions, entitlements, and renewals.",
    icon: Sparkles,
  },
];

export default function AdminOverviewPage() {
  const overviewQuery = useAdminOverview();
  const activityQuery = useAdminActivity(7);
  const systemHealthQuery = useAdminSystemHealth();
  const pendingReportsQuery = useAdminReports({ page: 1, limit: 5, status: "PENDING" });

  const overview = overviewQuery.data;
  const activity = activityQuery.data;
  const systemHealth = systemHealthQuery.data;
  const pendingReports = (pendingReportsQuery.data as AdminReportsListResponse | undefined)?.reports ?? [];

  const metrics = overview
    ? [
        {
          label: "Pending reports",
          value: formatInteger(overview.content.pendingReports),
          delta: `${formatCompactNumber(overview.content.totalQuestions)} questions tracked`,
          tone: "amber" as const,
        },
        {
          label: "Exams completed (7d)",
          value: formatCompactNumber(overview.engagement.examsCompletedLast7Days),
          delta: `${formatCompactNumber(overview.engagement.examsStartedLast7Days)} started`,
          tone: "cyan" as const,
        },
        {
          label: "Premium expiring (7d)",
          value: formatInteger(overview.premium.expiringIn7Days),
          delta: `${formatInteger(overview.premium.activeUsers)} active premium users`,
          tone: "rose" as const,
        },
        {
          label: "Live collaborations",
          value: formatInteger(overview.engagement.collaborationInProgress),
          delta: `${formatInteger(overview.engagement.collaborationWaiting)} waiting to start`,
          tone: "emerald" as const,
        },
      ]
    : [];

  const activityChartData = activity
    ? activity.daily.map((item: any) => ({
        label: item.date.slice(5),
        exams: item.examStarts,
        collaborations: item.collaborationSessions,
      }))
    : [];

  const priorities = useMemo<PriorityItem[]>(() => {
    if (!overview || !systemHealth) {
      return [];
    }

    const items: PriorityItem[] = [];

    if (!systemHealth.dependencies.databaseReachable) {
      items.push({
        title: "Database unreachable",
        detail: "The database is currently unreachable. Avoid sensitive operations until connectivity is restored.",
        href: "/analytics/system-health",
        tone: "rose",
        value: "down",
      });
    }

    if (overview.content.pendingReports > 0) {
      items.push({
        title: "Pending reports",
        detail: `${formatInteger(overview.content.pendingReports)} question reports waiting for review.`,
        href: "/reports",
        tone: overview.content.pendingReports > 20 ? "rose" : "amber",
        value: overview.content.pendingReports,
      });
    }

    if (overview.premium.expiringIn7Days > 0) {
      items.push({
        title: "Upcoming premium expirations",
        detail: `${formatInteger(overview.premium.expiringIn7Days)} users have premium expiring in the next 7 days.`,
        href: "/premium",
        tone: "amber",
        value: overview.premium.expiringIn7Days,
      });
    }

    if (systemHealth.queues.recentEmailFailuresLast24Hours > 0) {
      items.push({
        title: "Email delivery failures",
        detail: `${formatInteger(systemHealth.queues.recentEmailFailuresLast24Hours)} failed email deliveries in the last 24 hours.`,
        href: "/analytics/system-health",
        tone: "rose",
        value: systemHealth.queues.recentEmailFailuresLast24Hours,
      });
    }

    if (systemHealth.queues.leaderboardProjectionBacklog > 0) {
      items.push({
        title: "Leaderboard backlog",
        detail: `${formatInteger(systemHealth.queues.leaderboardProjectionBacklog)} projection events pending.`,
        href: "/analytics/system-health",
        tone: "cyan",
        value: systemHealth.queues.leaderboardProjectionBacklog,
      });
    }

    if (!items.length) {
      items.push({
        title: "All systems normal",
        detail: "No issues detected. Reports, premium, email, and queues are all operating normally.",
        href: "/analytics",
        tone: "emerald",
        value: "clear",
      });
    }

    return items;
  }, [overview, systemHealth]);

  const totalContent = overview?.content.totalQuestions ?? 0;
  const contentMix = overview
    ? [
        {
          label: "Free exam pool",
          value: overview.content.freeExamQuestions,
          tone: "amber" as const,
        },
        {
          label: "Real past questions",
          value: overview.content.realUiQuestions,
          tone: "cyan" as const,
        },
        {
          label: "Practice questions",
          value: overview.content.practiceQuestions,
          tone: "emerald" as const,
        },
      ]
    : [];

  const priorityItems = priorities.slice(0, 3);
  const hiddenPriorityCount = Math.max(0, priorities.length - priorityItems.length);

  return (
    <section className="space-y-6 md:space-y-8">
      <div className="admin-enter">
        <SectionHeading
          eyebrow="Dashboard"
          title="Platform overview"
          description="Real-time summary of platform activity, pending actions, and system health."
          action={
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge tone={overview?.institution ? "cyan" : "slate"}>
                {overview?.institution?.code ?? "platform"}
              </StatusBadge>
              <StatusBadge tone={systemHealth?.dependencies.databaseReachable ? "emerald" : "rose"} pulse={systemHealth?.dependencies.databaseReachable}>
                {systemHealth?.dependencies.databaseReachable ? "database live" : "database issue"}
              </StatusBadge>
            </div>
          }
        />
        <p className="mt-3 text-sm text-[color:var(--muted-foreground)]">
          {overview
            ? `Last updated ${formatDateTime(overview.generatedAt)}`
            : "Loading data..."}
        </p>
      </div>

      {overviewQuery.isError ? (
        <Surface glow="rose" className="p-5 sm:p-6">
          <p className="text-sm font-medium text-white">Failed to load overview data.</p>
          <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">
            <ApiErrorMessage
              error={overviewQuery.error}
              fallback="Check that the backend is running and this account has admin access."
            />
          </p>
        </Surface>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {(metrics.length ? metrics : new Array(4).fill(null)).map((metric, index) =>
          metric ? (
            <MetricCard key={metric.label} {...metric} className="admin-enter" style={{ animationDelay: `${index * 80}ms` }} />
          ) : (
            <Surface key={index} className="admin-enter h-[132px] p-4 shimmer-line sm:h-[140px] sm:p-5" style={{ animationDelay: `${index * 80}ms` }} />
          ),
        )}
      </div>

      <div className="grid gap-4 md:gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <ActivityChart
          data={activityChartData}
          title="Weekly activity"
          description="Exam starts and collaboration sessions over the last 7 days."
        />

        <Surface glow="amber" className="admin-enter p-5 sm:p-6">
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[color:var(--accent-amber)]">
                Priorities
              </p>
              <h3 className="mt-2 text-xl font-semibold text-white">Attention needed</h3>
            </div>
            <StatusBadge tone="amber">{priorities.length}</StatusBadge>
          </div>

          <div className="mt-5 space-y-2.5">
            {priorityItems.map((item, index) => (
              <Link
                key={`${item.title}-${index}`}
                href={item.href}
                className="group/prio admin-enter relative block overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 transition-all duration-200 hover:border-white/10 hover:bg-white/[0.04]"
                style={{ animationDelay: `${index * 80}ms` }}
              >
                <span
                  className={`absolute left-0 top-0 h-full w-[3px] rounded-r-full transition-opacity duration-200 ${
                    item.tone === 'rose' ? 'bg-[color:var(--accent-rose)]' :
                    item.tone === 'amber' ? 'bg-[color:var(--accent-amber)]' :
                    item.tone === 'emerald' ? 'bg-[color:var(--accent-emerald)]' :
                    'bg-[color:var(--accent-cyan)]'
                  } opacity-40 group-hover/prio:opacity-100`}
                />
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <StatusBadge tone={item.tone}>{String(item.value)}</StatusBadge>
                      <p className="text-sm font-medium text-white">{item.title}</p>
                    </div>
                    <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">
                      {item.detail}
                    </p>
                  </div>
                  <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-white/20 transition-all duration-200 group-hover/prio:translate-x-0.5 group-hover/prio:text-white/50" />
                </div>
              </Link>
            ))}
          </div>

          {hiddenPriorityCount > 0 ? (
            <Link
              href="/analytics/system-health"
              className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-[color:var(--accent-amber)]"
            >
              View {hiddenPriorityCount} more priority item{hiddenPriorityCount === 1 ? "" : "s"}
              <ArrowRight className="h-4 w-4" />
            </Link>
          ) : null}
        </Surface>
      </div>

      <div className="grid gap-4 md:gap-6 xl:grid-cols-[1.08fr_0.92fr]">
        <Surface className="admin-enter p-5 sm:p-6">
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[color:var(--accent-cyan)]">
                Reports
              </p>
              <h3 className="mt-2 text-xl font-semibold text-white">Pending reviews</h3>
            </div>
            <Link
              href="/reports"
              className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/8 px-4 py-2 text-xs font-medium uppercase tracking-[0.16em] text-[color:var(--muted-foreground)] transition hover:border-white/14 hover:text-white sm:w-auto"
            >
              View all
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="mt-5 overflow-hidden rounded-xl border border-white/8">
            {pendingReportsQuery.isLoading ? (
              <div className="px-4 py-8 text-sm text-[color:var(--muted-foreground)]">
                Loading reports...
              </div>
            ) : pendingReports.length ? (
              <>
                <div className="grid gap-3 p-3 md:hidden">
                  {pendingReports.map((report: any) => (
                    <Link
                      key={report.id}
                      href={`/reports/${report.id}`}
                      className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3.5 transition hover:border-white/12 hover:bg-white/[0.04]"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <p className="font-medium text-white">{report.question.subject}</p>
                        <StatusBadge tone="amber">{report.issueType.replaceAll("_", " ")}</StatusBadge>
                      </div>
                      <p className="mt-3 text-sm text-[color:var(--muted-foreground)]">{report.reporter.fullName}</p>
                      <p className="mt-1 text-xs text-[color:var(--muted-foreground)]">{formatDateTime(report.createdAt)}</p>
                    </Link>
                  ))}
                </div>

                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full min-w-[720px] divide-y divide-white/8 text-sm">
                    <thead className="bg-black/15 text-left text-[11px] uppercase tracking-[0.16em] text-[color:var(--muted-foreground)]">
                      <tr>
                        <th className="px-4 py-3">Subject</th>
                        <th className="px-4 py-3">Issue</th>
                        <th className="px-4 py-3">Reporter</th>
                        <th className="px-4 py-3">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04]">
                      {pendingReports.map((report: any) => (
                        <tr key={report.id} className="group/row relative transition-colors duration-150 hover:bg-white/[0.03]">
                          <td className="relative px-4 py-3 text-white">
                            <span className="absolute left-0 top-1/2 h-5 w-[2px] -translate-y-1/2 rounded-r-full bg-[color:var(--accent-amber)] opacity-0 transition-opacity duration-150 group-hover/row:opacity-100" />
                            {report.question.subject}
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge tone="amber">{report.issueType.replaceAll("_", " ")}</StatusBadge>
                          </td>
                          <td className="px-4 py-3 text-[color:var(--muted-foreground)]">
                            {report.reporter.fullName}
                          </td>
                          <td className="px-4 py-3 text-[color:var(--muted-foreground)]">
                            {formatDateTime(report.createdAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="px-4 py-8 text-sm text-[color:var(--muted-foreground)]">
                No pending reports.
              </div>
            )}
          </div>
        </Surface>

        <div className="grid gap-6">
          <Surface className="admin-enter p-5 sm:p-6">
            <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[color:var(--accent-emerald)]">
                  System
                </p>
                <h3 className="mt-2 text-xl font-semibold text-white">Health status</h3>
              </div>
              <Link
                href="/analytics/system-health"
                className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/8 px-4 py-2 text-xs font-medium uppercase tracking-[0.16em] text-[color:var(--muted-foreground)] transition hover:border-white/14 hover:text-white sm:w-auto"
              >
                Details
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="mt-5 grid gap-2.5">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/8 bg-black/10 px-4 py-3">
                <div className="flex items-center gap-3">
                  <Database className="h-4 w-4 text-[color:var(--accent-cyan)]" />
                  <span className="text-sm text-white">Database</span>
                </div>
                <StatusBadge tone={systemHealth?.dependencies.databaseReachable ? "emerald" : "rose"}>
                  {systemHealth?.dependencies.databaseReachable ? "live" : "down"}
                </StatusBadge>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/8 bg-black/10 px-4 py-3">
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-[color:var(--accent-amber)]" />
                  <span className="text-sm text-white">Email</span>
                </div>
                <StatusBadge tone={systemHealth?.dependencies.emailEnabled ? "emerald" : "amber"}>
                  {systemHealth?.dependencies.emailEnabled ? "active" : "paused"}
                </StatusBadge>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/8 bg-black/10 px-4 py-3">
                <div className="flex items-center gap-3">
                  <Layers3 className="h-4 w-4 text-[color:var(--accent-emerald)]" />
                  <span className="text-sm text-white">Queue backlog</span>
                </div>
                <StatusBadge tone={(systemHealth?.queues.leaderboardProjectionBacklog ?? 0) > 0 ? "amber" : "emerald"}>
                  {formatInteger(systemHealth?.queues.leaderboardProjectionBacklog ?? 0)}
                </StatusBadge>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/8 bg-black/10 px-4 py-3">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="h-4 w-4 text-[color:var(--accent-cyan)]" />
                  <span className="text-sm text-white">Step-up challenges</span>
                </div>
                <StatusBadge tone={(systemHealth?.queues.pendingStepUpChallenges ?? 0) > 0 ? "amber" : "slate"}>
                  {formatInteger(systemHealth?.queues.pendingStepUpChallenges ?? 0)}
                </StatusBadge>
              </div>
            </div>
          </Surface>

          <Surface className="admin-enter p-5 sm:p-6">
            <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[color:var(--accent-amber)]">
                  Content
                </p>
                <h3 className="mt-2 text-xl font-semibold text-white">Question inventory</h3>
              </div>
              <StatusBadge tone="slate">{formatCompactNumber(totalContent)} total</StatusBadge>
            </div>

            <div className="mt-5 space-y-3">
              {contentMix.map((item, index) => {
                const width = totalContent > 0 ? Math.max(6, (item.value / totalContent) * 100) : 0;
                return (
                  <div
                    key={item.label}
                    className="admin-enter rounded-xl border border-white/8 bg-black/10 p-4"
                    style={{ animationDelay: `${index * 60}ms` }}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <p className="text-sm font-medium text-white">{item.label}</p>
                      <StatusBadge tone={item.tone}>{formatInteger(item.value)}</StatusBadge>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/[0.05]">
                      <div
                        className={
                          item.tone === "cyan"
                            ? "h-full rounded-full bg-[color:var(--accent-cyan)]"
                            : item.tone === "emerald"
                              ? "h-full rounded-full bg-[color:var(--accent-emerald)]"
                              : "h-full rounded-full bg-[color:var(--accent-amber)]"
                        }
                        style={{ width: `${width}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </Surface>
        </div>
      </div>

      <Surface className="admin-enter p-5 sm:p-6">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[color:var(--accent-cyan)]">
            Quick actions
          </p>
          <h3 className="mt-2 text-xl font-semibold text-white">Go to</h3>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {quickActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.href}
                href={action.href}
                className="group/qa admin-enter rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-white/10 hover:bg-white/[0.04] hover:shadow-[0_8px_24px_rgba(0,0,0,0.15)] sm:p-5"
                style={{ animationDelay: `${index * 80}ms` }}
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.03] text-[color:var(--accent-cyan)] transition-colors duration-200 group-hover/qa:border-[color:var(--accent-cyan)]/20 group-hover/qa:bg-[color:var(--accent-cyan)]/8 sm:h-10 sm:w-10">
                  <Icon className="h-5 w-5" />
                </div>
                <h4 className="mt-3 text-base font-semibold text-white sm:mt-4">{action.title}</h4>
                <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">
                  {action.detail}
                </p>
                <div className="mt-3 inline-flex items-center gap-2 text-[13px] font-medium text-[color:var(--muted-foreground)] transition-colors duration-200 group-hover/qa:text-white sm:mt-4">
                  Open
                  <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover/qa:translate-x-0.5" />
                </div>
              </Link>
            );
          })}
        </div>
      </Surface>
    </section>
  );
}
