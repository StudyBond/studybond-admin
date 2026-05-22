"use client";

import { ApiErrorMessage } from "@/components/ui/api-error-message";
import { StatusBadge } from "@/components/ui/status-badge";
import { Surface } from "@/components/ui/surface";
import { useAdminStepUp } from "@/features/admin-auth/hooks/use-admin-step-up";
import { adminSystemApi } from "@/lib/api/admin-system";
import type {
  AdminCreateNotificationAnnouncementPayload,
  AdminNotificationAnnouncement,
  AdminNotificationAnnouncementsFilter,
} from "@/lib/api/types";
import { formatDateTime } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarClock,
  Loader2,
  Megaphone,
  Send,
  ShieldCheck,
  ShieldOff,
  SquareX,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";

const FILTERS: Array<{
  value: AdminNotificationAnnouncementsFilter;
  label: string;
}> = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "scheduled", label: "Scheduled" },
  { value: "expired", label: "Expired" },
  { value: "cancelled", label: "Cancelled" },
];

function toDateTimeLocalValue(date: Date) {
  return new Date(date.getTime() - (date.getTimezoneOffset() * 60_000))
    .toISOString()
    .slice(0, 16);
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + (minutes * 60_000));
}

function toIsoDateTime(value: string) {
  return new Date(value).toISOString();
}

function getAnnouncementState(announcement: AdminNotificationAnnouncement) {
  const now = Date.now();
  const startAt = new Date(announcement.startAt).getTime();
  const expiresAt = announcement.expiresAt ? new Date(announcement.expiresAt).getTime() : null;

  if (announcement.cancelledAt) {
    return { label: "Cancelled", tone: "rose" as const };
  }

  if (startAt > now) {
    return { label: "Scheduled", tone: "amber" as const };
  }

  if (expiresAt !== null && expiresAt <= now) {
    return { label: "Expired", tone: "slate" as const };
  }

  return { label: "Active", tone: "emerald" as const };
}

