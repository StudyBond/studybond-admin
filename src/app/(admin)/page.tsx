"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/ui/data-table";
import { ErrorState } from "@/components/ui/error-state";
import { PageHeader, SectionTitle } from "@/components/ui/page-header";
import { StatCard, StatGrid } from "@/components/ui/stat-card";
import { StatCardSkeleton } from "@/components/ui/skeleton";
import { ActivityChart } from "@/features/analytics/components/activity-chart";
import { useAdminActivity } from "@/features/analytics/hooks/use-admin-activity";
import { useAdminOverview } from "@/features/analytics/hooks/use-admin-overview";
import { useAdminSystemHealth } from "@/features/analytics/hooks/use-admin-system-health";
import { useAdminReports } from "@/features/reports/hooks/use-admin-reports";
import {
  formatCompactNumber,
  formatDateTime,
  formatInteger,
} from "@/lib/utils/format";
import {
  ArrowRight,
  CheckCircle2,
  Database,
  Inbox,
  Layers3,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { useMemo } from "react";

/**
 * Dashboard.
 *
 * Two sections from the previous version are gone rather than restyled:
 *
 * - "Quick actions / Go to" — four large cards linking to Reports,
 *   Questions, Users and Premium. All four are permanently one click away
 *   in the sidebar, so the block taught nothing and pushed real work
 *   below the fold.
 * - "Question inventory" — a breakdown of the question bank. That is a
 *   Questions-page concern; it is not something you act on from here.
 *
 * What remains is ordered by urgency: what is wrong, then the numbers,
 * then the trend, then the actual work queue.
 */

type Priority = {
  id: string;
  title: string;
  detail: string;
  href: string;
  severity: "danger" | "warning" | "info";
  value: string;
};

const severityRank = { danger: 0, warning: 1, info: 2 } as const;

export default function AdminOverviewPage() {
  const overviewQuery = useAdminOverview();
  const activityQuery = useAdminActivity(7);
  const systemHealthQuery = useAdminSystemHealth();
  const reportsQuery = useAdminReports({
    page: 1,
    limit: 6,
    status: "PENDING",
  });

  const overview = overviewQuery.data;
  const systemHealth = systemHealthQuery.data;
  const pendingReports = reportsQuery.data?.reports ?? [];

  const activityData = useMemo(
    () =>
      (activityQuery.data?.daily ?? []).map((item) => ({
        label: item.date.slice(5),
        exams: item.examStarts,
        collaborations: item.collaborationSessions,
      })),
    [activityQuery.data],
  );

  /* ── What needs attention, worst first ─────────────────────── */
  const priorities = useMemo<Priority[]>(() => {
    if (!overview || !systemHealth) return [];

    const items: Priority[] = [];

    if (!systemHealth.dependencies.databaseReachable) {
      items.push({
        id: "database",
        title: "Database unreachable",
        detail:
          "Avoid destructive operations until connectivity is restored.",
        href: "/analytics/system-health",
        severity: "danger",
        value: "Offline",
      });
    }

    if (systemHealth.queues.recentEmailFailuresLast24Hours > 0) {
      items.push({
        id: "email",
        title: "Email delivery failing",
        detail: "Failed deliveries in the last 24 hours.",
        href: "/analytics/system-health",
        severity: "danger",
        value: formatInteger(
          systemHealth.queues.recentEmailFailuresLast24Hours,
        ),
      });
    }

    if (overview.content.pendingReports > 0) {
      items.push({
        id: "reports",
        title: "Reports waiting for review",
        detail: "Learners have flagged issues with these questions.",
        href: "/reports",
        severity: overview.content.pendingReports > 20 ? "danger" : "warning",
        value: formatInteger(overview.content.pendingReports),
      });
    }

    if (overview.premium.expiringIn7Days > 0) {
      items.push({
        id: "premium",
        title: "Premium expiring within 7 days",
        detail: "Subscriptions that will lapse without a renewal.",
        href: "/premium",
        severity: "warning",
        value: formatInteger(overview.premium.expiringIn7Days),
      });
    }

    if (systemHealth.queues.leaderboardProjectionBacklog > 0) {
      items.push({
        id: "queue",
        title: "Leaderboard projection backlog",
        detail: "Events still waiting to be projected.",
        href: "/analytics/system-health",
        severity: "info",
        value: formatInteger(systemHealth.queues.leaderboardProjectionBacklog),
      });
    }

    return items.sort(
      (a, b) => severityRank[a.severity] - severityRank[b.severity],
    );
  }, [overview, systemHealth]);

  /* ── Key numbers. Status is set only where the number is
        genuinely good or bad — otherwise it stays neutral. ───── */
  const stats = overview
    ? [
        {
          label: "Pending reports",
          value: formatInteger(overview.content.pendingReports),
          hint: `${formatCompactNumber(overview.content.totalQuestions)} questions in the bank`,
          href: "/reports",
          status:
            overview.content.pendingReports > 20
              ? ("danger" as const)
              : overview.content.pendingReports > 0
                ? ("warning" as const)
                : ("success" as const),
        },
        {
          label: "Exams completed (7d)",
          value: formatCompactNumber(
            overview.engagement.examsCompletedLast7Days,
          ),
          hint: `${formatCompactNumber(overview.engagement.examsStartedLast7Days)} started`,
        },
        {
          label: "Premium expiring (7d)",
          value: formatInteger(overview.premium.expiringIn7Days),
          hint: `${formatInteger(overview.premium.activeUsers)} active subscribers`,
          href: "/premium",
          status:
            overview.premium.expiringIn7Days > 0
              ? ("warning" as const)
              : undefined,
        },
        {
          label: "Live collaborations",
          value: formatInteger(overview.engagement.collaborationInProgress),
          hint: `${formatInteger(overview.engagement.collaborationWaiting)} waiting to start`,
        },
      ]
    : [];

  const healthChecks = systemHealth
    ? [
        {
          label: "Database",
          icon: Database,
          ok: systemHealth.dependencies.databaseReachable,
          value: systemHealth.dependencies.databaseReachable
            ? "Reachable"
            : "Unreachable",
        },
        {
          label: "Email",
          icon: Mail,
          ok: systemHealth.dependencies.emailEnabled,
          value: systemHealth.dependencies.emailEnabled ? "Active" : "Paused",
        },
        {
          label: "Queue backlog",
          icon: Layers3,
          ok: systemHealth.queues.leaderboardProjectionBacklog === 0,
          value: formatInteger(systemHealth.queues.leaderboardProjectionBacklog),
        },
        {
          label: "Step-up challenges",
          icon: ShieldCheck,
          ok: true,
          value: formatInteger(systemHealth.queues.pendingStepUpChallenges),
        },
      ]
    : [];

  type PendingReport = (typeof pendingReports)[number];

  const reportColumns: Column<PendingReport>[] = [
    {
      key: "subject",
      header: "Question",
      primary: true,
      cell: (report) => (
        <span className="line-clamp-2">{report.question.subject}</span>
      ),
    },
    {
      key: "issue",
      header: "Issue",
      cell: (report) => (
        <Badge tone="warning">{report.issueType.replaceAll("_", " ")}</Badge>
      ),
    },
    {
      key: "reporter",
      header: "Reported by",
      cell: (report) => report.reporter.fullName,
      showFrom: "lg",
    },
    {
      key: "date",
      header: "Received",
      cell: (report) => formatDateTime(report.createdAt),
      showFrom: "lg",
    },
  ];

  return (
    <div className="sb-enter space-y-6 pb-2">
      <PageHeader
        title="Dashboard"
        description="What needs your attention right now."
        meta={
          <>
            {overview?.institution ? (
              <Badge tone="brand">{overview.institution.code}</Badge>
            ) : null}
            <Badge
              tone={
                systemHealth?.dependencies.databaseReachable
                  ? "success"
                  : "danger"
              }
              dot
            >
              {systemHealth?.dependencies.databaseReachable
                ? "Database reachable"
                : "Database unreachable"}
            </Badge>
            {overview ? (
              <span className="text-[length:var(--sb-text-xs)] text-[var(--sb-text-tertiary)]">
                Updated {formatDateTime(overview.generatedAt)}
              </span>
            ) : null}
          </>
        }
      />

      {overviewQuery.isError ? (
        <ErrorState
          title="Could not load the overview"
          error={overviewQuery.error}
          onRetry={() => overviewQuery.refetch()}
        />
      ) : null}

      {/* ── 1. Needs attention ──────────────────────────────────
          Promoted from a narrow side column to the top of the page.
          This is the reason an admin opens the dashboard. */}
      {overview && systemHealth ? (
        <section className="space-y-3">
          <SectionTitle
            title="Needs attention"
            description={
              priorities.length
                ? "Ordered by severity. Each item links to where you resolve it."
                : undefined
            }
          />

          {priorities.length ? (
            <ul className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {priorities.map((item) => (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    className="group flex h-full items-start gap-3 rounded-[var(--sb-radius-lg)] border border-[var(--sb-border)] bg-[var(--sb-surface-1)] p-4 transition-colors duration-[var(--sb-duration-fast)] hover:border-[var(--sb-border-hover)] hover:bg-[var(--sb-surface-2)]"
                  >
                    <Badge
                      tone={item.severity}
                      className="sb-nums mt-0.5 shrink-0"
                    >
                      {item.value}
                    </Badge>

                    <div className="min-w-0 flex-1">
                      <p className="text-[length:var(--sb-text-base)] font-medium text-[var(--sb-text)]">
                        {item.title}
                      </p>
                      <p className="mt-0.5 text-[length:var(--sb-text-sm)] text-[var(--sb-text-secondary)]">
                        {item.detail}
                      </p>
                    </div>

                    <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-[var(--sb-text-tertiary)] transition-transform duration-[var(--sb-duration-fast)] group-hover:translate-x-0.5" />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex items-center gap-2.5 rounded-[var(--sb-radius-lg)] border border-[var(--sb-success-ring)] bg-[var(--sb-success-soft)] px-4 py-3">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--sb-success)]" />
              <p className="text-[length:var(--sb-text-base)] text-[var(--sb-text)]">
                Nothing needs attention. Reports, premium, email and queues are
                all clear.
              </p>
            </div>
          )}
        </section>
      ) : null}

      {/* ── 2. Key numbers ──────────────────────────────────── */}
      <StatGrid>
        {stats.length
          ? stats.map((stat) => <StatCard key={stat.label} {...stat} />)
          : Array.from({ length: 4 }).map((_, index) => (
              <StatCardSkeleton key={index} />
            ))}
      </StatGrid>

      {/* ── 3. Trend ────────────────────────────────────────── */}
      <ActivityChart
        data={activityData}
        isLoading={activityQuery.isLoading}
        title="Weekly activity"
        description="Exam starts and collaboration sessions, last 7 days."
      />

      {/* ── 4. The work queue, then system health ───────────── */}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <section className="min-w-0 space-y-3">
          <SectionTitle
            title="Pending reports"
            action={
              <Button asChild href="/reports" variant="secondary" size="sm">
                View all
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            }
          />

          <DataTable
            caption="Question reports awaiting review"
            items={pendingReports}
            columns={reportColumns}
            getKey={(report) => report.id}
            href={(report) => `/reports/${report.id}`}
            isLoading={reportsQuery.isLoading}
            error={reportsQuery.error}
            onRetry={() => reportsQuery.refetch()}
            emptyIcon={<Inbox className="h-4 w-4" />}
            emptyTitle="No reports waiting"
            emptyDescription="Reported questions will appear here as learners flag them."
          />
        </section>

        <section className="min-w-0 space-y-3">
          <SectionTitle
            title="System health"
            action={
              <Button
                asChild
                href="/analytics/system-health"
                variant="ghost"
                size="sm"
              >
                Details
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            }
          />

          <ul className="divide-y divide-[var(--sb-border)] overflow-hidden rounded-[var(--sb-radius-lg)] border border-[var(--sb-border)] bg-[var(--sb-surface-1)]">
            {healthChecks.map((check) => {
              const Icon = check.icon;
              return (
                <li
                  key={check.label}
                  className="flex items-center gap-3 px-4 py-2.5"
                >
                  <Icon className="h-4 w-4 shrink-0 text-[var(--sb-text-tertiary)]" />
                  <span className="min-w-0 flex-1 truncate text-[length:var(--sb-text-base)] text-[var(--sb-text-secondary)]">
                    {check.label}
                  </span>
                  <Badge tone={check.ok ? "success" : "danger"}>
                    {check.value}
                  </Badge>
                </li>
              );
            })}

            {!healthChecks.length ? (
              <li className="px-4 py-8 text-center text-[length:var(--sb-text-base)] text-[var(--sb-text-secondary)]">
                Loading health checks…
              </li>
            ) : null}
          </ul>
        </section>
      </div>
    </div>
  );
}
