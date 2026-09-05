"use client";

import { Badge } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/ui/data-table";
import { ErrorState } from "@/components/ui/error-state";
import { PageHeader, SectionTitle } from "@/components/ui/page-header";
import { StatCardSkeleton } from "@/components/ui/skeleton";
import { StatCard, StatGrid } from "@/components/ui/stat-card";
import { useAdminSession } from "@/features/admin-auth/hooks/use-admin-session";
import { ActivityChart } from "@/features/analytics/components/activity-chart";
import { useAdminActivity } from "@/features/analytics/hooks/use-admin-activity";
import { useAdminOverview } from "@/features/analytics/hooks/use-admin-overview";
import { useAdminPremiumInsights } from "@/features/analytics/hooks/use-admin-premium-insights";
import { useAdminSystemHealth } from "@/features/analytics/hooks/use-admin-system-health";
import {
  formatCurrencyNaira,
  formatInteger,
} from "@/lib/utils/format";
import { Lock, Receipt } from "lucide-react";

/**
 * Platform analytics.
 *
 * The correctness problem here was quiet. The premium query is only enabled
 * for superadmins, so for everyone else `premium` stayed undefined and every
 * figure fell through its `?? 0`. An ordinary admin saw "Premium users 0"
 * and "Expiring (7d) 0" rendered exactly like real counts — only the single
 * revenue box said "Restricted". Withheld numbers now say they are withheld.
 *
 * Presentation: the page had three different ways to draw a number — a
 * MetricCard row, then rounded div boxes, then more rounded div boxes at a
 * different size — plus decorative uppercase kickers over each panel and a
 * `min-w-[640px]` table. One StatCard, one DataTable, no kickers.
 *
 * The two status badges also said nothing an admin could act on: the data
 * source rendered as the raw enum ("ROLLUP"), and "rollup lag 0d" was
 * displayed permanently, including when there was no lag at all. Lag is now
 * only mentioned when there is some.
 */

