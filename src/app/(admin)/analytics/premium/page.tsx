"use client";

import { Badge } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { PageHeader, SectionTitle } from "@/components/ui/page-header";
import { StatCardSkeleton } from "@/components/ui/skeleton";
import { StatCard, StatGrid } from "@/components/ui/stat-card";
import { useAdminSession } from "@/features/admin-auth/hooks/use-admin-session";
import { useAdminPremiumInsights } from "@/features/analytics/hooks/use-admin-premium-insights";
import {
  formatCurrencyNaira,
  formatDateTime,
  formatInteger,
} from "@/lib/utils/format";
import { Lock, Receipt } from "lucide-react";

/**
 * Premium analytics.
 *
 * Same treatment as the other analytics screens: the four decorative
 * uppercase kickers, the four icon chips in circles, the `glow` tints and
 * the three separate box styles are gone. What is left is the numbers, in
 * one card style, grouped by the question they answer.
 *
 * The daily table also lost `min-w-[640px]` — thirty rows of five columns
 * forced a horizontal scroll on any laptop. It reflows into cards below md
 * like every other table in the console.
 */

type PremiumDailyRow = {
  date: string;
  successfulPayments: number;
  revenueNaira: number;
  manualGrants: number;
  revocations: number;
};

export default function PremiumAnalyticsPage() {
  const sessionQuery = useAdminSession();
  const isSuperadmin = sessionQuery.data?.user?.role === "SUPERADMIN";
  const premiumQuery = useAdminPremiumInsights(30, isSuperadmin);
  const premium = premiumQuery.data;

  if (sessionQuery.isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Premium analytics"
          description="Checking your access…"
        />
        <StatGrid>
          {Array.from({ length: 4 }).map((_, index) => (
            <StatCardSkeleton key={index} />
          ))}
        </StatGrid>
      </div>
    );
  }

  if (!isSuperadmin) {
    return (
      <div className="sb-enter space-y-6">
        <PageHeader
          title="Premium analytics"
          description="Revenue, entitlement operations, and subscription health."
        />
        <div className="rounded-[var(--sb-radius-lg)] border border-[var(--sb-border)] bg-[var(--sb-surface-1)]">
          <EmptyState
            icon={<Lock className="h-4 w-4" />}
            title="Superadmin only"
            description="Revenue figures are limited to superadmins. The main analytics page has the engagement numbers, which are open to every admin."
          />
        </div>
      </div>
    );
  }

  /** Zero payments means zero average, not a division by zero. */
  const averagePayment = premium?.revenue.successfulPayments
    ? premium.revenue.successfulRevenueNaira / premium.revenue.successfulPayments
    : 0;

  const dailyRows = (premium?.daily ?? []) as PremiumDailyRow[];

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
      header: "Revocations",
      numeric: true,
      cell: (row) => formatInteger(row.revocations),
    },
  ];

  return (
    <div className="sb-enter space-y-6 pb-2">
      <PageHeader
        title="Premium analytics"
        description="Revenue, entitlement operations, and subscription health over the last 30 days."
        meta={
          premium ? (
            <>
              <Badge tone="neutral">
                {premium.dataSource === "ROLLUP"
                  ? "From nightly rollups"
                  : "Live from the database"}
              </Badge>
              <Badge tone="neutral">
                Generated {formatDateTime(premium.generatedAt)}
              </Badge>
            </>
          ) : null
        }
      />

      {premiumQuery.isError ? (
        <ErrorState
          title="Could not load premium analytics"
          error={premiumQuery.error}
          fallback="Check that the backend is running and this account has superadmin access."
          onRetry={() => premiumQuery.refetch()}
        />
      ) : null}

      {premiumQuery.isLoading ? (
        <StatGrid>
          {Array.from({ length: 4 }).map((_, index) => (
            <StatCardSkeleton key={index} />
          ))}
        </StatGrid>
      ) : premium ? (
        <>
          {/* ── Headline ────────────────────────────────────── */}
          <StatGrid>
            <StatCard
              label="Revenue (30d)"
              value={formatCurrencyNaira(premium.revenue.successfulRevenueNaira)}
              hint={`${formatInteger(
                premium.revenue.successfulPayments,
              )} successful payments`}
            />
            <StatCard
              label="Active premium"
              value={formatInteger(premium.current.activePremiumUsers)}
              hint={`${formatInteger(
                premium.current.activePaidSubscriptions,
              )} of them are paid subscriptions`}
            />
            <StatCard
              label="Expiring in 7 days"
              value={formatInteger(premium.current.expiringIn7Days)}
              hint={`${formatInteger(
                premium.current.expiringIn30Days,
              )} expire within 30 days`}
              status={premium.current.expiringIn7Days ? "warning" : undefined}
            />
            <StatCard
              label="Manual grants"
              value={formatInteger(premium.adminActions.manualGrants)}
              hint={`${formatInteger(
                premium.adminActions.revocations,
              )} were revoked`}
            />
          </StatGrid>

          {/* ── Revenue detail ──────────────────────────────── */}
          <section className="space-y-3">
            <SectionTitle
              title="Payments"
              description="How the money arrived, and whether it can be charged again."
            />
            <StatGrid>
              <StatCard
                label="Average payment"
                value={formatCurrencyNaira(averagePayment)}
                hint="Revenue divided by successful payments"
              />
              <StatCard
                label="Reusable authorizations"
                value={formatInteger(premium.revenue.reusableAuthorizations)}
                hint="Cards that can be charged again"
              />
              <StatCard
                label="Auto-renew enabled"
                value={formatInteger(
                  premium.current.autoRenewEnabledSubscriptions,
                )}
                hint="Subscriptions set to renew themselves"
              />
              <StatCard
                label="Admin entitlements"
                value={formatInteger(premium.current.activeAdminEntitlements)}
                hint="Active access nobody paid for"
              />
            </StatGrid>
          </section>

          {/* ── Why admins granted premium ──────────────────── */}
          <section className="space-y-3">
            <SectionTitle
              title="Grants by reason"
              description="Why premium was given out by hand in the last 30 days."
            />
            <StatGrid className="lg:grid-cols-3">
              <StatCard
                label="Promotional"
                value={formatInteger(premium.adminActions.promotionalGrants)}
                hint="Marketing and campaigns"
              />
              <StatCard
                label="Corrective"
                value={formatInteger(premium.adminActions.correctiveGrants)}
                hint="Fixing something that went wrong"
              />
              <StatCard
                label="Revocations"
                value={formatInteger(premium.adminActions.revocations)}
                hint="Access taken back"
              />
            </StatGrid>
          </section>
        </>
      ) : null}

      {/* ── Daily trail ───────────────────────────────────── */}
      <section className="space-y-3">
        <SectionTitle
          title="Day by day"
          description="Every day in the window, newest last."
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
          emptyTitle="No premium activity"
          emptyDescription="Nothing was paid, granted, or revoked in the last 30 days."
        />
      </section>
    </div>
  );
}
