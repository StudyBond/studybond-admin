"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { PageHeader, SectionTitle } from "@/components/ui/page-header";
import { Skeleton, StatCardSkeleton } from "@/components/ui/skeleton";
import { StatCard, StatGrid } from "@/components/ui/stat-card";
import { useAdminSession } from "@/features/admin-auth/hooks/use-admin-session";
import { useAdminStepUp } from "@/features/admin-auth/hooks/use-admin-step-up";
import { PremiumActionPanel } from "@/features/premium/components/premium-action-panel";
import { usePremiumHistory } from "@/features/premium/hooks/use-premium-history";
import { formatDate, formatDateTime, formatInteger } from "@/lib/utils/format";
import { ArrowLeft, Crown } from "lucide-react";
import { useParams } from "next/navigation";

/**
 * One user's premium record: how they have access now, and everything that
 * was ever granted to them by hand.
 *
 * Colour was the main problem. "Current access: Inactive" was drawn in
 * danger red and "Auto-renew: Off" in danger red — but a user without
 * premium is the ordinary case, not a fault, and most accounts on the
 * platform are exactly that. A support admin opening a free user's page was
 * met with a row of red. Red is reserved for revoked entitlements here.
 *
 * `formatCurrencyNaira` was imported and never used. The back link was
 * labelled "User 360", which is a name for the endpoint, not for the screen
 * a person is going back to.
 */

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
      <div className="space-y-6">
        <PageHeader title="Premium history" description="Checking your access…" />
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
          title="Premium history"
          description="Coverage, entitlements, and subscription records for one user."
          action={
            <Button asChild href={`/users/${userId}`} variant="secondary">
              <ArrowLeft className="h-4 w-4" />
              Back to the user
            </Button>
          }
        />
        <div className="rounded-[var(--sb-radius-lg)] border border-[var(--sb-border)] bg-[var(--sb-surface-1)]">
          <EmptyState
            icon={<Crown className="h-4 w-4" />}
            title="Superadmin only"
            description="This page carries payment and entitlement records, so it is limited to superadmins."
          />
        </div>
      </div>
    );
  }

  const sourceCount = history?.currentAccess.activeSourceTypes.length ?? 0;

  return (
    <div className="sb-enter space-y-6 pb-2">
      <PageHeader
        title={history ? `${history.user.fullName}'s premium` : "Premium history"}
        description={history?.user.email}
        meta={
          history ? (
            history.currentAccess.isPremium ? (
              <Badge tone="premium">Has premium</Badge>
            ) : (
              <Badge tone="neutral">No premium access</Badge>
            )
          ) : null
        }
        action={
          <>
            <Button asChild href={`/users/${userId}`} variant="secondary">
              <ArrowLeft className="h-4 w-4" />
              Back to the user
            </Button>
            <Button asChild href="/premium" variant="secondary">
              All premium accounts
            </Button>
          </>
        }
      />

      {historyQuery.isError ? (
        <ErrorState
          title="Could not load premium history"
          error={historyQuery.error}
          onRetry={() => historyQuery.refetch()}
        />
      ) : null}

      {historyQuery.isLoading ? (
        <>
          <StatGrid>
            {Array.from({ length: 4 }).map((_, index) => (
              <StatCardSkeleton key={index} />
            ))}
          </StatGrid>
          <Skeleton className="h-64 w-full" />
        </>
      ) : history ? (
        <>
          <StatGrid>
            <StatCard
              label="Current access"
              value={history.currentAccess.isPremium ? "Active" : "None"}
              hint={
                history.currentAccess.effectiveEndDate
                  ? `Ends ${formatDate(history.currentAccess.effectiveEndDate)}`
                  : "No end date recorded"
              }
              /* No status: not having premium is normal, not a fault. */
            />
            <StatCard
              label="Access sources"
              value={formatInteger(sourceCount)}
              hint={
                history.currentAccess.activeSourceTypes.join(", ") ||
                "Nothing is granting access"
              }
            />
            <StatCard
              label="Entitlements"
              value={formatInteger(history.entitlements.length)}
              hint="Granted by an admin, all time"
            />
            <StatCard
              label="Auto-renew"
              value={history.subscription?.autoRenew ? "On" : "Off"}
              hint={history.subscription?.provider ?? "No paid subscription"}
            />
          </StatGrid>

          <PremiumActionPanel
            userId={userId}
            userName={history.user.fullName}
            isPremium={history.currentAccess.isPremium}
            isStepUpActive={isStepUpActive}
            stepUpToken={stepUp?.stepUpToken}
            stepUpRedirectUrl={`/users/${userId}/premium`}
          />

          <div className="grid gap-6 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
            {/* ── Paid subscription ─────────────────────────── */}
            <section className="min-w-0 space-y-3">
              <SectionTitle
                title="Paid subscription"
                description="Money they have actually paid."
              />
              <div className="rounded-[var(--sb-radius-lg)] border border-[var(--sb-border)] bg-[var(--sb-surface-1)] p-4 sm:p-5">
                {history.subscription ? (
                  <div className="space-y-2.5">
                    <div className="rounded-[var(--sb-radius)] border border-[var(--sb-border)] bg-[var(--sb-bg-inset)] p-3">
                      <p className="text-[length:var(--sb-text-xs)] text-[var(--sb-text-tertiary)]">
                        Plan
                      </p>
                      <p className="mt-1 text-[length:var(--sb-text-sm)] font-medium text-[var(--sb-text)]">
                        {history.subscription.provider} ·{" "}
                        {history.subscription.planType}
                      </p>
                      <p className="mt-0.5 text-[length:var(--sb-text-xs)] text-[var(--sb-text-tertiary)]">
                        {history.subscription.status}
                      </p>
                    </div>
                    <div className="rounded-[var(--sb-radius)] border border-[var(--sb-border)] bg-[var(--sb-bg-inset)] p-3">
                      <p className="text-[length:var(--sb-text-xs)] text-[var(--sb-text-tertiary)]">
                        Covers
                      </p>
                      <p className="mt-1 text-[length:var(--sb-text-sm)] font-medium text-[var(--sb-text)]">
                        {formatDate(history.subscription.startDate)} →{" "}
                        {formatDate(history.subscription.endDate)}
                      </p>
                    </div>
                    <div className="rounded-[var(--sb-radius)] border border-[var(--sb-border)] bg-[var(--sb-bg-inset)] p-3">
                      <p className="text-[length:var(--sb-text-xs)] text-[var(--sb-text-tertiary)]">
                        Payment reference
                      </p>
                      <p className="sb-mono mt-1 break-all text-[length:var(--sb-text-xs)] text-[var(--sb-text)]">
                        {history.subscription.paymentReference ?? "None recorded"}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="rounded-[var(--sb-radius)] border border-dashed border-[var(--sb-border)] px-3 py-4 text-center text-[length:var(--sb-text-sm)] text-[var(--sb-text-tertiary)]">
                    No paid subscription. Any access this user has was granted
                    by an admin.
                  </p>
                )}
              </div>
            </section>

            {/* ── Entitlements ──────────────────────────────── */}
            <section className="min-w-0 space-y-3">
              <SectionTitle
                title="Admin grants"
                description="Premium given by hand, newest first."
                action={
                  <Badge tone="neutral">
                    {formatInteger(history.entitlements.length)}
                  </Badge>
                }
              />

              {history.entitlements.length ? (
                <ul className="space-y-2.5">
                  {history.entitlements.map((entry) => (
                    <li
                      key={entry.id}
                      className="rounded-[var(--sb-radius-lg)] border border-[var(--sb-border)] bg-[var(--sb-surface-1)] p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-1.5">
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
                          <Badge tone="neutral">{entry.kind}</Badge>
                        </div>
                        <p className="text-[length:var(--sb-text-xs)] text-[var(--sb-text-tertiary)]">
                          {formatDateTime(entry.createdAt)}
                        </p>
                      </div>

                      <p className="mt-2.5 text-[length:var(--sb-text-sm)] text-[var(--sb-text)]">
                        {entry.note}
                      </p>
                      <p className="mt-1 text-[length:var(--sb-text-xs)] text-[var(--sb-text-tertiary)]">
                        Covers {formatDate(entry.startsAt)} →{" "}
                        {formatDate(entry.endsAt)}
                      </p>

                      <dl className="mt-3 grid gap-2.5 sm:grid-cols-2">
                        <div className="rounded-[var(--sb-radius)] border border-[var(--sb-border)] bg-[var(--sb-bg-inset)] p-2.5">
                          <dt className="text-[length:var(--sb-text-xs)] text-[var(--sb-text-tertiary)]">
                            Granted by
                          </dt>
                          <dd className="mt-0.5 truncate text-[length:var(--sb-text-sm)] font-medium text-[var(--sb-text)]">
                            {entry.grantedByAdmin.fullName}
                          </dd>
                          <dd className="truncate text-[length:var(--sb-text-xs)] text-[var(--sb-text-tertiary)]">
                            {entry.grantedByAdmin.email}
                          </dd>
                        </div>
                        <div className="rounded-[var(--sb-radius)] border border-[var(--sb-border)] bg-[var(--sb-bg-inset)] p-2.5">
                          <dt className="text-[length:var(--sb-text-xs)] text-[var(--sb-text-tertiary)]">
                            Revoked by
                          </dt>
                          <dd className="mt-0.5 truncate text-[length:var(--sb-text-sm)] font-medium text-[var(--sb-text)]">
                            {entry.revokedByAdmin?.fullName ?? "Not revoked"}
                          </dd>
                          <dd className="truncate text-[length:var(--sb-text-xs)] text-[var(--sb-text-tertiary)]">
                            {entry.revokedByAdmin?.email ??
                              "Still active, or it simply expired"}
                          </dd>
                        </div>
                      </dl>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="rounded-[var(--sb-radius-lg)] border border-[var(--sb-border)] bg-[var(--sb-surface-1)]">
                  <EmptyState
                    title="No admin grants"
                    description="Nobody has given this user premium by hand."
                  />
                </div>
              )}
            </section>
          </div>
        </>
      ) : null}
    </div>
  );
}
