"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { SearchField } from "@/components/ui/field";
import { PageHeader, SectionTitle } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard, StatGrid } from "@/components/ui/stat-card";
import { FilterChips, Pagination } from "@/components/ui/toolbar";
import { useAdminSession } from "@/features/admin-auth/hooks/use-admin-session";
import { useAdminStepUp } from "@/features/admin-auth/hooks/use-admin-step-up";
import { PremiumActionPanel } from "@/features/premium/components/premium-action-panel";
import { usePremiumHistory } from "@/features/premium/hooks/use-premium-history";
import { usePremiumInsights } from "@/features/premium/hooks/use-premium-insights";
import { usePremiumUsers } from "@/features/premium/hooks/use-premium-users";
import { useAdminUsers } from "@/features/users/hooks/use-admin-users";
import { cn } from "@/lib/utils/cn";
import {
  formatCurrencyNaira,
  formatDate,
  formatDateTime,
  formatInteger,
} from "@/lib/utils/format";
import { useDebouncedValue } from "@/lib/utils/use-debounced-value";
import { ArrowRight, Crown, ShieldCheck, UserRoundSearch } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

/**
 * Premium management.
 *
 * Two things here were broken rather than merely ugly:
 *
 * 1. Search did not search. `/api/admin/premium-users` takes only page and
 *    limit — it has no search parameter — so the box filtered the 24 rows
 *    already on screen, in the browser. Its own placeholder said "Search
 *    current page...". Looking up a premium user who happened to be on page
 *    three returned nothing, which reads exactly like "this user is not
 *    premium". Typing now switches the query to /api/admin/users, which
 *    does support `search` together with `isPremium`, so the search covers
 *    every account. With the box empty it stays on the premium endpoint,
 *    which is still worth having: it sorts by expiry and carries
 *    subscriptionEndDate.
 *
 * 2. The "Premium users" figure was wrong whenever it mattered. It read:
 *
 *      insights?.current.activePremiumUsers ?? (mode === "premium" && total)
 *        ? total : 0
 *
 *    `??` binds tighter than `?:`, so the whole left side was the condition
 *    and the card rendered `total` — the row count of the current page
 *    query — any time activePremiumUsers was non-zero. The card showed the
 *    pagination total labelled as the premium user count.
 *
 * The layout also split at 2xl (1536px), so on any normal laptop the action
 * panel rendered below a 24-row list. It splits at xl now, the panel is
 * sticky, and below xl a row opens that user's premium page instead.
 *
 * Nine figures were previously spread across three different box styles —
 * MetricCard, then a hand-rolled 3-up grid, then another 2-up grid. They
 * are now two labelled rows of StatCard: what is true now, and what
 * happened in the last 30 days.
 */

const PAGE_SIZE = 24;

const MODE_OPTIONS = [
  { label: "Premium only", value: "premium" },
  { label: "Everyone", value: "all" },
];

/** The two endpoints return different shapes; the list only needs these. */
type PremiumRow = {
  id: number;
  fullName: string;
  email: string;
  isPremium: boolean;
  createdAt: string;
  subscriptionEndDate?: string | null;
};

