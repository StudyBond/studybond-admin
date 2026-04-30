"use client";

import Link from "next/link";
import { MetricCard } from "@/components/ui/metric-card";
import { SectionHeading } from "@/components/ui/section-heading";
import { StatusBadge } from "@/components/ui/status-badge";
import { Surface } from "@/components/ui/surface";
import { useAdminSession } from "@/features/admin-auth/hooks/use-admin-session";
import { useAdminStepUp } from "@/features/admin-auth/hooks/use-admin-step-up";
import { usePremiumHistory } from "@/features/premium/hooks/use-premium-history";
import { usePremiumInsights } from "@/features/premium/hooks/use-premium-insights";
import { usePremiumUsers } from "@/features/premium/hooks/use-premium-users";
import { useAdminUsers } from "@/features/users/hooks/use-admin-users";
import { PremiumActionPanel } from "@/features/premium/components/premium-action-panel";
import { useDebouncedValue } from "@/lib/utils/use-debounced-value";
import {
  formatCompactNumber,
  formatCurrencyNaira,
  formatDateTime,
  formatInteger,
} from "@/lib/utils/format";
import { ArrowRight, Crown, Sparkles, UserRoundSearch, Users } from "lucide-react";
import { useMemo, useState } from "react";

type SearchMode = "premium" | "all";

