"use client";

import Link from "next/link";
import { ApiErrorMessage } from "@/components/ui/api-error-message";
import { MetricCard } from "@/components/ui/metric-card";
import { SectionHeading } from "@/components/ui/section-heading";
import { StatusBadge } from "@/components/ui/status-badge";
import { Surface } from "@/components/ui/surface";
import { PremiumActionPanel } from "@/features/premium/components/premium-action-panel";
import { useAdminSession } from "@/features/admin-auth/hooks/use-admin-session";
import { useAdminStepUp } from "@/features/admin-auth/hooks/use-admin-step-up";
import { usePremiumHistory } from "@/features/premium/hooks/use-premium-history";
import {
  formatCurrencyNaira,
  formatDateTime,
  formatInteger,
} from "@/lib/utils/format";
import { useParams } from "next/navigation";
import { ArrowLeft, Crown, Sparkles } from "lucide-react";

export default function UserPremiumPage() {
  const params = useParams<{ id: string }>();
  const userId = Number.parseInt(params.id, 10);
  const sessionQuery = useAdminSession();
  const isSuperadmin = sessionQuery.data?.user?.role === "SUPERADMIN";
  const { isActive: isStepUpActive, stepUp } = useAdminStepUp();
  const historyQuery = usePremiumHistory(isSuperadmin ? userId : undefined);
  const history = historyQuery.data;

  if (sessionQuery.isLoading) {
    return (
      <section className="space-y-6">
        <SectionHeading
          eyebrow="Premium"
          title="User premium history"
          description="Loading premium coverage..."
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
          eyebrow="Premium"
          title="User premium history"
          description="Premium coverage, entitlements, and subscription lineage for a single user."
        />
        <Surface glow="amber" className="p-6">
          <div className="flex items-start gap-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[color:var(--accent-amber)]/20 bg-[color:var(--accent-amber)]/10 text-[color:var(--accent-amber)]">
              <Crown className="h-5 w-5" />
            </span>
            <div>
              <p className="text-base font-semibold text-white">Superadmin access required</p>
              <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">
                Per-user premium history is restricted to superadmins because it contains payment and entitlement records.
              </p>
            </div>
          </div>
        </Surface>
      </section>
    );
  }

  const metrics: Array<{
    label: string;
    value: string;
    delta: string;
    tone: "amber" | "cyan" | "emerald" | "rose";
  }> = history
    ? [
        {
          label: "Current access",
          value: history.currentAccess.isPremium ? "Active" : "Inactive",
          delta: history.currentAccess.effectiveEndDate
            ? `Ends ${formatDateTime(history.currentAccess.effectiveEndDate)}`
            : "No scheduled end date",
          tone: history.currentAccess.isPremium ? "emerald" : "rose",
        },
        {
          label: "Access sources",
          value: formatInteger(history.currentAccess.activeSourceTypes.length),
          delta: history.currentAccess.activeSourceTypes.join(", ") || "No active premium source",
          tone: "cyan" as const,
        },
        {
          label: "Entitlements",
          value: formatInteger(history.entitlements.length),
          delta: history.subscription ? history.subscription.status : "No paid subscription",
          tone: "amber" as const,
        },
        {
          label: "Auto-renew",
          value: history.subscription?.autoRenew ? "On" : "Off",
          delta: history.subscription?.provider ?? "Manual only",
          tone: "rose" as const,
        },
      ]
    : [];

  return (
    <section className="space-y-6">
      <SectionHeading
        eyebrow="Premium"
        title={history ? `${history.user.fullName} premium history` : "User premium history"}
        description="Inspect subscription status, manual grants, and the current premium coverage state for a specific user."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/users/${userId}`}
              className="inline-flex items-center gap-2 rounded-xl border border-white/8 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-white transition hover:border-white/14 hover:bg-white/[0.06]"
            >
              <ArrowLeft className="h-4 w-4" />
              User 360
            </Link>
            <Link
              href="/premium"
              className="inline-flex items-center gap-2 rounded-xl border border-white/8 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-white transition hover:border-white/14 hover:bg-white/[0.06]"
            >
              <Sparkles className="h-4 w-4" />
              Premium console
            </Link>
          </div>
        }
      />

      {historyQuery.isLoading ? (
        <Surface className="p-6">
          <p className="text-sm text-[color:var(--muted-foreground)]">Loading user premium history...</p>
        </Surface>
      ) : null}

      {historyQuery.isError ? (
        <Surface glow="rose" className="p-6">
          <p className="text-base font-semibold text-white">Could not load premium history.</p>
          <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">
            <ApiErrorMessage error={historyQuery.error} fallback="Please try again." />
          </p>
        </Surface>
      ) : null}

      {history ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {metrics.map((metric, index) => (
              <MetricCard
                key={metric.label}
                {...metric}
                className="admin-enter"
                style={{ animationDelay: `${index * 80}ms` }}
              />
            ))}
          </div>

          <PremiumActionPanel
            userId={userId}
            userName={history.user.fullName}
            isPremium={history.currentAccess.isPremium}
            isStepUpActive={isStepUpActive}
            stepUpToken={stepUp?.stepUpToken}
            stepUpRedirectUrl={`/users/${userId}/premium`}
          />

          <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
            <div className="grid gap-6">
              <Surface glow="emerald" className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[color:var(--accent-emerald)]">
                      User
                    </p>
                    <h2 className="mt-2 text-xl font-semibold text-white">{history.user.fullName}</h2>
                    <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">{history.user.email}</p>
                  </div>
                  <StatusBadge tone={history.user.isPremium ? "emerald" : "slate"}>
                    {history.user.isPremium ? "Premium" : "Free"}
                  </StatusBadge>
                </div>

                <div className="mt-5 rounded-xl border border-white/8 bg-black/10 p-4">
                  <p className="text-xs text-[color:var(--muted-foreground)]">Coverage sources</p>
                  <p className="mt-2 text-sm font-semibold text-white">
                    {history.currentAccess.activeSourceTypes.join(", ") || "No active access"}
                  </p>
                  <p className="mt-1 text-xs text-[color:var(--muted-foreground)]">
                    {history.currentAccess.effectiveEndDate
                      ? `Effective end date ${formatDateTime(history.currentAccess.effectiveEndDate)}`
                      : "No effective end date recorded"}
                  </p>
                </div>
              </Surface>

              <Surface className="p-6">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[color:var(--accent-cyan)]">
                    Subscription
                  </p>
                  <h2 className="mt-2 text-xl font-semibold text-white">Paid coverage</h2>
                </div>

                {history.subscription ? (
                  <div className="mt-5 space-y-3">
                    <div className="rounded-xl border border-white/8 bg-black/10 p-4">
                      <p className="text-xs text-[color:var(--muted-foreground)]">Plan</p>
                      <p className="mt-2 text-sm font-semibold text-white">
                        {history.subscription.provider} · {history.subscription.planType}
                      </p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl border border-white/8 bg-black/10 p-4">
                        <p className="text-xs text-[color:var(--muted-foreground)]">Window</p>
                        <p className="mt-2 text-sm font-semibold text-white">
                          {formatDateTime(history.subscription.startDate)}
                        </p>
                        <p className="mt-1 text-xs text-[color:var(--muted-foreground)]">
                          to {formatDateTime(history.subscription.endDate)}
                        </p>
                      </div>
                      <div className="rounded-xl border border-white/8 bg-black/10 p-4">
                        <p className="text-xs text-[color:var(--muted-foreground)]">Payment reference</p>
                        <p className="mt-2 break-all text-sm font-semibold text-white">
                          {history.subscription.paymentReference ?? "Unavailable"}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-5 rounded-xl border border-white/8 bg-black/10 p-4 text-sm text-[color:var(--muted-foreground)]">
                    No active paid subscription was found for this user. Their access may come from admin entitlements only.
                  </div>
                )}
              </Surface>
            </div>

            <Surface glow="amber" className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[color:var(--accent-amber)]">
                    Entitlements
                  </p>
                  <h2 className="mt-2 text-xl font-semibold text-white">Manual history</h2>
                </div>
                <StatusBadge tone="amber">{history.entitlements.length}</StatusBadge>
              </div>

              {history.entitlements.length ? (
                <div className="mt-5 space-y-3">
                  {history.entitlements.map((entry: any) => (
                    <div key={entry.id} className="rounded-xl border border-white/8 bg-black/10 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusBadge
                            tone={
                              entry.status === "ACTIVE"
                                ? "emerald"
                                : entry.status === "REVOKED"
                                  ? "rose"
                                  : "slate"
                            }
                          >
                            {entry.status}
                          </StatusBadge>
                          <StatusBadge tone="slate">{entry.kind}</StatusBadge>
                        </div>
                        <p className="text-xs text-[color:var(--muted-foreground)]">
                          {formatDateTime(entry.createdAt)}
                        </p>
                      </div>

                      <p className="mt-3 text-sm text-white">{entry.note}</p>
                      <p className="mt-2 text-xs text-[color:var(--muted-foreground)]">
                        {formatDateTime(entry.startsAt)} to {formatDateTime(entry.endsAt)}
                      </p>

                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-lg border border-white/8 bg-black/15 px-3 py-2">
                          <p className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--muted-foreground)]">
                            Granted by
                          </p>
                          <p className="mt-1 text-sm font-medium text-white">
                            {entry.grantedByAdmin.fullName}
                          </p>
                          <p className="text-xs text-[color:var(--muted-foreground)]">
                            {entry.grantedByAdmin.email}
                          </p>
                        </div>
                        <div className="rounded-lg border border-white/8 bg-black/15 px-3 py-2">
                          <p className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--muted-foreground)]">
                            Revoked by
                          </p>
                          <p className="mt-1 text-sm font-medium text-white">
                            {entry.revokedByAdmin?.fullName ?? "Not revoked"}
                          </p>
                          <p className="text-xs text-[color:var(--muted-foreground)]">
                            {entry.revokedByAdmin?.email ?? "Still active or expired naturally"}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-5 rounded-xl border border-white/8 bg-black/10 p-4 text-sm text-[color:var(--muted-foreground)]">
                  This user has no manual entitlement history.
                </div>
              )}
            </Surface>
          </div>
        </>
      ) : null}
    </section>
  );
}
