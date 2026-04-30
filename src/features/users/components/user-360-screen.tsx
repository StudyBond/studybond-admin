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
import { useAdminUser360 } from "@/features/users/hooks/use-admin-user-360";
import { adminUsersApi } from "@/lib/api/admin-users";
import { formatCurrencyNaira, formatDateTime, formatInteger } from "@/lib/utils/format";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { ArrowRight, Ban, Crown, LoaderCircle, ShieldCheck, ShieldOff, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

function DetailCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper?: string;
}) {
  return (
    <div className="rounded-xl border border-white/8 bg-black/10 p-4">
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[color:var(--muted-foreground)]">
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold text-white">{value}</p>
      {helper ? <p className="mt-1 text-xs text-[color:var(--muted-foreground)]">{helper}</p> : null}
    </div>
  );
}

function EmptyCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-white/10 bg-black/10 px-4 py-5 text-sm text-[color:var(--muted-foreground)]">
      {children}
    </div>
  );
}

export function User360Screen() {
  const params = useParams<{ id: string }>();
  const userId = Number.parseInt(params.id, 10);
  const queryClient = useQueryClient();
  const sessionQuery = useAdminSession();
  const { isActive: isStepUpActive, stepUp } = useAdminStepUp();
  const userQuery = useAdminUser360(Number.isFinite(userId) ? userId : undefined);
  const user360 = userQuery.data;
  const isSuperadmin = sessionQuery.data?.user?.role === "SUPERADMIN";

  const [moderationReason, setModerationReason] = useState("");
  const [roleReason, setRoleReason] = useState("");
  const [deviceReason, setDeviceReason] = useState("");

  async function refreshUserViews() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] }),
      queryClient.invalidateQueries({ queryKey: ["admin", "users", "360", userId] }),
      queryClient.invalidateQueries({ queryKey: ["admin", "audit-logs"] }),
      queryClient.invalidateQueries({ queryKey: ["admin", "analytics", "overview"] }),
    ]);
  }

  const banMutation = useMutation({
    mutationFn: () => adminUsersApi.banUser(userId, { reason: moderationReason.trim() || undefined }),
    onSuccess: async (payload) => {
      toast.success(payload.message);
      await refreshUserViews();
    },
    onError: (error) => {
      toast.error("Could not update account status", {
        description: <ApiErrorMessage error={error} fallback="Please try again." />,
      });
    },
  });

  const unbanMutation = useMutation({
    mutationFn: () => adminUsersApi.unbanUser(userId),
    onSuccess: async (payload) => {
      toast.success(payload.message);
      await refreshUserViews();
    },
    onError: (error) => {
      toast.error("Could not update account status", {
        description: <ApiErrorMessage error={error} fallback="Please try again." />,
      });
    },
  });

  const removeDeviceMutation = useMutation({
    mutationFn: (deviceId: string) => adminUsersApi.removeDevice(userId, deviceId, { reason: deviceReason.trim() || undefined }),
    onSuccess: async (payload) => {
      toast.success(payload.message);
      await refreshUserViews();
    },
    onError: (error) => {
      toast.error("Could not remove device", {
        description: <ApiErrorMessage error={error} fallback="Please try again." />,
      });
    },
  });

  const promoteMutation = useMutation({
    mutationFn: (newRole: "ADMIN" | "SUPERADMIN") =>
      adminUsersApi.promoteUser(userId, { newRole, reason: roleReason.trim() || undefined }, { stepUpToken: stepUp?.stepUpToken }),
    onSuccess: async (payload) => {
      toast.success(payload.message);
      await refreshUserViews();
    },
    onError: (error) => {
      toast.error("Could not change role", {
        description: <ApiErrorMessage error={error} fallback="Please try again." />,
      });
    },
  });

  const demoteMutation = useMutation({
    mutationFn: () =>
      adminUsersApi.demoteUser(userId, { reason: roleReason.trim() || undefined }, { stepUpToken: stepUp?.stepUpToken }),
    onSuccess: async (payload) => {
      toast.success(payload.message);
      await refreshUserViews();
    },
    onError: (error) => {
      toast.error("Could not demote user", {
        description: <ApiErrorMessage error={error} fallback="Please try again." />,
      });
    },
  });

  const metrics = useMemo<Array<{
    label: string;
    value: string;
    delta: string;
    tone: "amber" | "cyan" | "emerald" | "rose";
  }>>(() => {
    if (!user360) return [];

    return [
      {
        label: "Account",
        value: user360.user.isBanned ? "Banned" : "Active",
        delta: user360.user.role,
        tone: user360.user.isBanned ? "rose" : "emerald",
      },
      {
        label: "Premium",
        value: user360.premium.isPremium ? "Active" : "Free",
        delta: user360.premium.coverage.activeSourceTypes.join(", ") || "No premium source",
        tone: user360.premium.isPremium ? "amber" : "cyan",
      },
      {
        label: "Current streak",
        value: formatInteger(user360.engagement.currentStreak),
        delta: `${formatInteger(user360.engagement.streakFreezesAvailable)} freezes available`,
        tone: "cyan" as const,
      },
      {
        label: "Completed exams",
        value: formatInteger(user360.engagement.completedExams),
        delta: `${formatInteger(user360.engagement.inProgressExams)} in progress`,
        tone: "emerald" as const,
      },
    ];
  }, [user360]);

  return (
    <section className="space-y-6">
      <SectionHeading
        eyebrow="Users"
        title={user360 ? user360.user.fullName : "User details"}
        description="Support, moderation, and premium context for a single user account."
        action={
          user360 ? (
            <div className="flex flex-wrap items-center gap-2">
              <Link href={`/users/${userId}/premium`} className="inline-flex items-center gap-2 rounded-xl border border-white/8 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-white transition hover:border-white/14 hover:bg-white/[0.06]">
                <Sparkles className="h-4 w-4" />
                Premium history
              </Link>
              {!isStepUpActive && isSuperadmin ? (
                <Link href={`/step-up?next=/users/${userId}&intent=User%20role%20management`} className="inline-flex items-center gap-2 rounded-xl border border-white/8 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-white transition hover:border-white/14 hover:bg-white/[0.06]">
                  <ShieldCheck className="h-4 w-4" />
                  Activate step-up
                </Link>
              ) : null}
            </div>
          ) : null
        }
      />

      {userQuery.isLoading ? <Surface className="p-6"><p className="text-sm text-[color:var(--muted-foreground)]">Loading user 360...</p></Surface> : null}
      {userQuery.isError ? (
        <Surface glow="rose" className="p-6">
          <p className="text-base font-semibold text-white">Could not load this user.</p>
          <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">
            <ApiErrorMessage error={userQuery.error} fallback="Please try again." />
          </p>
        </Surface>
      ) : null}

      {user360 ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {metrics.map((metric: any, index: number) => (
              <MetricCard key={metric.label} {...metric} className="admin-enter" style={{ animationDelay: `${index * 80}ms` }} />
            ))}
          </div>

          <div className="grid gap-6 2xl:grid-cols-[1.08fr_0.92fr]">
            <div className="grid gap-6">
              <Surface glow="cyan" className="p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge tone={user360.user.role === "SUPERADMIN" ? "rose" : user360.user.role === "ADMIN" ? "cyan" : "slate"}>{user360.user.role}</StatusBadge>
                      <StatusBadge tone={user360.user.isVerified ? "emerald" : "amber"}>{user360.user.isVerified ? "verified" : "unverified"}</StatusBadge>
                      <StatusBadge tone={user360.user.isBanned ? "rose" : "emerald"}>{user360.user.isBanned ? "banned" : "active"}</StatusBadge>
                    </div>
                    <h2 className="mt-4 text-2xl font-semibold text-white">{user360.user.fullName}</h2>
                    <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">{user360.user.email}</p>
                  </div>
                  <StatusBadge tone="slate">{user360.institution.code}</StatusBadge>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <DetailCard label="Joined" value={formatDateTime(user360.user.createdAt)} helper={`Updated ${formatDateTime(user360.user.updatedAt)}`} />
                  <DetailCard label="Target score" value={user360.user.targetScore ? String(user360.user.targetScore) : "Not set"} helper={user360.user.aspiringCourse ?? "No aspiring course"} />
                  <DetailCard label="Email preference" value={user360.user.emailUnsubscribed ? "Unsubscribed" : "Subscribed"} />
                  <DetailCard label="Ban reason" value={user360.user.bannedReason ?? "No ban reason"} helper={user360.user.bannedAt ? formatDateTime(user360.user.bannedAt) : "Not banned"} />
                </div>
              </Surface>

              <Surface className="p-6">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[color:var(--accent-emerald)]">Engagement</p>
                  <h2 className="mt-2 text-xl font-semibold text-white">Study footprint</h2>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <DetailCard label="Total SP" value={formatInteger(user360.engagement.totalSp)} />
                  <DetailCard label="Weekly SP" value={formatInteger(user360.engagement.weeklySp)} />
                  <DetailCard label="Bookmarks" value={formatInteger(user360.engagement.bookmarkedQuestions)} helper={`${formatInteger(user360.engagement.questionReportsSubmitted)} reports submitted`} />
                  <DetailCard label="AI today" value={formatInteger(user360.engagement.aiExplanationsUsedToday)} />
                  <DetailCard label="Real exams" value={formatInteger(user360.engagement.realExamsCompleted)} />
                  <DetailCard label="Collab exams" value={formatInteger(user360.engagement.completedCollaborationExams)} />
                  <DetailCard label="Last study" value={user360.engagement.lastStudyActivityDate ? formatDateTime(user360.engagement.lastStudyActivityDate) : "Unavailable"} />
                  <DetailCard label="Free exam taken" value={user360.engagement.hasTakenFreeExam ? "Yes" : "No"} />
                </div>
              </Surface>

              <Surface className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[color:var(--accent-cyan)]">Recent activity</p>
                    <h2 className="mt-2 text-xl font-semibold text-white">Exams, bookmarks, and collaboration</h2>
                  </div>
                  <StatusBadge tone="cyan">
                    {formatInteger(user360.recent.exams.length + user360.recent.bookmarks.length + user360.recent.collaborationSessions.length)} items
                  </StatusBadge>
                </div>

                <div className="mt-5 grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
                  <div>
                    <p className="text-sm font-semibold text-white">Recent exams</p>
                    <div className="mt-3 space-y-3">
                      {user360.recent.exams.length ? user360.recent.exams.map((exam: any) => (
                        <div key={exam.id} className="rounded-xl border border-white/8 bg-black/10 p-4">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <StatusBadge tone={exam.status === "COMPLETED" ? "emerald" : "amber"}>{exam.status}</StatusBadge>
                              {exam.isCollaboration ? <StatusBadge tone="cyan">collaboration</StatusBadge> : null}
                            </div>
                            <p className="text-xs text-[color:var(--muted-foreground)]">{formatDateTime(exam.startedAt)}</p>
                          </div>
                          <p className="mt-3 text-sm font-semibold text-white">{exam.examType}</p>
                          <p className="mt-1 text-xs text-[color:var(--muted-foreground)]">
                            Score {formatInteger(exam.score)}{typeof exam.percentage === "number" ? ` · ${exam.percentage}%` : ""}
                          </p>
                        </div>
                      )) : <EmptyCard>No recent exams for this institution scope.</EmptyCard>}
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <p className="text-sm font-semibold text-white">Recent bookmarks</p>
                      <div className="mt-3 space-y-3">
                        {user360.recent.bookmarks.length ? user360.recent.bookmarks.map((bookmark: any) => (
                          <div key={bookmark.id} className="rounded-xl border border-white/8 bg-black/10 p-4">
                            <p className="text-sm font-semibold text-white">{bookmark.subject}</p>
                            <p className="mt-1 text-xs text-[color:var(--muted-foreground)]">Question #{bookmark.questionId}</p>
                            <p className="mt-2 text-xs text-[color:var(--muted-foreground)]">Saved {formatDateTime(bookmark.createdAt)}</p>
                          </div>
                        )) : <EmptyCard>No recent bookmarks.</EmptyCard>}
                      </div>
                    </div>

                    <div>
                      <p className="text-sm font-semibold text-white">Recent collaboration sessions</p>
                      <div className="mt-3 space-y-3">
                        {user360.recent.collaborationSessions.length ? user360.recent.collaborationSessions.map((session: any) => (
                          <div key={`${session.role}-${session.sessionId}`} className="rounded-xl border border-white/8 bg-black/10 p-4">
                            <div className="flex flex-wrap items-center gap-2">
                              <StatusBadge tone={session.role === "HOST" ? "cyan" : "amber"}>{session.role}</StatusBadge>
                              <StatusBadge tone="slate">{session.status}</StatusBadge>
                            </div>
                            <p className="mt-3 text-sm font-semibold text-white">{session.sessionCode}</p>
                            <p className="mt-1 text-xs text-[color:var(--muted-foreground)]">{session.sessionType}</p>
                          </div>
                        )) : <EmptyCard>No recent collaboration activity.</EmptyCard>}
                      </div>
                    </div>
                  </div>
                </div>
              </Surface>
            </div>

            <div className="grid gap-6">
              <Surface glow="amber" className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[color:var(--accent-amber)]">Premium</p>
                    <h2 className="mt-2 text-xl font-semibold text-white">Coverage snapshot</h2>
                  </div>
                  <StatusBadge tone={user360.premium.isPremium ? "emerald" : "slate"}>{user360.premium.isPremium ? "premium active" : "free tier"}</StatusBadge>
                </div>

                <div className="mt-5 space-y-3">
                  <DetailCard label="Coverage ends" value={user360.premium.coverage.effectiveEndDate ? formatDateTime(user360.premium.coverage.effectiveEndDate) : "No end date"} helper={user360.premium.coverage.activeSourceTypes.join(", ") || "No premium source"} />
                  <DetailCard label="Device access mode" value={user360.premium.deviceAccessMode} helper={user360.premium.subscription?.provider ?? "No provider"} />
                  <DetailCard label="Latest payment" value={user360.premium.latestSuccessfulPayment ? formatCurrencyNaira(user360.premium.latestSuccessfulPayment.amountPaid) : "Unavailable"} helper={user360.premium.latestSuccessfulPayment ? `${user360.premium.latestSuccessfulPayment.provider} · ${formatDateTime(user360.premium.latestSuccessfulPayment.paidAt)}` : "No successful payment record"} />
                </div>
              </Surface>

              {isSuperadmin && (
                <PremiumActionPanel
                  userId={userId}
                  userName={user360.user.fullName}
                  isPremium={user360.premium.isPremium}
                  isStepUpActive={isStepUpActive}
                  stepUpToken={stepUp?.stepUpToken}
                  stepUpRedirectUrl={`/users/${userId}`}
                  compact
                />
              )}

              <Surface glow="cyan" className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[color:var(--accent-cyan)]">Security</p>
                    <h2 className="mt-2 text-xl font-semibold text-white">Sessions and devices</h2>
                  </div>
                  <StatusBadge tone="cyan">{formatInteger(user360.security.activeSessionsCount)} sessions</StatusBadge>
                </div>

                <textarea rows={3} value={deviceReason} onChange={(event) => setDeviceReason(event.target.value)} placeholder="Optional reason saved with a device removal..." className="mt-5 w-full rounded-xl border border-white/8 bg-black/10 px-4 py-3 text-sm text-white outline-none transition placeholder:text-[color:var(--muted-foreground)]/50 focus:border-[color:var(--accent-cyan)]/40" />

                <div className="mt-4 space-y-3">
                  {user360.security.registeredDevices.length ? user360.security.registeredDevices.map((device: any) => (
                    <div key={device.deviceId} className="rounded-xl border border-white/8 bg-black/10 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <StatusBadge tone={device.isActive ? "emerald" : "slate"}>{device.isActive ? "active" : "inactive"}</StatusBadge>
                            <StatusBadge tone={device.isVerified ? "cyan" : "amber"}>{device.isVerified ? "verified" : "pending"}</StatusBadge>
                          </div>
                          <p className="mt-3 text-sm font-semibold text-white">{device.deviceName}</p>
                          <p className="mt-1 break-all text-xs text-[color:var(--muted-foreground)]">{device.deviceId}</p>
                        </div>
                        <button type="button" onClick={() => removeDeviceMutation.mutate(device.deviceId)} disabled={removeDeviceMutation.isPending} className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white transition hover:border-white/20 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50">
                          {removeDeviceMutation.isPending ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <ShieldOff className="h-3.5 w-3.5" />}
                          Remove
                        </button>
                      </div>
                    </div>
                  )) : <EmptyCard>No registered devices found.</EmptyCard>}
                </div>
              </Surface>

              <Surface glow="rose" className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[color:var(--accent-rose)]">Moderation</p>
                    <h2 className="mt-2 text-xl font-semibold text-white">Account controls</h2>
                  </div>
                  <StatusBadge tone={isStepUpActive ? "emerald" : "amber"}>
                    {isStepUpActive ? "step-up active" : "step-up inactive"}
                  </StatusBadge>
                </div>

                <div className="mt-5 space-y-4">
                  <div className="rounded-xl border border-white/8 bg-black/10 p-4">
                    <p className="text-xs text-[color:var(--muted-foreground)]">Moderation note</p>
                    <textarea rows={3} value={moderationReason} onChange={(event) => setModerationReason(event.target.value)} placeholder="Optional note for support or abuse handling..." className="mt-2 w-full rounded-xl border border-white/8 bg-black/15 px-4 py-3 text-sm text-white outline-none transition placeholder:text-[color:var(--muted-foreground)]/50 focus:border-[color:var(--accent-cyan)]/40" />
                    <button type="button" onClick={() => (user360.user.isBanned ? unbanMutation.mutate() : banMutation.mutate())} disabled={banMutation.isPending || unbanMutation.isPending} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[color:var(--accent-rose)] px-4 py-3 text-sm font-semibold text-[color:var(--background)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">
                      {banMutation.isPending || unbanMutation.isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
                      {user360.user.isBanned ? "Unban user" : "Ban user"}
                    </button>
                  </div>

                  {isSuperadmin ? (
                    <div className="rounded-xl border border-white/8 bg-black/10 p-4">
                      <p className="text-xs text-[color:var(--muted-foreground)]">Role change note</p>
                      <textarea rows={3} value={roleReason} onChange={(event) => setRoleReason(event.target.value)} placeholder="Optional note for this role change..." className="mt-2 w-full rounded-xl border border-white/8 bg-black/15 px-4 py-3 text-sm text-white outline-none transition placeholder:text-[color:var(--muted-foreground)]/50 focus:border-[color:var(--accent-cyan)]/40" />
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        {user360.user.role === "USER" ? (
                          <>
                            <button type="button" onClick={() => promoteMutation.mutate("ADMIN")} disabled={!isStepUpActive || promoteMutation.isPending} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[color:var(--accent-cyan)] px-4 py-3 text-sm font-semibold text-[color:var(--background)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">
                              {promoteMutation.isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                              Promote to admin
                            </button>
                            <button type="button" onClick={() => promoteMutation.mutate("SUPERADMIN")} disabled={!isStepUpActive || promoteMutation.isPending} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[color:var(--accent-amber)] px-4 py-3 text-sm font-semibold text-[color:var(--background)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">
                              {promoteMutation.isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Crown className="h-4 w-4" />}
                              Promote to superadmin
                            </button>
                          </>
                        ) : (
                          <button type="button" onClick={() => demoteMutation.mutate()} disabled={!isStepUpActive || demoteMutation.isPending} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50 sm:col-span-2">
                            {demoteMutation.isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ShieldOff className="h-4 w-4" />}
                            Demote to user
                          </button>
                        )}
                      </div>

                      {!isStepUpActive ? (
                        <Link href={`/step-up?next=/users/${userId}&intent=User%20role%20management`} className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-[color:var(--accent-cyan)]">
                          Complete step-up to unlock role changes
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </Surface>

              <Surface className="p-6">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[color:var(--accent-cyan)]">Audit trail</p>
                  <h2 className="mt-2 text-xl font-semibold text-white">Recent admin and auth events</h2>
                </div>

                <div className="mt-5 space-y-3">
                  {user360.security.recentAdminActions.length ? user360.security.recentAdminActions.map((action: any, index: number) => (
                    <div key={`${action.action}-${index}`} className="rounded-xl border border-white/8 bg-black/10 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <StatusBadge tone="slate">{action.action.replaceAll("_", " ")}</StatusBadge>
                        <p className="text-xs text-[color:var(--muted-foreground)]">{formatDateTime(action.createdAt)}</p>
                      </div>
                      <p className="mt-2 text-xs text-[color:var(--muted-foreground)]">Actor #{action.actorId} · {action.actorRole}{action.reason ? ` · ${action.reason}` : ""}</p>
                    </div>
                  )) : <EmptyCard>No recent admin actions for this user.</EmptyCard>}
                </div>

                <div className="mt-5 space-y-3">
                  {user360.security.recentAuditEvents.length ? user360.security.recentAuditEvents.map((event: any, index: number) => (
                    <div key={`${event.action}-${index}`} className="rounded-xl border border-white/8 bg-black/10 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <StatusBadge tone="cyan">{event.action.replaceAll("_", " ")}</StatusBadge>
                        <p className="text-xs text-[color:var(--muted-foreground)]">{formatDateTime(event.createdAt)}</p>
                      </div>
                      <p className="mt-2 text-xs text-[color:var(--muted-foreground)]">Device {event.deviceId ?? "Unavailable"} · IP {event.ipAddress ?? "Unavailable"}</p>
                    </div>
                  )) : <EmptyCard>No recent auth or device events.</EmptyCard>}
                </div>
              </Surface>
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
}
