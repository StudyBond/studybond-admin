"use client";

import { Badge, type BadgeTone } from "@/components/ui/badge";
import { ErrorState } from "@/components/ui/error-state";
import { PageHeader, SectionTitle } from "@/components/ui/page-header";
import { StatCardSkeleton } from "@/components/ui/skeleton";
import { StatCard, StatGrid } from "@/components/ui/stat-card";
import { useAdminSystemHealth } from "@/features/analytics/hooks/use-admin-system-health";
import {
  formatDateTime,
  formatDurationSeconds,
  formatInteger,
} from "@/lib/utils/format";

/**
 * System health.
 *
 * This page is read in one situation: something looks wrong and an admin
 * wants to know whether the platform is the cause. The old version made
 * that hard.
 *
 * Colour carried no rule. "Email failures (24h)" was amber when the count
 * was zero and red when it was not — so a healthy system showed a warning
 * colour. "Queue backlog" was cyan at zero and amber otherwise. Database
 * was emerald/rose. Every state had its own hue and none of them agreed on
 * what green meant. Here there is one rule, applied everywhere: green is
 * fine, amber needs looking at, red is broken, grey is a fact.
 *
 * Wording was also wrong in a way that matters at 3am. Redis being switched
 * off in config rendered as "redis down", identical to Redis having crashed.
 * This page reads flags, not health checks, so it now distinguishes
 * "Disabled" (someone chose this) from "Unreachable" (it is broken).
 *
 * Structurally: three uppercase kickers, three different box styles and
 * nine one-off status pills became a headline stat row, one list of checks,
 * and one grid of counters.
 */

type CheckStatus = "ok" | "warn" | "bad" | "info";

const checkTone: Record<CheckStatus, BadgeTone> = {
  ok: "success",
  warn: "warning",
  bad: "danger",
  info: "neutral",
};

/** One dependency or flag, drawn the same way every time. */
function CheckRow({
  label,
  description,
  value,
  status,
}: {
  label: string;
  description?: string;
  value: string;
  status: CheckStatus;
}) {
  return (
    <li className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-[length:var(--sb-text-base)] font-medium text-[var(--sb-text)]">
          {label}
        </p>
        {description ? (
          <p className="mt-0.5 text-[length:var(--sb-text-xs)] text-[var(--sb-text-tertiary)]">
            {description}
          </p>
        ) : null}
      </div>
      <Badge tone={checkTone[status]} dot={status !== "info"}>
        {value}
      </Badge>
    </li>
  );
}

