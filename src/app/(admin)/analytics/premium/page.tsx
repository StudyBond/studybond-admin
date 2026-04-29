"use client";

import { ApiErrorMessage } from "@/components/ui/api-error-message";
import { MetricCard } from "@/components/ui/metric-card";
import { SectionHeading } from "@/components/ui/section-heading";
import { StatusBadge } from "@/components/ui/status-badge";
import { Surface } from "@/components/ui/surface";
import { useAdminSession } from "@/features/admin-auth/hooks/use-admin-session";
import { useAdminPremiumInsights } from "@/features/analytics/hooks/use-admin-premium-insights";
import {
  formatCompactNumber,
  formatCurrencyNaira,
  formatDateTime,
  formatInteger,
} from "@/lib/utils/format";
import { BarChart3, CreditCard, ReceiptText, Sparkles } from "lucide-react";

export default function PremiumAnalyticsPage() {
  const sessionQuery = useAdminSession();
  const isSuperadmin = sessionQuery.data?.user?.role === "SUPERADMIN";
  const premiumQuery = useAdminPremiumInsights(30, isSuperadmin);
  const premium = premiumQuery.data;

  if (sessionQuery.isLoading) {
    return (
      <section className="space-y-6">
        <SectionHeading
          eyebrow="Analytics"
          title="Premium analytics"
          description="Loading premium insights..."
        />
        <Surface className="p-6">
          <p className="text-sm text-[color:var(--muted-foreground)]">Checking access rights...</p>
        </Surface>
      </section>
    );
  }

  if (!isSuperadmin) {
    return (
      <section className="space-y-6">
        <SectionHeading
          eyebrow="Analytics"
          title="Premium analytics"
          description="Detailed premium acquisition, revenue, and retention signals."
        />
        <Surface glow="amber" className="p-6">
          <div className="flex items-start gap-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[color:var(--accent-amber)]/20 bg-[color:var(--accent-amber)]/10 text-[color:var(--accent-amber)]">
              <Sparkles className="h-5 w-5" />
            </span>
            <div>
              <p className="text-base font-semibold text-white">Superadmin access required</p>
              <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">
                Premium revenue and entitlement analytics are restricted to superadmins.
              </p>
            </div>
          </div>
        </Surface>
      </section>
    );
  }

  const metrics = premium
    ? [
        {
          label: "Revenue (30d)",
          value: formatCurrencyNaira(premium.revenue.successfulRevenueNaira),
          delta: `${formatInteger(premium.revenue.successfulPayments)} successful payments`,
          tone: "emerald" as const,
        },
        {
          label: "Active premium",
          value: formatCompactNumber(premium.current.activePremiumUsers),
          delta: `${formatInteger(premium.current.activePaidSubscriptions)} paid subscriptions`,
          tone: "cyan" as const,
        },
        {
          label: "Expiring (7d)",
          value: formatInteger(premium.current.expiringIn7Days),
          delta: `${formatInteger(premium.current.expiringIn30Days)} within 30 days`,
          tone: "amber" as const,
        },
        {
          label: "Manual grants",
          value: formatInteger(premium.adminActions.manualGrants),
          delta: `${formatInteger(premium.adminActions.revocations)} revocations`,
          tone: "rose" as const,
        },
      ]
    : [];

  return (
    <section className="space-y-6">
      <SectionHeading
        eyebrow="Analytics"
        title="Premium analytics"
        description="Revenue, entitlement operations, and subscription health over the last 30 days."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge tone={premium?.dataSource === "ROLLUP" ? "cyan" : "emerald"}>
              {premium?.dataSource ?? "live"}
            </StatusBadge>
            <StatusBadge tone="slate">
              generated {premium?.generatedAt ? formatDateTime(premium.generatedAt) : "now"}
            </StatusBadge>
          </div>
        }
      />

      {premiumQuery.isError ? (
        <Surface glow="rose" className="p-6">
          <p className="text-base font-semibold text-white">Could not load premium analytics.</p>
          <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">
            <ApiErrorMessage
              error={premiumQuery.error}
              fallback="Check that the backend is running and this account has superadmin access."
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

      <div className="grid gap-6 xl:grid-cols-[0.94fr_1.06fr]">
        <div className="grid gap-6">
          <Surface glow="cyan" className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[color:var(--accent-cyan)]">
                  Revenue
                </p>
                <h2 className="mt-2 text-xl font-semibold text-white">Payment health</h2>
              </div>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-[color:var(--accent-cyan)]">
                <CreditCard className="h-4 w-4" />
              </span>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-white/8 bg-black/10 p-4">
                <p className="text-xs text-[color:var(--muted-foreground)]">Reusable authorizations</p>
                <p className="mt-2 text-2xl font-semibold text-white">
                  {formatInteger(premium?.revenue.reusableAuthorizations ?? 0)}
                </p>
              </div>
              <div className="rounded-xl border border-white/8 bg-black/10 p-4">
                <p className="text-xs text-[color:var(--muted-foreground)]">Average revenue per payment</p>
                <p className="mt-2 text-2xl font-semibold text-white">
                  {premium?.revenue.successfulPayments
                    ? formatCurrencyNaira(
                        premium.revenue.successfulRevenueNaira / premium.revenue.successfulPayments,
                      )
                    : formatCurrencyNaira(0)}
                </p>
              </div>
            </div>
          </Surface>

          <Surface className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[color:var(--accent-amber)]">
                  Operations
                </p>
                <h2 className="mt-2 text-xl font-semibold text-white">Admin-driven changes</h2>
              </div>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-[color:var(--accent-amber)]">
                <ReceiptText className="h-4 w-4" />
              </span>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-white/8 bg-black/10 p-4">
                <p className="text-xs text-[color:var(--muted-foreground)]">Promotional grants</p>
                <p className="mt-2 text-2xl font-semibold text-white">
                  {formatInteger(premium?.adminActions.promotionalGrants ?? 0)}
                </p>
              </div>
              <div className="rounded-xl border border-white/8 bg-black/10 p-4">
                <p className="text-xs text-[color:var(--muted-foreground)]">Corrective grants</p>
                <p className="mt-2 text-2xl font-semibold text-white">
                  {formatInteger(premium?.adminActions.correctiveGrants ?? 0)}
                </p>
              </div>
              <div className="rounded-xl border border-white/8 bg-black/10 p-4">
                <p className="text-xs text-[color:var(--muted-foreground)]">Admin entitlements</p>
                <p className="mt-2 text-2xl font-semibold text-white">
                  {formatInteger(premium?.current.activeAdminEntitlements ?? 0)}
                </p>
              </div>
              <div className="rounded-xl border border-white/8 bg-black/10 p-4">
                <p className="text-xs text-[color:var(--muted-foreground)]">Auto-renew enabled</p>
                <p className="mt-2 text-2xl font-semibold text-white">
                  {formatInteger(premium?.current.autoRenewEnabledSubscriptions ?? 0)}
                </p>
              </div>
            </div>
          </Surface>
        </div>

        <Surface glow="emerald" className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[color:var(--accent-emerald)]">
                Trend
              </p>
              <h2 className="mt-2 text-xl font-semibold text-white">Daily payment trail</h2>
            </div>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-[color:var(--accent-emerald)]">
              <BarChart3 className="h-4 w-4" />
            </span>
          </div>

          <div className="mt-5 overflow-x-auto rounded-xl border border-white/8">
            <table className="min-w-[640px] w-full divide-y divide-white/8 text-sm">
              <thead className="bg-black/15 text-left text-[11px] uppercase tracking-[0.16em] text-[color:var(--muted-foreground)]">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Payments</th>
                  <th className="px-4 py-3">Revenue</th>
                  <th className="px-4 py-3">Grants</th>
                  <th className="px-4 py-3">Revocations</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/8 bg-black/10">
                {(premium?.daily ?? []).map((row) => (
                  <tr key={row.date} className="transition hover:bg-white/[0.03]">
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