export function NotificationAnnouncementsPanel() {
  const queryClient = useQueryClient();
  const { isActive: isStepUpActive, stepUp } = useAdminStepUp();

  const [statusFilter, setStatusFilter] =
    useState<AdminNotificationAnnouncementsFilter>("all");
  const [page, setPage] = useState(1);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [deeplink, setDeeplink] = useState("");
  const [priority, setPriority] =
    useState<AdminCreateNotificationAnnouncementPayload["priority"]>("DEFAULT");
  const [targetAudience, setTargetAudience] =
    useState<AdminCreateNotificationAnnouncementPayload["targetAudience"]>("ALL");
  const [institutionCode, setInstitutionCode] = useState("");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [startAt, setStartAt] = useState(() => toDateTimeLocalValue(addMinutes(new Date(), 10)));
  const [expiresAt, setExpiresAt] = useState(() => toDateTimeLocalValue(addMinutes(new Date(), 2880)));

  const announcementsQuery = useQuery({
    queryKey: ["admin", "notification-announcements", statusFilter, page],
    queryFn: () =>
      adminSystemApi.getNotificationAnnouncements({
        status: statusFilter,
        page,
        limit: 8,
      }),
    staleTime: 15_000,
  });

  const listData = announcementsQuery.data;

  const resetForm = () => {
    setTitle("");
    setBody("");
    setDeeplink("");
    setPriority("DEFAULT");
    setTargetAudience("ALL");
    setInstitutionCode("");
    setVerifiedOnly(false);
    setStartAt(toDateTimeLocalValue(addMinutes(new Date(), 10)));
    setExpiresAt(toDateTimeLocalValue(addMinutes(new Date(), 2880)));
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!stepUp?.stepUpToken) {
        throw new Error("Step-up verification required.");
      }

      const trimmedTitle = title.trim();
      const trimmedBody = body.trim();
      if (!trimmedTitle || !trimmedBody) {
        throw new Error("Title and body are required.");
      }

      const startDate = new Date(startAt);
      const expiryDate = expiresAt ? new Date(expiresAt) : null;
      if (Number.isNaN(startDate.getTime())) {
        throw new Error("Choose a valid start time.");
      }
      if (expiryDate && Number.isNaN(expiryDate.getTime())) {
        throw new Error("Choose a valid expiry time.");
      }
      if (expiryDate && expiryDate.getTime() <= startDate.getTime()) {
        throw new Error("Expiry must be later than the start time.");
      }

      return adminSystemApi.createNotificationAnnouncement(
        {
          title: trimmedTitle,
          body: trimmedBody,
          deeplink: deeplink.trim() || null,
          priority,
          targetAudience,
          institutionCode: institutionCode.trim().toUpperCase() || null,
          verifiedOnly,
          startAt: toIsoDateTime(startAt),
          expiresAt: expiresAt ? toIsoDateTime(expiresAt) : null,
        },
        {
          stepUpToken: stepUp.stepUpToken,
        }
      );
    },
    onSuccess: async () => {
      toast.success("Announcement scheduled");
      resetForm();
      setPage(1);
      await queryClient.invalidateQueries({
        queryKey: ["admin", "notification-announcements"],
      });
    },
    onError: (error) => {
      toast.error("Could not publish announcement", {
        description: <ApiErrorMessage error={error} fallback="Please review the announcement fields." />,
      });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (announcementId: string) => {
      if (!stepUp?.stepUpToken) {
        throw new Error("Step-up verification required.");
      }

      return adminSystemApi.cancelNotificationAnnouncement(announcementId, {
        stepUpToken: stepUp.stepUpToken,
      });
    },
    onSuccess: async () => {
      toast.success("Announcement cancelled");
      await queryClient.invalidateQueries({
        queryKey: ["admin", "notification-announcements"],
      });
    },
    onError: (error) => {
      toast.error("Could not cancel announcement", {
        description: <ApiErrorMessage error={error} fallback="Please try again." />,
      });
    },
  });

  const summary = useMemo(() => {
    const items = listData?.items ?? [];
    return {
      active: items.filter((item) => getAnnouncementState(item).label === "Active").length,
      scheduled: items.filter((item) => getAnnouncementState(item).label === "Scheduled").length,
      cancelled: items.filter((item) => getAnnouncementState(item).label === "Cancelled").length,
    };
  }, [listData]);

  return (
    <div className="grid gap-6 xl:grid-cols-[1.02fr_0.98fr]">
      <Surface className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[color:var(--accent-cyan)]">
              Notifications
            </p>
            <h3 className="mt-2 text-xl font-semibold text-white">Ops announcement composer</h3>
            <p className="mt-2 max-w-2xl text-sm text-[color:var(--muted-foreground)]">
              Publish high-signal operational updates without fan-out writes to every user row.
              Audience and institution targeting stay lazy and read-time aware.
            </p>
          </div>
          <StatusBadge tone={isStepUpActive ? "emerald" : "amber"}>
            {isStepUpActive ? "Step-up active" : "Step-up required"}
          </StatusBadge>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-[0.14em] text-white/50">
              Title
            </span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={120}
              disabled={createMutation.isPending}
              placeholder="Service maintenance, leaderboard delay, premium access fix..."
              className="w-full rounded-xl border border-white/10 bg-black/20 px-3.5 py-2.5 text-sm text-white outline-none transition hover:border-white/20 focus:border-[color:var(--accent-cyan)]/50"
            />
          </label>

          <label className="space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-[0.14em] text-white/50">
              Deeplink
            </span>
            <input
              value={deeplink}
              onChange={(event) => setDeeplink(event.target.value)}
              disabled={createMutation.isPending}
              placeholder="/dashboard/history"
              className="w-full rounded-xl border border-white/10 bg-black/20 px-3.5 py-2.5 text-sm text-white outline-none transition hover:border-white/20 focus:border-[color:var(--accent-cyan)]/50"
            />
          </label>

          <label className="space-y-1.5 md:col-span-2">
            <span className="text-xs font-medium uppercase tracking-[0.14em] text-white/50">
              Body
            </span>
            <textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              maxLength={4000}
              rows={5}
              disabled={createMutation.isPending}
              placeholder="Explain what changed, who is affected, and where the learner should go next."
              className="w-full rounded-xl border border-white/10 bg-black/20 px-3.5 py-3 text-sm text-white outline-none transition hover:border-white/20 focus:border-[color:var(--accent-cyan)]/50"
            />
          </label>

          <label className="space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-[0.14em] text-white/50">
              Audience
            </span>
            <select
              value={targetAudience}
              onChange={(event) =>
                setTargetAudience(
                  event.target.value as AdminCreateNotificationAnnouncementPayload["targetAudience"]
                )
              }
              disabled={createMutation.isPending}
              className="w-full rounded-xl border border-white/10 bg-black/20 px-3.5 py-2.5 text-sm text-white outline-none transition hover:border-white/20 focus:border-[color:var(--accent-cyan)]/50"
            >
              <option value="ALL">All learners</option>
              <option value="PREMIUM">Premium learners</option>
              <option value="FREE">Free learners</option>
            </select>
          </label>

          <label className="space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-[0.14em] text-white/50">
              Priority
            </span>
            <select
              value={priority}
              onChange={(event) =>
                setPriority(
                  event.target.value as AdminCreateNotificationAnnouncementPayload["priority"]
                )
              }
              disabled={createMutation.isPending}
              className="w-full rounded-xl border border-white/10 bg-black/20 px-3.5 py-2.5 text-sm text-white outline-none transition hover:border-white/20 focus:border-[color:var(--accent-cyan)]/50"
            >
              <option value="LOW">Low</option>
              <option value="DEFAULT">Default</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </label>

          <label className="space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-[0.14em] text-white/50">
              Institution code
            </span>
            <input
              value={institutionCode}
              onChange={(event) =>
                setInstitutionCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))
              }
              disabled={createMutation.isPending}
              placeholder="Optional, e.g. UNILAG"
              className="w-full rounded-xl border border-white/10 bg-black/20 px-3.5 py-2.5 text-sm text-white outline-none transition hover:border-white/20 focus:border-[color:var(--accent-cyan)]/50"
            />
          </label>

          <label className="space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-[0.14em] text-white/50">
              Start time
            </span>
            <input
              type="datetime-local"
              value={startAt}
              onChange={(event) => setStartAt(event.target.value)}
              disabled={createMutation.isPending}
              className="w-full rounded-xl border border-white/10 bg-black/20 px-3.5 py-2.5 text-sm text-white outline-none transition hover:border-white/20 focus:border-[color:var(--accent-cyan)]/50"
            />
          </label>

          <label className="space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-[0.14em] text-white/50">
              Expiry time
            </span>
            <input
              type="datetime-local"
              value={expiresAt}
              onChange={(event) => setExpiresAt(event.target.value)}
              disabled={createMutation.isPending}
              className="w-full rounded-xl border border-white/10 bg-black/20 px-3.5 py-2.5 text-sm text-white outline-none transition hover:border-white/20 focus:border-[color:var(--accent-cyan)]/50"
            />
          </label>
        </div>

        <label className="mt-4 flex items-center gap-3 rounded-xl border border-white/8 bg-black/10 px-4 py-3">
          <input
            type="checkbox"
            checked={verifiedOnly}
            onChange={(event) => setVerifiedOnly(event.target.checked)}
            disabled={createMutation.isPending}
            className="h-4 w-4 rounded border-white/20 bg-black/30 text-[color:var(--accent-cyan)]"
          />
          <div>
            <p className="text-sm font-medium text-white">Verified accounts only</p>
            <p className="text-xs text-[color:var(--muted-foreground)]">
              Keep this announcement restricted to verified learners when needed.
            </p>
          </div>
        </label>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => createMutation.mutate()}
            disabled={!isStepUpActive || createMutation.isPending}
            className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-[color:var(--background)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {createMutation.isPending ? "Publishing..." : "Publish announcement"}
            {createMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>

          <div className="text-xs text-[color:var(--muted-foreground)]">
            Stored as an announcement record only. Receipts are created lazily on learner read or dismiss.
          </div>
        </div>

        {!isStepUpActive ? (
          <Link
            href="/step-up?next=/settings&intent=Notification%20announcements"
            className="mt-5 inline-flex items-center gap-2 rounded-xl border border-[color:var(--accent-amber)]/30 bg-[color:var(--accent-amber)]/10 px-4 py-3 text-sm font-semibold text-white transition hover:border-[color:var(--accent-amber)]/45"
          >
            Complete step-up verification
            <ShieldCheck className="h-4 w-4" />
          </Link>
        ) : null}
      </Surface>

      <div className="grid gap-6">
        <Surface className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[color:var(--accent-emerald)]">
                Registry
              </p>
              <h3 className="mt-2 text-xl font-semibold text-white">Live announcement queue</h3>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <MiniStat label="Active" value={summary.active} />
              <MiniStat label="Scheduled" value={summary.scheduled} />
              <MiniStat label="Cancelled" value={summary.cancelled} />
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {FILTERS.map((filter) => (
              <button
                key={filter.value}
                type="button"
                onClick={() => {
                  setStatusFilter(filter.value);
                  setPage(1);
                }}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] transition",
                  statusFilter === filter.value
                    ? "border-[color:var(--accent-cyan)]/30 bg-[color:var(--accent-cyan)]/10 text-white"
                    : "border-white/10 bg-white/5 text-white/60 hover:border-white/20 hover:text-white"
                )}
              >
                {filter.label}
              </button>
            ))}
          </div>

          <div className="mt-5 space-y-3">
            {announcementsQuery.isLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-[color:var(--accent-cyan)]" />
              </div>
            ) : announcementsQuery.isError ? (
              <div className="rounded-xl border border-[color:var(--accent-rose)]/25 bg-[color:var(--accent-rose)]/10 p-4 text-sm text-white">
                <ApiErrorMessage
                  error={announcementsQuery.error}
                  fallback="Could not load notification announcements."
                />
              </div>
            ) : listData?.items.length ? (
              listData.items.map((announcement) => {
                const state = getAnnouncementState(announcement);
                const canCancel = !announcement.cancelledAt;

                return (
                  <article
                    key={announcement.id}
                    className="rounded-2xl border border-white/8 bg-black/10 p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-white">{announcement.title}</p>
                          <StatusBadge tone={state.tone}>{state.label}</StatusBadge>
                          <StatusBadge tone="slate">{announcement.priority}</StatusBadge>
                        </div>
                        <p className="mt-2 text-sm leading-relaxed text-[color:var(--muted-foreground)]">
                          {announcement.body}
                        </p>
                      </div>

                      <span className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-[color:var(--accent-cyan)]">
                        <Megaphone className="h-4 w-4" />
                      </span>
                    </div>

                    <div className="mt-4 grid gap-2 text-xs text-[color:var(--muted-foreground)] sm:grid-cols-2">
                      <MetaLine label="Audience" value={announcement.targetAudience} />
                      <MetaLine
                        label="Institution"
                        value={
                          announcement.institutionCode
                            ? `${announcement.institutionCode}${announcement.institutionName ? ` · ${announcement.institutionName}` : ""}`
                            : "All institutions"
                        }
                      />
                      <MetaLine label="Starts" value={formatDateTime(announcement.startAt)} />
                      <MetaLine
                        label="Expires"
                        value={announcement.expiresAt ? formatDateTime(announcement.expiresAt) : "No expiry"}
                      />
                      <MetaLine label="Verified only" value={announcement.verifiedOnly ? "Yes" : "No"} />
                      <MetaLine
                        label="Deep link"
                        value={announcement.deeplink ? announcement.deeplink : "None"}
                      />
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-xs text-[color:var(--muted-foreground)]">
                        <CalendarClock className="h-3.5 w-3.5" />
                        Created {formatDateTime(announcement.createdAt)}
                      </div>

                      <button
                        type="button"
                        onClick={() => cancelMutation.mutate(announcement.id)}
                        disabled={!canCancel || !isStepUpActive || cancelMutation.isPending}
                        className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-white transition hover:border-white/20 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        {cancelMutation.isPending ? "Cancelling..." : "Cancel"}
                        {cancelMutation.isPending ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <SquareX className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </article>
                );
              })
            ) : (
              <div className="rounded-2xl border border-white/8 bg-black/10 px-4 py-8 text-center text-sm text-[color:var(--muted-foreground)]">
                No announcements match this filter yet.
              </div>
            )}
          </div>

          <div className="mt-5 flex items-center justify-between border-t border-white/8 pt-4 text-sm text-[color:var(--muted-foreground)]">
            <span>
              Page {listData?.pagination.page ?? 1} of {listData?.pagination.totalPages ?? 1}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPage((value) => Math.max(1, value - 1))}
                disabled={page <= 1}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-white transition hover:border-white/20 hover:bg-white/10 disabled:opacity-40"
              >
                Prev
              </button>
              <button
                type="button"
                onClick={() =>
                  setPage((value) =>
                    Math.min(listData?.pagination.totalPages ?? 1, value + 1)
                  )
                }
                disabled={page >= (listData?.pagination.totalPages ?? 1)}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-white transition hover:border-white/20 hover:bg-white/10 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </Surface>

        <Surface className="p-6">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-[color:var(--accent-cyan)]">
              {isStepUpActive ? (
                <ShieldCheck className="h-4 w-4" />
              ) : (
                <ShieldOff className="h-4 w-4" />
              )}
            </span>
            <div>
              <p className="text-sm font-semibold text-white">Guardrails stay on</p>
              <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">
                Creation and cancellation both require step-up verification and write an audit log.
                Announcement visibility is computed at read time, so production stays protected from
                mass insert fan-out.
              </p>
            </div>
          </div>
        </Surface>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: Readonly<{ label: string; value: number }>) {
  return (
    <div className="rounded-xl border border-white/8 bg-black/10 px-3 py-2">
      <p className="text-[10px] uppercase tracking-[0.14em] text-[color:var(--muted-foreground)]">
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}

function MetaLine({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="rounded-xl border border-white/6 bg-white/[0.02] px-3 py-2">
      <p className="text-[10px] uppercase tracking-[0.14em] text-white/35">{label}</p>
      <p className="mt-1 text-sm text-white/75">{value}</p>
    </div>
  );
}