type PremiumDailyRow = {
  date: string;
  successfulPayments: number;
  revenueNaira: number;
  manualGrants: number;
  revocations: number;
};

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

  const rollupLagDays = systemHealth?.analytics.rollupLagDays ?? 0;

  const activityChartData = (activity?.daily ?? []).map((item) => ({
    label: item.date.slice(5),
    exams: item.examStarts,
    collaborations: item.collaborationSessions,
  }));

  const dailyRows = ((premium?.daily ?? []) as PremiumDailyRow[]).slice(-7);

  const dailyColumns: Column<PremiumDailyRow>[] = [
    {
      key: "date",
      header: "Date",
      primary: true,
      width: "8rem",
      cell: (row) => <span className="sb-nums">{row.date}</span>,
    },
    {
      key: "payments",
      header: "Payments",
      numeric: true,
      cell: (row) => formatInteger(row.successfulPayments),
    },
    {
      key: "revenue",
      header: "Revenue",
      numeric: true,
      cell: (row) => formatCurrencyNaira(row.revenueNaira),
    },
    {
      key: "grants",
      header: "Grants",
      numeric: true,
      cell: (row) => formatInteger(row.manualGrants),
    },
    {
      key: "revocations",
      header: "Revoked",
      numeric: true,
      cell: (row) => formatInteger(row.revocations),
    },
  ];

  return (
    <div className="sb-enter space-y-6 pb-2">
      <PageHeader
        title="Analytics"
        description="How much the platform is being used, what premium is earning, and whether the numbers you are reading are current."
        meta={
          <>
            {/* Says where the numbers come from, in words rather than the
                raw enum the API returns. */}
            <Badge tone="neutral">
              {activity?.dataSource === "ROLLUP"
                ? "From nightly rollups"
                : "Live from the database"}
            </Badge>
            {/* Only worth saying when there is actually a lag. */}
            {rollupLagDays > 0 ? (
              <Badge tone="warning" dot>
                Rollups {rollupLagDays} day{rollupLagDays === 1 ? "" : "s"} behind
              </Badge>
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

      {/* ── Engagement ────────────────────────────────────────── */}
      {overviewQuery.isLoading ? (
        <StatGrid>
          {Array.from({ length: 4 }).map((_, index) => (
            <StatCardSkeleton key={index} />
          ))}
        </StatGrid>
      ) : overview ? (
        <StatGrid>
          <StatCard
            label="Exam starts (7d)"
            value={formatInteger(overview.engagement.examsStartedLast7Days)}
            hint={`${formatInteger(
              overview.engagement.examsCompletedLast7Days,
            )} were completed`}
          />
          <StatCard
            label="Collaborations (7d)"
            value={formatInteger(
              overview.engagement.collaborationCreatedLast7Days,
            )}
            hint={`${formatInteger(
              overview.engagement.collaborationInProgress,
            )} still running`}
          />
          <StatCard
            label="Paid subscriptions"
            value={formatInteger(overview.premium.activePaidSubscriptions)}
            hint={`${formatInteger(
              overview.premium.activeAdminEntitlements,
            )} granted by an admin`}
          />
          <StatCard
            label="New users (30d)"
            value={formatInteger(overview.users.newLast30Days)}
            hint={`${formatInteger(overview.users.verified)} verified accounts total`}
          />
        </StatGrid>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)]">
        <ActivityChart
          data={activityChartData}
          title="Activity this week"
          description="Exam starts and collaboration sessions per day."
        />

        {/* ── Premium ─────────────────────────────────────────
            Superadmin-only. Rather than let every figure fall through
            to zero, say plainly that it is withheld. */}
        <section className="min-w-0 space-y-3">
          <SectionTitle title="Premium (30 days)" />

          {!isSuperadmin ? (
            <div className="flex items-start gap-3 rounded-[var(--sb-radius-lg)] border border-[var(--sb-border)] bg-[var(--sb-surface-1)] p-4 sm:p-5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--sb-radius)] border border-[var(--sb-border)] bg-[var(--sb-surface-2)] text-[var(--sb-text-tertiary)]">
                <Lock className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[length:var(--sb-text-md)] font-medium text-[var(--sb-text)]">
                  Superadmin only
                </p>
                <p className="mt-1 text-[length:var(--sb-text-base)] text-[var(--sb-text-secondary)]">
                  Revenue and entitlement figures are not shown for your role.
                  Everything else on this page is complete.
                </p>
              </div>
            </div>
          ) : premiumQuery.isError ? (
            <ErrorState
              title="Could not load premium figures"
              error={premiumQuery.error}
              onRetry={() => premiumQuery.refetch()}
            />
          ) : premiumQuery.isLoading ? (
            <div className="grid gap-3 min-[480px]:grid-cols-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <StatCardSkeleton key={index} />
              ))}
            </div>
          ) : (
            <div className="grid gap-3 min-[480px]:grid-cols-2">
              <StatCard
                label="Revenue"
                value={formatCurrencyNaira(
                  premium?.revenue.successfulRevenueNaira ?? 0,
                )}
                hint={`${formatInteger(
                  premium?.revenue.successfulPayments ?? 0,
                )} payments`}
                className="min-[480px]:col-span-2"
              />
              <StatCard
                label="Premium users"
                value={formatInteger(premium?.current.activePremiumUsers ?? 0)}
              />
              <StatCard
                label="Expiring in 7 days"
                value={formatInteger(premium?.current.expiringIn7Days ?? 0)}
                status={premium?.current.expiringIn7Days ? "warning" : undefined}
              />
              <StatCard
                label="Manual grants"
                value={formatInteger(premium?.adminActions.manualGrants ?? 0)}
              />
              <StatCard
                label="Revocations"
                value={formatInteger(premium?.adminActions.revocations ?? 0)}
              />
            </div>
          )}
        </section>
      </div>

      {/* ── Runtime ───────────────────────────────────────────── */}
      <section className="space-y-3">
        <SectionTitle
          title="Runtime"
          description="What the backend is currently running with."
        />
        <StatGrid>
          <StatCard
            label="Environment"
            value={systemHealth?.runtime.environment ?? "Unknown"}
          />
          <StatCard
            label="Background jobs"
            value={systemHealth?.runtime.jobsEnabled ? "Enabled" : "Disabled"}
            /* Disabled jobs in production means rollups and expiries stop. */
            status={systemHealth?.runtime.jobsEnabled ? undefined : "warning"}
          />
          <StatCard
            label="Redis"
            value={systemHealth?.runtime.redisEnabled ? "Enabled" : "Disabled"}
            status={systemHealth?.runtime.redisEnabled ? undefined : "warning"}
          />
          <StatCard
            label="Live connections"
            value={formatInteger(systemHealth?.live.activeWsConnections ?? 0)}
            hint="Open WebSocket clients"
          />
        </StatGrid>
      </section>

      {/* ── Payment trail ─────────────────────────────────────── */}
      {isSuperadmin ? (
        <section className="space-y-3">
          <SectionTitle
            title="Daily payments"
            description="The last seven days of premium activity."
          />
          <DataTable
            caption="Daily premium payments, grants and revocations"
            items={dailyRows}
            columns={dailyColumns}
            getKey={(row) => row.date}
            isLoading={premiumQuery.isLoading}
            error={premiumQuery.isError ? premiumQuery.error : undefined}
            onRetry={() => premiumQuery.refetch()}
            emptyIcon={<Receipt className="h-4 w-4" />}
            emptyTitle="No payment activity"
            emptyDescription="Nothing was paid, granted, or revoked in the last seven days."
          />
        </section>
      ) : null}
    </div>
  );
}
