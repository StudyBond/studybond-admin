"use client";

import { ApiErrorMessage } from "@/components/ui/api-error-message";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";

import { ErrorState } from "@/components/ui/error-state";
import { TextArea } from "@/components/ui/field";
import { PageHeader, SectionTitle } from "@/components/ui/page-header";
import { Skeleton, StatCardSkeleton } from "@/components/ui/skeleton";
import { StatCard, StatGrid } from "@/components/ui/stat-card";
import { useAdminSession } from "@/features/admin-auth/hooks/use-admin-session";
import { useAdminStepUp } from "@/features/admin-auth/hooks/use-admin-step-up";
import { PremiumActionPanel } from "@/features/premium/components/premium-action-panel";
import { useAdminUser360 } from "@/features/users/hooks/use-admin-user-360";
import { adminUsersApi } from "@/lib/api/admin-users";
import {
  formatCurrencyNaira,
  formatDate,
  formatDateTime,
  formatInteger,
} from "@/lib/utils/format";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Ban, Crown, ShieldCheck, ShieldOff, Sparkles } from "lucide-react";
import { useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

/**
 * Everything known about one user.
 *
 * The bug worth naming: the ban control was painted `bg-[--accent-rose]`
 * unconditionally, so for an already-banned account the button that would
 * *restore* their access was drawn in the same alarming red as the one that
 * took it away. Reversing a ban and imposing one looked identical. The
 * action now takes its colour from what it does.
 *
 * Nothing on this screen asked before acting, either. Ban, remove device and
 * promote-to-superadmin each fired on a single click, and "Ban user" sat
 * directly under the note textarea where the cursor already was. They arm
 * first now — see ConfirmButton.
 *
 * Two other things made the page hard to read:
 *
 * - The device-removal note sat above the device list, with nothing tying it
 *   to any particular device. You typed a reason into a floating box, then
 *   picked which device it applied to. It is now inside each device's row,
 *   revealed when you arm that device's removal.
 *
 * - The audit panel stacked two different lists — admin actions taken
 *   against this user, and this user's own auth events — with no headings
 *   between them. They were distinguishable only by badge colour, slate vs
 *   cyan. They are two labelled sections now.
 *
 * Layout split at 2xl (1536px), which put the moderation controls below a
 * long activity feed on every laptop. It splits at xl.
 */

/** A labelled fact. Replaces the old DetailCard and its uppercase kicker. */
function Fact({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper?: string;
}) {
  return (
    <div className="rounded-[var(--sb-radius)] border border-[var(--sb-border)] bg-[var(--sb-bg-inset)] p-3">
      <p className="text-[length:var(--sb-text-xs)] text-[var(--sb-text-tertiary)]">
        {label}
      </p>
      <p className="mt-1 text-[length:var(--sb-text-sm)] font-medium text-[var(--sb-text)]">
        {value}
      </p>
      {helper ? (
        <p className="mt-0.5 text-[length:var(--sb-text-xs)] text-[var(--sb-text-tertiary)]">
          {helper}
        </p>
      ) : null}
    </div>
  );
}

function Panel({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="min-w-0 space-y-3">
      <SectionTitle title={title} description={description} action={action} />
      <div className="rounded-[var(--sb-radius-lg)] border border-[var(--sb-border)] bg-[var(--sb-surface-1)] p-4 sm:p-5">
        {children}
      </div>
    </section>
  );
}

function NoneYet({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-[var(--sb-radius)] border border-dashed border-[var(--sb-border)] px-3 py-4 text-center text-[length:var(--sb-text-sm)] text-[var(--sb-text-tertiary)]">
      {children}
    </p>
  );
}

export function User360Screen() {
  const params = useParams<{ id: string }>();
  const userId = Number.parseInt(params.id, 10);
  const queryClient = useQueryClient();
  const sessionQuery = useAdminSession();
  const { isActive: isStepUpActive, stepUp } = useAdminStepUp();
  const userQuery = useAdminUser360(
    Number.isFinite(userId) ? userId : undefined,
  );
  const user360 = userQuery.data;
  const isSuperadmin = sessionQuery.data?.user?.role === "SUPERADMIN";

  const [moderationReason, setModerationReason] = useState("");
  const [roleReason, setRoleReason] = useState("");
  const [deviceReason, setDeviceReason] = useState("");

  async function refreshUserViews() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] }),
      queryClient.invalidateQueries({
        queryKey: ["admin", "users", "360", userId],
      }),
      queryClient.invalidateQueries({ queryKey: ["admin", "audit-logs"] }),
      queryClient.invalidateQueries({
        queryKey: ["admin", "analytics", "overview"],
      }),
    ]);
  }

  function mutationErrorHandler(title: string) {
    return (error: unknown) => {
      toast.error(title, {
        description: (
          <ApiErrorMessage error={error} fallback="Please try again." />
        ),
      });
    };
  }

  const banMutation = useMutation({
    mutationFn: () =>
      adminUsersApi.banUser(userId, {
        reason: moderationReason.trim() || undefined,
      }),
    onSuccess: async (payload) => {
      toast.success(payload.message);
      setModerationReason("");
      await refreshUserViews();
    },
    onError: mutationErrorHandler("Could not ban this account"),
  });

  const unbanMutation = useMutation({
    mutationFn: () => adminUsersApi.unbanUser(userId),
    onSuccess: async (payload) => {
      toast.success(payload.message);
      await refreshUserViews();
    },
    onError: mutationErrorHandler("Could not lift the ban"),
  });

  const removeDeviceMutation = useMutation({
    mutationFn: (deviceId: string) =>
      adminUsersApi.removeDevice(userId, deviceId, {
        reason: deviceReason.trim() || undefined,
      }),
    onSuccess: async (payload) => {
      toast.success(payload.message);
      setDeviceReason("");
      await refreshUserViews();
    },
    onError: mutationErrorHandler("Could not remove the device"),
  });

  const promoteMutation = useMutation({
    mutationFn: (newRole: "ADMIN" | "SUPERADMIN") =>
      adminUsersApi.promoteUser(
        userId,
        { newRole, reason: roleReason.trim() || undefined },
        { stepUpToken: stepUp?.stepUpToken },
      ),
    onSuccess: async (payload) => {
      toast.success(payload.message);
      setRoleReason("");
      await refreshUserViews();
    },
    onError: mutationErrorHandler("Could not change the role"),
  });

  const demoteMutation = useMutation({
    mutationFn: () =>
      adminUsersApi.demoteUser(
        userId,
        { reason: roleReason.trim() || undefined },
        { stepUpToken: stepUp?.stepUpToken },
      ),
    onSuccess: async (payload) => {
      toast.success(payload.message);
      setRoleReason("");
      await refreshUserViews();
    },
    onError: mutationErrorHandler("Could not demote this account"),
  });

  if (userQuery.isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="User" description="Loading this account…" />
        <StatGrid>
          {Array.from({ length: 4 }).map((_, index) => (
            <StatCardSkeleton key={index} />
          ))}
        </StatGrid>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (userQuery.isError || !user360) {
    return (
      <div className="sb-enter space-y-6">
        <PageHeader title="User" />
        <ErrorState
          title="Could not load this user"
          error={userQuery.error}
          onRetry={() => userQuery.refetch()}
        />
      </div>
    );
  }

  const { user, premium, engagement, security, recent, institution } = user360;
  const isBanned = user.isBanned;
  const isBusy = banMutation.isPending || unbanMutation.isPending;

  return (
    <div className="sb-enter space-y-6 pb-2">
      <PageHeader
        title={user.fullName}
        description={user.email}
        meta={
          <>
            {user.role !== "USER" ? (
              <Badge tone="brand">
                {user.role === "SUPERADMIN" ? "Superadmin" : "Admin"}
              </Badge>
            ) : null}
            {isBanned ? (
              <Badge tone="danger" dot>
                Banned
              </Badge>
            ) : null}
            {premium.isPremium ? <Badge tone="premium">Premium</Badge> : null}
            {!user.isVerified ? (
              <Badge tone="warning">Email not verified</Badge>
            ) : null}
            <Badge tone="neutral">{institution.code}</Badge>
            <Badge tone="neutral">Joined {formatDate(user.createdAt)}</Badge>
          </>
        }
        action={
          <>
            <Button
              asChild
              href={`/users/${userId}/premium`}
              variant="secondary"
            >
              <Sparkles className="h-4 w-4" />
              Premium history
            </Button>
            {!isStepUpActive && isSuperadmin ? (
              <Button
                asChild
                href={`/step-up?next=/users/${userId}&intent=User%20role%20management`}
                variant="secondary"
              >
                <ShieldCheck className="h-4 w-4" />
                Verify to change role
              </Button>
            ) : null}
          </>
        }
      />

      <StatGrid>
        <StatCard
          label="Account"
          value={isBanned ? "Banned" : "Active"}
          hint={isBanned ? user.bannedReason ?? "No reason recorded" : "In good standing"}
          status={isBanned ? "danger" : undefined}
        />
        <StatCard
          label="Premium"
          value={premium.isPremium ? "Active" : "Free"}
          hint={
            premium.coverage.activeSourceTypes.join(", ") ||
            "No premium source"
          }
        />
        <StatCard
          label="Current streak"
          value={formatInteger(engagement.currentStreak)}
          hint={`${formatInteger(
            engagement.streakFreezesAvailable,
          )} freezes available`}
        />
        <StatCard
          label="Completed exams"
          value={formatInteger(engagement.completedExams)}
          hint={`${formatInteger(engagement.inProgressExams)} in progress`}
        />
      </StatGrid>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        {/* ══ Left: who they are and what they have done ══════ */}
        <div className="min-w-0 space-y-6">
          <Panel title="Profile">
            <div className="grid gap-2.5 sm:grid-cols-2">
              <Fact
                label="Joined"
                value={formatDateTime(user.createdAt)}
                helper={`Last updated ${formatDateTime(user.updatedAt)}`}
              />
              <Fact
                label="Target score"
                value={user.targetScore ? String(user.targetScore) : "Not set"}
                helper={user.aspiringCourse ?? "No aspiring course"}
              />
              <Fact
                label="Marketing email"
                value={user.emailUnsubscribed ? "Unsubscribed" : "Subscribed"}
              />
              <Fact
                label="Ban record"
                value={user.bannedReason ?? "Never banned"}
                helper={
                  user.bannedAt
                    ? `Banned ${formatDateTime(user.bannedAt)}`
                    : undefined
                }
              />
            </div>
          </Panel>

          <Panel
            title="Study footprint"
            description="What this account has done on the platform."
          >
            <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
              <Fact label="Total SP" value={formatInteger(engagement.totalSp)} />
              <Fact
                label="Weekly SP"
                value={formatInteger(engagement.weeklySp)}
              />
              <Fact
                label="Bookmarks"
                value={formatInteger(engagement.bookmarkedQuestions)}
                helper={`${formatInteger(
                  engagement.questionReportsSubmitted,
                )} reports sent`}
              />
              <Fact
                label="AI uses today"
                value={formatInteger(engagement.aiExplanationsUsedToday)}
              />
              <Fact
                label="Real exams"
                value={formatInteger(engagement.realExamsCompleted)}
              />
              <Fact
                label="Collab exams"
                value={formatInteger(engagement.completedCollaborationExams)}
              />
              <Fact
                label="Last studied"
                value={
                  engagement.lastStudyActivityDate
                    ? formatDate(engagement.lastStudyActivityDate)
                    : "Never"
                }
              />
              <Fact
                label="Free exam"
                value={engagement.hasTakenFreeExam ? "Taken" : "Not taken"}
              />
            </div>
          </Panel>

          <Panel
            title="Recent exams"
            description="Newest first, within this institution."
          >
            {recent.exams.length ? (
              <ul className="space-y-2.5">
                {recent.exams.map((exam) => (
                  <li
                    key={exam.id}
                    className="rounded-[var(--sb-radius)] border border-[var(--sb-border)] bg-[var(--sb-bg-inset)] p-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge
                          tone={
                            exam.status === "COMPLETED" ? "success" : "info"
                          }
                        >
                          {exam.status === "COMPLETED"
                            ? "Completed"
                            : "In progress"}
                        </Badge>
                        {exam.isCollaboration ? (
                          <Badge tone="neutral">Collaboration</Badge>
                        ) : null}
                      </div>
                      <p className="text-[length:var(--sb-text-xs)] text-[var(--sb-text-tertiary)]">
                        {formatDateTime(exam.startedAt)}
                      </p>
                    </div>
                    <p className="mt-2 text-[length:var(--sb-text-sm)] font-medium text-[var(--sb-text)]">
                      {exam.examType}
                    </p>
                    <p className="sb-nums mt-0.5 text-[length:var(--sb-text-xs)] text-[var(--sb-text-tertiary)]">
                      Score {formatInteger(exam.score)}
                      {typeof exam.percentage === "number"
                        ? ` · ${exam.percentage}%`
                        : ""}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <NoneYet>No exams in this institution scope.</NoneYet>
            )}
          </Panel>

          <div className="grid gap-6 lg:grid-cols-2">
            <Panel title="Recent bookmarks">
              {recent.bookmarks.length ? (
                <ul className="space-y-2.5">
                  {recent.bookmarks.map((bookmark) => (
                    <li
                      key={bookmark.id}
                      className="rounded-[var(--sb-radius)] border border-[var(--sb-border)] bg-[var(--sb-bg-inset)] p-3"
                    >
                      <p className="text-[length:var(--sb-text-sm)] font-medium text-[var(--sb-text)]">
                        {bookmark.subject}
                      </p>
                      <p className="sb-nums mt-0.5 text-[length:var(--sb-text-xs)] text-[var(--sb-text-tertiary)]">
                        Question #{bookmark.questionId} · saved{" "}
                        {formatDate(bookmark.createdAt)}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <NoneYet>No bookmarks.</NoneYet>
              )}
            </Panel>

            <Panel title="Recent collaboration">
              {recent.collaborationSessions.length ? (
                <ul className="space-y-2.5">
                  {recent.collaborationSessions.map((session) => (
                    <li
                      key={`${session.role}-${session.sessionId}`}
                      className="rounded-[var(--sb-radius)] border border-[var(--sb-border)] bg-[var(--sb-bg-inset)] p-3"
                    >
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge tone="neutral">
                          {session.role === "HOST" ? "Host" : "Guest"}
                        </Badge>
                        <Badge tone="neutral">{session.status}</Badge>
                      </div>
                      <p className="sb-mono mt-2 text-[length:var(--sb-text-sm)] font-medium text-[var(--sb-text)]">
                        {session.sessionCode}
                      </p>
                      <p className="mt-0.5 text-[length:var(--sb-text-xs)] text-[var(--sb-text-tertiary)]">
                        {session.sessionType}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <NoneYet>No collaboration sessions.</NoneYet>
              )}
            </Panel>
          </div>
        </div>

        {/* ══ Right: what you can do about it ═════════════════ */}
        <div className="min-w-0 space-y-6">
          <Panel
            title="Premium coverage"
            action={
              premium.isPremium ? (
                <Badge tone="premium">Active</Badge>
              ) : (
                <Badge tone="neutral">Free</Badge>
              )
            }
          >
            <div className="space-y-2.5">
              <Fact
                label="Coverage ends"
                value={
                  premium.coverage.effectiveEndDate
                    ? formatDate(premium.coverage.effectiveEndDate)
                    : "No end date"
                }
                helper={
                  premium.coverage.activeSourceTypes.join(", ") ||
                  "No premium source"
                }
              />
              <Fact
                label="Device access mode"
                value={premium.deviceAccessMode}
                helper={premium.subscription?.provider ?? "No provider"}
              />
              <Fact
                label="Latest payment"
                value={
                  premium.latestSuccessfulPayment
                    ? formatCurrencyNaira(
                        premium.latestSuccessfulPayment.amountPaid,
                      )
                    : "None recorded"
                }
                helper={
                  premium.latestSuccessfulPayment
                    ? `${premium.latestSuccessfulPayment.provider} · ${formatDateTime(
                        premium.latestSuccessfulPayment.paidAt,
                      )}`
                    : undefined
                }
              />
            </div>
          </Panel>

          {isSuperadmin ? (
            <PremiumActionPanel
              userId={userId}
              userName={user.fullName}
              isPremium={premium.isPremium}
              isStepUpActive={isStepUpActive}
              stepUpToken={stepUp?.stepUpToken}
              stepUpRedirectUrl={`/users/${userId}`}
            />
          ) : null}

          {/* ── Moderation ──────────────────────────────────── */}
          <Panel
            title="Moderation"
            description={
              isBanned
                ? "This account cannot sign in."
                : "This account can sign in normally."
            }
          >
            <TextArea
              label="Note"
              hint="Optional, saved to the audit log"
              rows={3}
              value={moderationReason}
              onChange={(event) => setModerationReason(event.target.value)}
              placeholder={
                isBanned
                  ? "Why is the ban being lifted?"
                  : "Why is this account being banned?"
              }
            />

            <div className="mt-4">
              {/* The action decides its own colour. Restoring access is not
                  a destructive act and is no longer drawn as one. */}
              {isBanned ? (
                <Button
                  type="button"
                  variant="primary"
                  className="w-full"
                  onClick={() => unbanMutation.mutate()}
                  disabled={isBusy}
                  isLoading={unbanMutation.isPending}
                >
                  <ShieldCheck className="h-4 w-4" />
                  Lift the ban
                </Button>
              ) : (
                <ConfirmButton
                  variant="danger"
                  className="w-full"
                  confirmLabel="Yes, ban this account"
                  onConfirm={() => banMutation.mutate()}
                  disabled={isBusy}
                  isLoading={banMutation.isPending}
                  icon={<Ban className="h-4 w-4" />}
                >
                  Ban account
                </ConfirmButton>
              )}
            </div>
          </Panel>

          {/* ── Role ────────────────────────────────────────── */}
          {isSuperadmin ? (
            <Panel
              title="Role"
              description={`Currently ${
                user.role === "USER"
                  ? "an ordinary user"
                  : user.role === "ADMIN"
                    ? "an admin"
                    : "a superadmin"
              }.`}
            >
              {!isStepUpActive ? (
                <div className="mb-4 rounded-[var(--sb-radius)] border border-[var(--sb-warning-ring)] bg-[var(--sb-warning-soft)] p-3">
                  <p className="text-[length:var(--sb-text-sm)] text-[var(--sb-text-secondary)]">
                    Role changes need step-up verification first.
                  </p>
                  <Button
                    asChild
                    href={`/step-up?next=/users/${userId}&intent=User%20role%20management`}
                    variant="secondary"
                    size="sm"
                    className="mt-2.5"
                  >
                    Verify now
                  </Button>
                </div>
              ) : null}

              <TextArea
                label="Note"
                hint="Optional, saved to the audit log"
                rows={3}
                value={roleReason}
                onChange={(event) => setRoleReason(event.target.value)}
                placeholder="Why is this role changing?"
              />

              <div className="mt-4 space-y-2">
                {user.role === "USER" ? (
                  <>
                    <Button
                      type="button"
                      variant="secondary"
                      className="w-full"
                      onClick={() => promoteMutation.mutate("ADMIN")}
                      disabled={!isStepUpActive || promoteMutation.isPending}
                      isLoading={promoteMutation.isPending}
                    >
                      <ShieldCheck className="h-4 w-4" />
                      Make admin
                    </Button>
                    {/* Superadmin can grant premium, delete reports and
                        promote others. Worth a second click. */}
                    <ConfirmButton
                      variant="secondary"
                      className="w-full"
                      confirmLabel="Yes, make superadmin"
                      onConfirm={() => promoteMutation.mutate("SUPERADMIN")}
                      disabled={!isStepUpActive || promoteMutation.isPending}
                      isLoading={promoteMutation.isPending}
                      icon={<Crown className="h-4 w-4" />}
                    >
                      Make superadmin
                    </ConfirmButton>
                  </>
                ) : (
                  <ConfirmButton
                    variant="danger"
                    className="w-full"
                    confirmLabel="Yes, remove their access"
                    onConfirm={() => demoteMutation.mutate()}
                    disabled={!isStepUpActive || demoteMutation.isPending}
                    isLoading={demoteMutation.isPending}
                    icon={<ShieldOff className="h-4 w-4" />}
                  >
                    Demote to ordinary user
                  </ConfirmButton>
                )}
              </div>
            </Panel>
          ) : null}

          {/* ── Devices ─────────────────────────────────────── */}
          <Panel
            title="Devices"
            description="Removing a device signs this person out of it."
            action={
              <Badge tone="neutral">
                {formatInteger(security.activeSessionsCount)} sessions
              </Badge>
            }
          >
            {security.registeredDevices.length ? (
              <ul className="space-y-2.5">
                {security.registeredDevices.map((device) => (
                  <li
                    key={device.deviceId}
                    className="rounded-[var(--sb-radius)] border border-[var(--sb-border)] bg-[var(--sb-bg-inset)] p-3"
                  >
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge tone={device.isActive ? "success" : "neutral"}>
                        {device.isActive ? "Active" : "Inactive"}
                      </Badge>
                      {!device.isVerified ? (
                        <Badge tone="warning">Unverified</Badge>
                      ) : null}
                    </div>
                    <p className="mt-2 text-[length:var(--sb-text-sm)] font-medium text-[var(--sb-text)]">
                      {device.deviceName}
                    </p>
                    <p className="sb-mono mt-0.5 break-all text-[length:var(--sb-text-xs)] text-[var(--sb-text-tertiary)]">
                      {device.deviceId}
                    </p>

                    {/* The note now belongs to the device you are removing,
                        instead of floating above the whole list. */}
                    <div className="mt-3">
                      <ConfirmButton
                        variant="danger"
                        size="sm"
                        confirmLabel="Remove this device"
                        onConfirm={() =>
                          removeDeviceMutation.mutate(device.deviceId)
                        }
                        disabled={removeDeviceMutation.isPending}
                        isLoading={removeDeviceMutation.isPending}
                        icon={<ShieldOff className="h-3.5 w-3.5" />}
                      >
                        Remove
                      </ConfirmButton>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <NoneYet>No registered devices.</NoneYet>
            )}

            {security.registeredDevices.length ? (
              <div className="mt-4">
                <TextArea
                  label="Removal note"
                  hint="Optional, applies to the next removal"
                  rows={2}
                  value={deviceReason}
                  onChange={(event) => setDeviceReason(event.target.value)}
                  placeholder="Why is the device being removed?"
                />
              </div>
            ) : null}
          </Panel>

          {/* ── Audit ───────────────────────────────────────
              Two separate lists that used to be stacked without
              headings, told apart only by badge colour. */}
          <Panel
            title="Admin actions on this account"
            description="What other admins have done to this user."
          >
            {security.recentAdminActions.length ? (
              <ul className="space-y-2.5">
                {security.recentAdminActions.map((action, index) => (
                  <li
                    key={`${action.action}-${index}`}
                    className="rounded-[var(--sb-radius)] border border-[var(--sb-border)] bg-[var(--sb-bg-inset)] p-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Badge tone="neutral">
                        {action.action.replaceAll("_", " ").toLowerCase()}
                      </Badge>
                      <p className="text-[length:var(--sb-text-xs)] text-[var(--sb-text-tertiary)]">
                        {formatDateTime(action.createdAt)}
                      </p>
                    </div>
                    <p className="mt-1.5 text-[length:var(--sb-text-xs)] text-[var(--sb-text-tertiary)]">
                      By admin #{action.actorId} ({action.actorRole})
                      {action.reason ? ` — ${action.reason}` : ""}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <NoneYet>No admin has acted on this account.</NoneYet>
            )}
          </Panel>

          <Panel
            title="Their sign-in activity"
            description="Auth and device events from this account."
          >
            {security.recentAuditEvents.length ? (
              <ul className="space-y-2.5">
                {security.recentAuditEvents.map((event, index) => (
                  <li
                    key={`${event.action}-${index}`}
                    className="rounded-[var(--sb-radius)] border border-[var(--sb-border)] bg-[var(--sb-bg-inset)] p-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Badge tone="neutral">
                        {event.action.replaceAll("_", " ").toLowerCase()}
                      </Badge>
                      <p className="text-[length:var(--sb-text-xs)] text-[var(--sb-text-tertiary)]">
                        {formatDateTime(event.createdAt)}
                      </p>
                    </div>
                    <p className="sb-mono mt-1.5 break-all text-[length:var(--sb-text-xs)] text-[var(--sb-text-tertiary)]">
                      {event.deviceId ?? "unknown device"} ·{" "}
                      {event.ipAddress ?? "unknown IP"}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <NoneYet>No sign-in events recorded.</NoneYet>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