export default function PremiumPage() {
  const { data: session, isLoading: isSessionLoading } = useAdminSession();
  const { isActive: isStepUpActive, stepUp } = useAdminStepUp();

  const [searchMode, setSearchMode] = useState("premium");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

  const debouncedSearch = useDebouncedValue(search.trim(), 350);
  const isSuperadmin = session?.user?.role === "SUPERADMIN";

  /**
   * With no search term, the premium endpoint gives a better default list
   * (ordered by expiry, and it carries the subscription end date). As soon
   * as there is a term we have to move to /api/admin/users, because that is
   * the only one of the two that can search.
   */
  const isSearching = Boolean(debouncedSearch);
  const usePremiumEndpoint = searchMode === "premium" && !isSearching;

  const premiumUsersQuery = usePremiumUsers(
    { page, limit: PAGE_SIZE },
    isSuperadmin && usePremiumEndpoint,
  );

  const directoryQuery = useAdminUsers({
    page,
    limit: PAGE_SIZE,
    search: debouncedSearch || undefined,
    isPremium: searchMode === "premium" ? true : undefined,
  });

  const premiumInsightsQuery = usePremiumInsights(30, isSuperadmin);

  const activeQuery = usePremiumEndpoint ? premiumUsersQuery : directoryQuery;

  const rows = useMemo<PremiumRow[]>(() => {
    if (usePremiumEndpoint) {
      return (premiumUsersQuery.data?.users ?? []) as PremiumRow[];
    }
    return (directoryQuery.data?.users ?? []) as PremiumRow[];
  }, [usePremiumEndpoint, premiumUsersQuery.data, directoryQuery.data]);

  const pagination = usePremiumEndpoint
    ? premiumUsersQuery.data?.pagination
    : directoryQuery.data?.pagination;

  const resolvedSelectedUserId = useMemo(() => {
    if (selectedUserId && rows.some((row) => row.id === selectedUserId)) {
      return selectedUserId;
    }
    return rows[0]?.id ?? null;
  }, [rows, selectedUserId]);

  const selectedUser =
    rows.find((row) => row.id === resolvedSelectedUserId) ?? null;

  const premiumHistoryQuery = usePremiumHistory(
    resolvedSelectedUserId ?? undefined,
  );
  const history = premiumHistoryQuery.data;
  const insights = premiumInsightsQuery.data;

  if (isSessionLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Premium" description="Checking your access…" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  /* Not a permissions error — this admin simply is not a superadmin. It is
     stated as a fact about the role, not drawn as a failure. */
  if (!isSuperadmin) {
    return (
      <div className="sb-enter space-y-6">
        <PageHeader
          title="Premium"
          description="Subscriptions, entitlements, and renewals."
        />
        <div className="rounded-[var(--sb-radius-lg)] border border-[var(--sb-border)] bg-[var(--sb-surface-1)]">
          <EmptyState
            icon={<Crown className="h-4 w-4" />}
            title="Superadmin only"
            description="Granting and revoking premium changes what people have paid for, so it is limited to superadmins with step-up verification. Ask a superadmin to make the change, or to raise your role."
          />
        </div>
      </div>
    );
  }

  return (
    <div className="sb-enter space-y-6 pb-2">
      <PageHeader
        title="Premium"
        description="Who has premium access, how they got it, and what changed in the last 30 days."
        meta={
          <Badge tone={isStepUpActive ? "success" : "warning"} dot>
            {isStepUpActive && stepUp
              ? `Step-up active until ${formatDateTime(stepUp.expiresAt)}`
              : "Step-up needed to make changes"}
          </Badge>
        }
        action={
          !isStepUpActive ? (
            <Button
              asChild
              href="/step-up?next=/premium&intent=Premium%20access%20change"
            >
              <ShieldCheck className="h-4 w-4" />
              Verify to make changes
            </Button>
          ) : null
        }
      />

      {premiumInsightsQuery.isError ? (
        <ErrorState
          title="Could not load premium insights"
          error={premiumInsightsQuery.error}
          onRetry={() => premiumInsightsQuery.refetch()}
        />
      ) : null}

      {/* ── What is true right now ────────────────────────────── */}
      <section className="space-y-3">
        <SectionTitle title="Right now" />
        <StatGrid>
          <StatCard
            label="Premium users"
            value={formatInteger(insights?.current.activePremiumUsers ?? 0)}
            hint="Accounts with active access"
          />
          <StatCard
            label="Paid subscriptions"
            value={formatInteger(insights?.current.activePaidSubscriptions ?? 0)}
            hint={`${formatInteger(
              insights?.current.autoRenewEnabledSubscriptions ?? 0,
            )} set to auto-renew`}
          />
          <StatCard
            label="Admin entitlements"
            value={formatInteger(insights?.current.activeAdminEntitlements ?? 0)}
            hint="Granted by hand, not paid for"
          />
          <StatCard
            label="Expiring in 7 days"
            value={formatInteger(insights?.current.expiringIn7Days ?? 0)}
            hint="Renew or they lapse"
            /* The only figure on the page that asks for action. */
            status={insights?.current.expiringIn7Days ? "warning" : undefined}
          />
        </StatGrid>
      </section>

      {/* ── What happened recently ────────────────────────────── */}
      <section className="space-y-3">
        <SectionTitle title="Last 30 days" />
        <StatGrid>
          <StatCard
            label="Revenue"
            value={formatCurrencyNaira(
              insights?.revenue.successfulRevenueNaira ?? 0,
            )}
            hint="Verified payments only"
          />
          <StatCard
            label="Payments"
            value={formatInteger(insights?.revenue.successfulPayments ?? 0)}
            hint="Successful transactions"
          />
          <StatCard
            label="Manual grants"
            value={formatInteger(insights?.adminActions.manualGrants ?? 0)}
            hint="Premium given by an admin"
          />
          <StatCard
            label="Revocations"
            value={formatInteger(insights?.adminActions.revocations ?? 0)}
            hint="Premium taken back"
          />
        </StatGrid>
      </section>

      {/* ── Find a user, then act on them ─────────────────────── */}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,28rem)]">
        <section className="min-w-0 space-y-3">
          <SectionTitle title="Accounts" />

          <div className="space-y-3 rounded-[var(--sb-radius-lg)] border border-[var(--sb-border)] bg-[var(--sb-surface-1)] p-3 sm:p-4">
            <FilterChips
              options={MODE_OPTIONS}
              value={searchMode}
              onChange={(value) => {
                setSearchMode(value);
                setPage(1);
              }}
            />
            <SearchField
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder={
                searchMode === "premium"
                  ? "Search premium accounts by name or email"
                  : "Search all accounts by name or email"
              }
              aria-label="Search accounts by name or email"
            />
          </div>

          <div className="overflow-hidden rounded-[var(--sb-radius-lg)] border border-[var(--sb-border)] bg-[var(--sb-surface-1)]">
            {activeQuery.isError ? (
              <ErrorState
                error={activeQuery.error}
                onRetry={() => activeQuery.refetch()}
                className="rounded-none border-0 bg-transparent"
              />
            ) : activeQuery.isLoading ? (
              <div className="space-y-2 p-4">
                {Array.from({ length: 6 }).map((_, index) => (
                  <Skeleton key={index} className="h-20 w-full" />
                ))}
              </div>
            ) : rows.length ? (
              <ul className="divide-y divide-[var(--sb-border)]">
                {rows.map((row) => {
                  const isSelected = row.id === resolvedSelectedUserId;

                  const body = (
                    <>
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-[length:var(--sb-text-base)] font-medium text-[var(--sb-text)]">
                            {row.fullName}
                          </p>
                          <p className="mt-0.5 truncate text-[length:var(--sb-text-xs)] text-[var(--sb-text-tertiary)]">
                            {row.email}
                          </p>
                        </div>
                        {row.isPremium ? (
                          <Badge tone="premium">Premium</Badge>
                        ) : (
                          <Badge tone="neutral">Free</Badge>
                        )}
                      </div>

                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[length:var(--sb-text-xs)] text-[var(--sb-text-tertiary)]">
                        <span>Joined {formatDate(row.createdAt)}</span>
                        {row.isPremium ? (
                          <span>
                            {row.subscriptionEndDate
                              ? `Ends ${formatDate(row.subscriptionEndDate)}`
                              : "No end date — granted by an admin"}
                          </span>
                        ) : null}
                      </div>
                    </>
                  );

                  return (
                    <li key={row.id} className="relative">
                      {/* Below xl the action panel is not beside the list,
                          so a row opens that user's premium page instead
                          of selecting something the admin cannot see. */}
                      <Link
                        href={`/users/${row.id}/premium`}
                        className="block p-4 transition-colors duration-[var(--sb-duration-fast)] hover:bg-[var(--sb-surface-2)] xl:hidden"
                      >
                        {body}
                      </Link>

                      <button
                        type="button"
                        onClick={() => setSelectedUserId(row.id)}
                        aria-pressed={isSelected}
                        className={cn(
                          "hidden w-full p-4 text-left transition-colors duration-[var(--sb-duration-fast)] xl:block",
                          isSelected
                            ? "bg-[var(--sb-accent-soft)]"
                            : "hover:bg-[var(--sb-surface-2)]",
                        )}
                      >
                        <span
                          aria-hidden="true"
                          className={cn(
                            "absolute inset-y-0 left-0 w-[2px] bg-[var(--sb-accent)] transition-opacity",
                            isSelected ? "opacity-100" : "opacity-0",
                          )}
                        />
                        {body}
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <EmptyState
                icon={<UserRoundSearch className="h-4 w-4" />}
                title={
                  isSearching
                    ? "No account matches that search"
                    : "No premium accounts yet"
                }
                description={
                  isSearching
                    ? searchMode === "premium"
                      ? "This searches premium accounts only. Switch to Everyone to look across all users."
                      : "Try part of a name, or the email address."
                    : "Accounts appear here once someone subscribes or is granted access."
                }
                action={
                  isSearching ? (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setSearch("");
                        setPage(1);
                      }}
                    >
                      Clear search
                    </Button>
                  ) : null
                }
              />
            )}
          </div>

          {pagination ? (
            <Pagination
              page={pagination.page}
              totalPages={pagination.totalPages}
              total={pagination.total}
              pageSize={pagination.limit}
              onPageChange={setPage}
            />
          ) : null}
        </section>

        {/* ── Selected account — sticky, desktop only ─────────── */}
        <aside className="hidden min-w-0 xl:block">
          <div className="sb-sticky-col sticky top-0 space-y-3">
            <SectionTitle title="Selected account" />

            {selectedUser ? (
              <div className="space-y-3">
                <div className="rounded-[var(--sb-radius-lg)] border border-[var(--sb-border)] bg-[var(--sb-surface-1)] p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate text-[length:var(--sb-text-lg)] font-semibold text-[var(--sb-text)]">
                        {selectedUser.fullName}
                      </h3>
                      <p className="mt-0.5 truncate text-[length:var(--sb-text-base)] text-[var(--sb-text-secondary)]">
                        {selectedUser.email}
                      </p>
                    </div>
                    {history ? (
                      <Badge
                        tone={
                          history.currentAccess.isPremium ? "premium" : "neutral"
                        }
                      >
                        {history.currentAccess.isPremium ? "Active" : "No access"}
                      </Badge>
                    ) : null}
                  </div>

                  {history?.currentAccess.isPremium ? (
                    <dl className="mt-4 grid gap-2.5 sm:grid-cols-2">
                      <div className="rounded-[var(--sb-radius)] border border-[var(--sb-border)] bg-[var(--sb-bg-inset)] p-3">
                        <dt className="text-[length:var(--sb-text-xs)] text-[var(--sb-text-tertiary)]">
                          Access ends
                        </dt>
                        <dd className="mt-1 text-[length:var(--sb-text-sm)] font-medium text-[var(--sb-text)]">
                          {history.currentAccess.effectiveEndDate
                            ? formatDate(history.currentAccess.effectiveEndDate)
                            : "No end date"}
                        </dd>
                      </div>
                      <div className="rounded-[var(--sb-radius)] border border-[var(--sb-border)] bg-[var(--sb-bg-inset)] p-3">
                        <dt className="text-[length:var(--sb-text-xs)] text-[var(--sb-text-tertiary)]">
                          Granted by
                        </dt>
                        <dd className="mt-1 text-[length:var(--sb-text-sm)] font-medium text-[var(--sb-text)]">
                          {history.currentAccess.activeSourceTypes.join(", ") ||
                            "Unknown"}
                        </dd>
                      </div>
                    </dl>
                  ) : null}

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      asChild
                      href={`/users/${selectedUser.id}`}
                      variant="secondary"
                      size="sm"
                    >
                      Open user
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      asChild
                      href={`/users/${selectedUser.id}/premium`}
                      variant="secondary"
                      size="sm"
                    >
                      Full premium history
                    </Button>
                  </div>
                </div>

                <PremiumActionPanel
                  userId={selectedUser.id}
                  userName={selectedUser.fullName}
                  isPremium={
                    history?.currentAccess?.isPremium ?? selectedUser.isPremium
                  }
                  isStepUpActive={isStepUpActive}
                  stepUpToken={stepUp?.stepUpToken}
                  stepUpRedirectUrl="/premium"
                />

                {history?.entitlements.length ? (
                  <div className="rounded-[var(--sb-radius-lg)] border border-[var(--sb-border)] bg-[var(--sb-surface-1)] p-4 sm:p-5">
                    <h4 className="text-[length:var(--sb-text-base)] font-medium text-[var(--sb-text)]">
                      Recent entitlements
                    </h4>
                    <ul className="mt-3 space-y-2">
                      {history.entitlements.slice(0, 3).map((entry) => (
                        <li
                          key={entry.id}
                          className="rounded-[var(--sb-radius)] border border-[var(--sb-border)] bg-[var(--sb-bg-inset)] p-3"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <p className="min-w-0 truncate text-[length:var(--sb-text-sm)] font-medium text-[var(--sb-text)]">
                              {entry.kind}
                            </p>
                            <Badge
                              tone={
                                entry.status === "ACTIVE"
                                  ? "success"
                                  : entry.status === "REVOKED"
                                    ? "danger"
                                    : "neutral"
                              }
                            >
                              {entry.status}
                            </Badge>
                          </div>
                          <p className="sb-nums mt-1 text-[length:var(--sb-text-xs)] text-[var(--sb-text-tertiary)]">
                            {formatDate(entry.startsAt)} → {formatDate(entry.endsAt)}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="rounded-[var(--sb-radius-lg)] border border-[var(--sb-border)] bg-[var(--sb-surface-1)]">
                <EmptyState
                  title="No account selected"
                  description="Pick someone from the list to see their access and change it."
                />
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