export default function SystemHealthPage() {
  const systemHealthQuery = useAdminSystemHealth();
  const health = systemHealthQuery.data;

  const emailFailures = health?.queues.recentEmailFailuresLast24Hours ?? 0;
  const projectionBacklog = health?.queues.leaderboardProjectionBacklog ?? 0;
  const rollupLagDays = health?.analytics.rollupLagDays ?? 0;
  const isDatabaseReachable = health?.dependencies.databaseReachable ?? false;

  /**
   * The header should answer "is anything wrong?" before the admin reads a
   * single number. A rollup one day behind is normal for a nightly job, so
   * only two or more days counts.
   */
  const problems = health
    ? [
        !isDatabaseReachable && "database",
        emailFailures > 0 && "email failures",
        projectionBacklog > 0 && "projection backlog",
        rollupLagDays > 1 && "stale rollups",
      ].filter(Boolean)
    : [];

  return (
    <div className="sb-enter space-y-6 pb-2">
      <PageHeader
        title="System health"
        description="Whether the backend, its dependencies, and its queues are behaving. Read this before assuming a bug is in the app."
        meta={
          health ? (
            <>
              <Badge
                tone={problems.length ? "warning" : "success"}
                dot
              >
                {problems.length
                  ? `Needs attention: ${problems.join(", ")}`
                  : "Everything healthy"}
              </Badge>
              <Badge tone="neutral">
                Checked {formatDateTime(health.generatedAt)}
              </Badge>
            </>
          ) : null
        }
      />

      {systemHealthQuery.isError ? (
        <ErrorState
          title="Could not load system health"
          error={systemHealthQuery.error}
          fallback="Check backend connectivity and that this account has admin access."
          onRetry={() => systemHealthQuery.refetch()}
        />
      ) : null}

      {/* ── The four numbers worth seeing first ───────────────── */}
      {systemHealthQuery.isLoading ? (
        <StatGrid>
          {Array.from({ length: 4 }).map((_, index) => (
            <StatCardSkeleton key={index} />
          ))}
        </StatGrid>
      ) : health ? (
        <StatGrid>
          <StatCard
            label="Database"
            value={isDatabaseReachable ? "Reachable" : "Unreachable"}
            hint="The backend answered a query"
            status={isDatabaseReachable ? "success" : "danger"}
          />
          <StatCard
            label="Email failures (24h)"
            value={formatInteger(emailFailures)}
            hint={
              health.dependencies.emailEnabled
                ? "Delivery is switched on"
                : "Delivery is paused, so nothing is being sent"
            }
            status={emailFailures > 0 ? "danger" : undefined}
          />
          <StatCard
            label="Projection backlog"
            value={formatInteger(projectionBacklog)}
            hint={`${formatInteger(
              health.queues.pendingQuestionReports,
            )} question reports pending`}
            status={projectionBacklog > 0 ? "warning" : undefined}
          />
          <StatCard
            label="Live connections"
            value={formatInteger(health.live.activeWsConnections)}
            hint={`${formatInteger(
              health.live.totalHttpRequests,
            )} HTTP requests tracked`}
          />
        </StatGrid>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        {/* ── Checks ────────────────────────────────────────── */}
        <section className="min-w-0 space-y-3">
          <SectionTitle
            title="Dependencies and flags"
            description="What the backend is connected to, and what it has switched on."
          />
          <ul className="divide-y divide-[var(--sb-border)] overflow-hidden rounded-[var(--sb-radius-lg)] border border-[var(--sb-border)] bg-[var(--sb-surface-1)]">
            <CheckRow
              label="Environment"
              value={health?.runtime.environment ?? "Unknown"}
              status="info"
            />
            <CheckRow
              label="Uptime"
              description="Since the backend last restarted"
              value={formatDurationSeconds(health?.runtime.uptimeSeconds)}
              status="info"
            />
            <CheckRow
              label="Database"
              value={isDatabaseReachable ? "Reachable" : "Unreachable"}
              status={isDatabaseReachable ? "ok" : "bad"}
            />
            <CheckRow
              label="Email delivery"
              description="Sign-up codes, resets, and receipts"
              value={health?.dependencies.emailEnabled ? "Enabled" : "Paused"}
              status={health?.dependencies.emailEnabled ? "ok" : "warn"}
            />
            <CheckRow
              label="Redis"
              /* A config flag, not a ping. Say what it is. */
              description="Caching and rate limiting"
              value={health?.runtime.redisEnabled ? "Enabled" : "Disabled"}
              status={health?.runtime.redisEnabled ? "ok" : "info"}
            />
            <CheckRow
              label="Background jobs"
              description="Rollups, expiry sweeps, projections"
              value={health?.runtime.jobsEnabled ? "Enabled" : "Paused"}
              status={health?.runtime.jobsEnabled ? "ok" : "warn"}
            />
            <CheckRow
              label="Leaderboard projection"
              value={
                health?.runtime.leaderboardProjectionEnabled
                  ? "Enabled"
                  : "Disabled"
              }
              status={
                health?.runtime.leaderboardProjectionEnabled ? "ok" : "info"
              }
            />
            <CheckRow
              label="Leaderboard reads"
              description="Where the leaderboard is served from"
              value={
                health?.runtime.leaderboardRedisReadEnabled
                  ? "Projection cache"
                  : "Direct from database"
              }
              status="info"
            />
            <CheckRow
              label="Analytics rollups"
              description={
                health?.analytics.latestRollupUpdatedAt
                  ? `Last built ${formatDateTime(
                      health.analytics.latestRollupUpdatedAt,
                    )}`
                  : "No rollup has been recorded yet"
              }
              value={
                rollupLagDays > 0
                  ? `${rollupLagDays} day${rollupLagDays === 1 ? "" : "s"} behind`
                  : "Current"
              }
              /* One day behind is what a nightly job looks like. */
              status={rollupLagDays > 1 ? "warn" : "ok"}
            />
          </ul>
        </section>

        {/* ── Counters ──────────────────────────────────────── */}
        <section className="min-w-0 space-y-3">
          <SectionTitle
            title="Queues and traffic"
            description="Counts since the backend started. Anything climbing steadily is worth a look."
          />
          <StatGrid className="lg:grid-cols-2">
            <StatCard
              label="Projection backlog"
              value={formatInteger(projectionBacklog)}
              hint="Leaderboard rows waiting"
              status={projectionBacklog > 0 ? "warning" : undefined}
            />
            <StatCard
              label="Pending reports"
              value={formatInteger(health?.queues.pendingQuestionReports ?? 0)}
              hint="Awaiting moderation"
              href="/reports"
            />
            <StatCard
              label="Pending step-ups"
              value={formatInteger(health?.queues.pendingStepUpChallenges ?? 0)}
              hint="Challenges issued, not yet used"
            />
            <StatCard
              label="Dropped WS events"
              value={formatInteger(
                health?.live.totalWsDroppedOutboundEvents ?? 0,
              )}
              hint="Messages that never reached a client"
              status={
                health?.live.totalWsDroppedOutboundEvents ? "warning" : undefined
              }
            />
            <StatCard
              label="WS outbound queue"
              value={formatInteger(health?.live.wsOutboundQueueLength ?? 0)}
              hint="Waiting to be sent right now"
            />
            <StatCard
              label="Latest rollup"
              value={health?.analytics.latestRollupDate ?? "None"}
              hint="Most recent analytics day built"
            />
          </StatGrid>
        </section>
      </div>
    </div>
  );
}