export default function PremiumPage() {
  const { data: session, isLoading: isSessionLoading } = useAdminSession();
  const { isActive: isStepUpActive, stepUp } = useAdminStepUp();
  const [searchMode, setSearchMode] = useState<SearchMode>("premium");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [page, setPage] = useState(1);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

  const isSuperadmin = session?.user?.role === "SUPERADMIN";

  const premiumUsersQuery = usePremiumUsers({ page, limit: 24 }, isSuperadmin && searchMode === "premium");
  const allUsersQuery = useAdminUsers(
    { page, limit: 24, search: debouncedSearch || undefined },
  );
  
  const premiumInsightsQuery = usePremiumInsights(30, isSuperadmin);

  const displayedUsers = useMemo(() => {
    if (searchMode === "all") {
      return allUsersQuery.data?.users ?? [];
    }

    const rows = premiumUsersQuery.data?.users ?? [];
    if (!search.trim()) {
      return rows;
    }

    const term = search.trim().toLowerCase();
    return rows.filter((user: any) => {
      return (
        user.fullName.toLowerCase().includes(term) ||
        user.email.toLowerCase().includes(term) ||
        String(user.id).includes(term)
      );
    });
  }, [searchMode, allUsersQuery.data?.users, premiumUsersQuery.data?.users, search]);

  const resolvedSelectedUserId = useMemo(() => {
    if (selectedUserId && displayedUsers.some((user) => user.id === selectedUserId)) {
      return selectedUserId;
    }

    return displayedUsers[0]?.id ?? null;
  }, [displayedUsers, selectedUserId]);

  const premiumHistoryQuery = usePremiumHistory(resolvedSelectedUserId ?? undefined);

  if (isSessionLoading) {
    return (
      <section className="space-y-6">
        <SectionHeading
          eyebrow="Premium"
          title="Premium management"
          description="Loading session..."
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
          eyebrow="Premium"
          title="Premium management"
          description="Manage subscriptions, entitlements, and premium access."
        />
        <Surface glow="amber" className="p-6">
          <div className="flex items-start gap-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[color:var(--accent-amber)]/20 bg-[color:var(--accent-amber)]/10 text-[color:var(--accent-amber)]">
              <Crown className="h-5 w-5" />
            </span>
            <div>
              <p className="text-base font-semibold text-white">Superadmin access required</p>
              <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">
                Premium management requires superadmin privileges and step-up verification to protect entitlement integrity.
              </p>
            </div>
          </div>
        </Surface>
      </section>
    );
  }

  const selectedUser = displayedUsers.find((user) => user.id === resolvedSelectedUserId) ?? null;
  const insights = premiumInsightsQuery.data;
  const history = premiumHistoryQuery.data;
  const pagination = searchMode === "premium" ? premiumUsersQuery.data?.pagination : allUsersQuery.data?.pagination;
  const isLoadingUsers = searchMode === "premium" ? premiumUsersQuery.isLoading : allUsersQuery.isLoading;

  return (
    <section className="space-y-6">
      <SectionHeading
        eyebrow="Premium"
        title="Premium management"
        description="View subscriptions, grant or revoke entitlements, and monitor premium health."
        action={
          <Link
            href="/step-up?next=/premium&intent=Premium%20access%20change"
            className="inline-flex items-center gap-2 rounded-xl border border-white/8 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-white transition hover:border-white/14 hover:bg-white/[0.06]"
          >
            Step-up verification
            <ArrowRight className="h-4 w-4" />
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Premium users"
          value={formatCompactNumber(
            insights?.current.activePremiumUsers ?? (searchMode === "premium" && premiumUsersQuery.data?.pagination.total) ? premiumUsersQuery.data?.pagination.total! : 0,
          )}
          delta="Active premium accounts"
          tone="emerald"
        />
        <MetricCard
          label="Paid subscriptions"
          value={formatCompactNumber(insights?.current.activePaidSubscriptions ?? 0)}
          delta="Current paid coverage"
          tone="cyan"
        />
        <MetricCard
          label="Manual grants (30d)"
          value={formatCompactNumber(insights?.adminActions.manualGrants ?? 0)}
          delta="Admin-issued entitlements"
          tone="amber"
        />
        <MetricCard
          label="Revenue (30d)"
          value={formatCurrencyNaira(insights?.revenue.successfulRevenueNaira ?? 0)}
          delta="Verified payments"
          tone="rose"
        />
      </div>

      <div className="grid gap-6 2xl:grid-cols-[1.2fr_0.8fr]">
        <div className="grid gap-6">
          <Surface className="p-6">
            <div className="flex items-center justify-between gap-4">
              <StatusBadge tone={isStepUpActive ? "emerald" : "amber"}>
                {isStepUpActive ? "Step-up active" : "Step-up required"}
              </StatusBadge>
              {isStepUpActive && stepUp ? (
                <p className="text-sm text-[color:var(--muted-foreground)]">
                  Active until {formatDateTime(stepUp.expiresAt)}
                </p>
              ) : null}
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-white/8 bg-black/10 p-4">
                <p className="text-xs font-medium text-[color:var(--muted-foreground)]">Admin entitlements</p>
                <p className="mt-2 text-2xl font-semibold text-white">
                  {insights?.current.activeAdminEntitlements ?? 0}
                </p>
              </div>
              <div className="rounded-xl border border-white/8 bg-black/10 p-4">
                <p className="text-xs font-medium text-[color:var(--muted-foreground)]">Auto-renew enabled</p>
                <p className="mt-2 text-2xl font-semibold text-white">
                  {insights?.current.autoRenewEnabledSubscriptions ?? 0}
                </p>
              </div>
              <div className="rounded-xl border border-white/8 bg-black/10 p-4">
                <p className="text-xs font-medium text-[color:var(--muted-foreground)]">Expiring (7d)</p>
                <p className="mt-2 text-2xl font-semibold text-white">
                  {insights?.current.expiringIn7Days ?? 0}
                </p>
              </div>
            </div>
            {!isStepUpActive ? (
              <Link
                href="/step-up?next=/premium&intent=Premium%20access%20change"
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-[color:var(--background)] transition hover:opacity-90"
              >
                Complete step-up verification
                <Sparkles className="h-4 w-4" />
              </Link>
            ) : null}
          </Surface>

          <Surface className="p-6">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex rounded-lg border border-white/8 bg-black/10 p-1">
                <button
                  type="button"
                  onClick={() => {
                    setSearchMode("premium");
                    setPage(1);
                  }}
                  className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition ${
                    searchMode === "premium"
                      ? "bg-white text-[color:var(--background)] shadow-sm"
                      : "text-[color:var(--muted-foreground)] hover:text-white"
                  }`}
                >
                  <Crown className="h-4 w-4" />
                  Premium users
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSearchMode("all");
                    setPage(1);
                  }}
                  className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition ${
                    searchMode === "all"
                      ? "bg-white text-[color:var(--background)] shadow-sm"
                      : "text-[color:var(--muted-foreground)] hover:text-white"
                  }`}
                >
                  <Users className="h-4 w-4" />
                  Search all
                </button>
              </div>
              <div className="flex w-full items-center gap-3 rounded-xl border border-white/8 bg-black/10 px-4 py-2.5 sm:w-auto">
                <UserRoundSearch className="h-4 w-4 text-[color:var(--muted-foreground)]" />
                <input
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setPage(1);
                  }}
                  placeholder={searchMode === "all" ? "Search by name or email..." : "Search current page..."}
                  className="w-full min-w-0 bg-transparent text-sm text-white outline-none placeholder:text-[color:var(--muted-foreground)]/60 sm:w-56"
                />
              </div>
            </div>

            <div className="mt-5 grid gap-2.5">
              {isLoadingUsers ? (
                <p className="text-sm text-[color:var(--muted-foreground)]">Loading users...</p>
              ) : displayedUsers.length ? (
                displayedUsers.map((user) => {
                  const selected = user.id === resolvedSelectedUserId;
                  return (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => setSelectedUserId(user.id)}
                      className={`rounded-xl border p-4 text-left transition ${
                        selected
                          ? "border-[color:var(--accent-cyan)]/30 bg-[color:var(--accent-cyan)]/8"
                          : "border-white/8 bg-black/10 hover:border-white/14 hover:bg-white/[0.03]"
                      }`}
                    >
                      <div className="flex flex-wrap items-center gap-3">
                        <p className="text-sm font-semibold text-white">{user.fullName}</p>
                        <StatusBadge tone={user.isPremium ? "emerald" : "slate"}>
                          {user.isPremium ? "Premium" : "Free"}
                        </StatusBadge>
                      </div>
                      <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">{user.email}</p>
                      <div className="mt-3 flex flex-wrap gap-4 text-xs text-[color:var(--muted-foreground)]">
                        <span>Joined {formatDateTime(user.createdAt)}</span>
                        {user.isPremium && (
                          <span>
                            Ends{" "}
                            {("subscriptionEndDate" in user && user.subscriptionEndDate)
                              ? formatDateTime(user.subscriptionEndDate as any)
                              : "Manual only"}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })
              ) : (
                <p className="text-sm text-[color:var(--muted-foreground)]">No users matched this search.</p>
              )}
            </div>

            {pagination && pagination.totalPages > 1 ? (
              <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-[color:var(--muted-foreground)]">
                  Page {pagination.page} of {pagination.totalPages}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/8 px-3 py-2 text-sm text-[color:var(--muted-foreground)] transition hover:border-white/14 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ArrowRight className="h-4 w-4 rotate-180" />
                    Previous
                  </button>
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                    disabled={page >= pagination.totalPages}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/8 px-3 py-2 text-sm text-[color:var(--muted-foreground)] transition hover:border-white/14 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Next
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ) : null}
          </Surface>
        </div>

        <div className="grid gap-6 auto-rows-max">
          <Surface glow="emerald" className="p-6">
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[color:var(--accent-cyan)]">Selected user</p>
            {selectedUser && history ? (
              <>
                <div className="mt-3 flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-semibold text-white">{selectedUser.fullName}</h3>
                    <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">{selectedUser.email}</p>
                  </div>
                  <StatusBadge tone={history.currentAccess.isPremium ? "emerald" : "slate"}>
                    {history.currentAccess.isPremium ? "Active" : "Inactive"}
                  </StatusBadge>
                </div>
                
                {history.currentAccess.isPremium && (
                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-white/8 bg-black/10 p-4">
                      <p className="text-xs font-medium text-[color:var(--muted-foreground)]">Coverage end date</p>
                      <p className="mt-2 text-sm font-semibold text-white">
                        {history.currentAccess.effectiveEndDate
                          ? formatDateTime(history.currentAccess.effectiveEndDate)
                          : "No end date"}
                      </p>
                    </div>
                    <div className="rounded-xl border border-white/8 bg-black/10 p-4">
                      <p className="text-xs font-medium text-[color:var(--muted-foreground)]">Access source</p>
                      <p className="mt-2 text-sm font-semibold text-white">
                        {history.currentAccess.activeSourceTypes.join(", ") || "None"}
                      </p>
                    </div>
                  </div>
                )}

                <div className="mt-5 flex flex-wrap gap-2">
                  <Link
                    href={`/users/${selectedUser.id}`}
                    className="inline-flex items-center gap-2 rounded-lg border border-white/8 bg-black/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white transition hover:border-white/14 hover:bg-white/[0.03]"
                  >
                    User 360
                  </Link>
                  <Link
                    href={`/users/${selectedUser.id}/premium`}
                    className="inline-flex items-center gap-2 rounded-lg border border-white/8 bg-black/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white transition hover:border-white/14 hover:bg-white/[0.03]"
                  >
                    Premium history
                  </Link>
                </div>

                {history.entitlements.length > 0 && (
                  <div className="mt-5">
                    <p className="text-xs font-medium text-[color:var(--muted-foreground)]">Entitlement history</p>
                    <div className="mt-3 space-y-2.5">
                      {history.entitlements.slice(0, 3).map((entry) => (
                        <div
                          key={entry.id}
                          className="rounded-xl border border-white/8 bg-black/10 p-3"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-medium text-white">{entry.kind}</p>
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
                          </div>
                          <p className="mt-1 text-xs text-[color:var(--muted-foreground)]">
                            {formatDateTime(entry.startsAt)} → {formatDateTime(entry.endsAt)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : premiumHistoryQuery.isLoading ? (
              <p className="mt-4 text-sm text-[color:var(--muted-foreground)]">Loading user details...</p>
            ) : (
              <p className="mt-4 text-sm text-[color:var(--muted-foreground)]">Select a user to view their premium details.</p>
            )}
          </Surface>

          {selectedUser && (
            <PremiumActionPanel
              userId={selectedUser.id}
              userName={selectedUser.fullName}
              isPremium={history?.currentAccess?.isPremium ?? selectedUser.isPremium}
              isStepUpActive={isStepUpActive}
              stepUpToken={stepUp?.stepUpToken}
              stepUpRedirectUrl="/premium"
            />
          )}

          <Surface className="p-6">
            <p className="text-xs font-medium text-[color:var(--muted-foreground)]">30-day summary</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-white/8 bg-black/10 p-4">
                <p className="text-xs text-[color:var(--muted-foreground)]">Payments</p>
                <p className="mt-2 text-2xl font-semibold text-white">
                  {formatInteger(insights?.revenue.successfulPayments ?? 0)}
                </p>
              </div>
              <div className="rounded-xl border border-white/8 bg-black/10 p-4">
                <p className="text-xs text-[color:var(--muted-foreground)]">Revocations</p>
                <p className="mt-2 text-2xl font-semibold text-white">
                  {formatInteger(insights?.adminActions.revocations ?? 0)}
                </p>
              </div>
            </div>
          </Surface>
        </div>
      </div>
    </section>
  );
}
