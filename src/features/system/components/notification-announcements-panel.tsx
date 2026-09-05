"use client";

import { ApiErrorMessage } from "@/components/ui/api-error-message";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { CustomSelect } from "@/components/ui/custom-select";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Field, FieldShell, TextArea } from "@/components/ui/field";
import { SectionTitle } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { FilterChips, Pagination } from "@/components/ui/toolbar";
import { useAdminStepUp } from "@/features/admin-auth/hooks/use-admin-step-up";
import { adminSystemApi } from "@/lib/api/admin-system";
import type {
  AdminCreateNotificationAnnouncementPayload,
  AdminNotificationAnnouncement,
  AdminNotificationAnnouncementsFilter,
} from "@/lib/api/types";
import { formatDateTime } from "@/lib/utils/format";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Megaphone, Send, ShieldCheck, SquareX } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

/**
 * Compose and schedule in-app announcements.
 *
 * This panel was written in the vocabulary of the people who built it. The
 * heading read "Ops announcement composer", the description promised
 * updates "without fan-out writes to every user row" with targeting that
 * "stays lazy and read-time aware", and a footer card titled "Guardrails
 * stay on" explained that "production stays protected from mass insert
 * fan-out". None of that is about the task, and none of it means anything
 * to the person writing a message to learners. It is now described in terms
 * of what the announcement does and who will see it.
 *
 * Two other things:
 *
 * 1. The three counters above the list ("Active", "Scheduled", "Cancelled")
 *    were computed from `listData.items` — the eight rows on the current
 *    page — but presented as totals. On page 2 they described page 2. They
 *    are gone; the status filter plus the pagination total answers the same
 *    question honestly.
 *
 * 2. Publishing sends a message to every targeted learner and cancelling
 *    pulls a live one. Both fired on a single click.
 */

const FILTERS: Array<{
  value: AdminNotificationAnnouncementsFilter;
  label: string;
}> = [
  { value: "all", label: "All" },
  { value: "active", label: "Live now" },
  { value: "scheduled", label: "Scheduled" },
  { value: "expired", label: "Expired" },
  { value: "cancelled", label: "Cancelled" },
];

const AUDIENCE_OPTIONS = [
  { value: "ALL", label: "Everyone" },
  { value: "PREMIUM", label: "Premium learners only" },
  { value: "FREE", label: "Free learners only" },
];

const PRIORITY_OPTIONS = [
  { value: "DEFAULT", label: "Normal" },
  { value: "HIGH", label: "High" },
];

function toDateTimeLocalValue(date: Date) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60_000);
}

function toIsoDateTime(value: string) {
  return new Date(value).toISOString();
}

function getAnnouncementState(announcement: AdminNotificationAnnouncement): {
  label: string;
  tone: BadgeTone;
} {
  const now = Date.now();
  const startAt = new Date(announcement.startAt).getTime();
  const expiresAt = announcement.expiresAt
    ? new Date(announcement.expiresAt).getTime()
    : null;

  if (announcement.cancelledAt) return { label: "Cancelled", tone: "neutral" };
  if (startAt > now) return { label: "Scheduled", tone: "info" };
  if (expiresAt !== null && expiresAt <= now)
    return { label: "Expired", tone: "neutral" };
  return { label: "Live now", tone: "success" };
}

function Meta({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="rounded-[var(--sb-radius)] border border-[var(--sb-border)] bg-[var(--sb-bg-inset)] px-3 py-2">
      <p className="text-[length:var(--sb-text-xs)] text-[var(--sb-text-tertiary)]">
        {label}
      </p>
      <p className="mt-0.5 truncate text-[length:var(--sb-text-sm)] text-[var(--sb-text)]">
        {value}
      </p>
    </div>
  );
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
    useState<AdminCreateNotificationAnnouncementPayload["targetAudience"]>(
      "ALL",
    );
  const [institutionCode, setInstitutionCode] = useState("");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [startAt, setStartAt] = useState(() =>
    toDateTimeLocalValue(addMinutes(new Date(), 10)),
  );
  const [expiresAt, setExpiresAt] = useState(() =>
    toDateTimeLocalValue(addMinutes(new Date(), 2880)),
  );

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

  function resetForm() {
    setTitle("");
    setBody("");
    setDeeplink("");
    setPriority("DEFAULT");
    setTargetAudience("ALL");
    setInstitutionCode("");
    setVerifiedOnly(false);
    setStartAt(toDateTimeLocalValue(addMinutes(new Date(), 10)));
    setExpiresAt(toDateTimeLocalValue(addMinutes(new Date(), 2880)));
  }

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!stepUp?.stepUpToken) throw new Error("Step-up verification required.");

      const trimmedTitle = title.trim();
      const trimmedBody = body.trim();
      if (!trimmedTitle || !trimmedBody) {
        throw new Error("A title and a message are both required.");
      }

      const startDate = new Date(startAt);
      const expiryDate = expiresAt ? new Date(expiresAt) : null;
      if (Number.isNaN(startDate.getTime())) {
        throw new Error("Choose a valid start time.");
      }
      if (expiryDate && Number.isNaN(expiryDate.getTime())) {
        throw new Error("Choose a valid end time.");
      }
      if (expiryDate && expiryDate.getTime() <= startDate.getTime()) {
        throw new Error("The end time has to be after the start time.");
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
        { stepUpToken: stepUp.stepUpToken },
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
      toast.error("Could not schedule this announcement", {
        description: (
          <ApiErrorMessage
            error={error}
            fallback="Check the fields and try again."
          />
        ),
      });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (announcementId: string) => {
      if (!stepUp?.stepUpToken) throw new Error("Step-up verification required.");
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
      toast.error("Could not cancel this announcement", {
        description: (
          <ApiErrorMessage error={error} fallback="Please try again." />
        ),
      });
    },
  });

  const audienceLabel =
    AUDIENCE_OPTIONS.find((option) => option.value === targetAudience)?.label ??
    "Everyone";

  const canPublish =
    isStepUpActive && title.trim() && body.trim() && !createMutation.isPending;

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      {/* ══ Compose ═══════════════════════════════════════ */}
      <section className="min-w-0 space-y-3">
        <SectionTitle
          title="Write an announcement"
          description="Appears in the app for the learners you target, between the times you set."
          action={
            <Badge tone={isStepUpActive ? "success" : "warning"} dot>
              {isStepUpActive ? "Verified" : "Step-up needed"}
            </Badge>
          }
        />

        <div className="space-y-4 rounded-[var(--sb-radius-lg)] border border-[var(--sb-border)] bg-[var(--sb-surface-1)] p-4 sm:p-5">
          <Field
            label="Title"
            hint={`${title.length}/120`}
            value={title}
            maxLength={120}
            disabled={createMutation.isPending}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Leaderboard results are delayed"
          />

          <TextArea
            label="Message"
            hint={`${body.length}/4000`}
            rows={5}
            value={body}
            maxLength={4000}
            disabled={createMutation.isPending}
            onChange={(event) => setBody(event.target.value)}
            placeholder="Say what changed, who it affects, and what they should do."
          />

          <Field
            label="Link"
            hint="Optional"
            value={deeplink}
            disabled={createMutation.isPending}
            onChange={(event) => setDeeplink(event.target.value)}
            placeholder="/dashboard/history"
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <FieldShell label="Who sees it">
              <CustomSelect
                aria-label="Who sees this announcement"
                value={targetAudience}
                onValueChange={(value) =>
                  setTargetAudience(
                    value as AdminCreateNotificationAnnouncementPayload["targetAudience"],
                  )
                }
                options={AUDIENCE_OPTIONS}
                disabled={createMutation.isPending}
              />
            </FieldShell>

            <FieldShell label="Priority">
              <CustomSelect
                aria-label="Priority"
                value={priority}
                onValueChange={(value) =>
                  setPriority(
                    value as AdminCreateNotificationAnnouncementPayload["priority"],
                  )
                }
                options={PRIORITY_OPTIONS}
                disabled={createMutation.isPending}
              />
            </FieldShell>

            <Field
              label="Institution"
              hint="Blank means all"
              value={institutionCode}
              disabled={createMutation.isPending}
              onChange={(event) => setInstitutionCode(event.target.value)}
              placeholder="OAU"
            />

            <FieldShell label="Verified accounts">
              <label className="flex h-9 cursor-pointer items-center gap-2.5">
                <input
                  type="checkbox"
                  checked={verifiedOnly}
                  disabled={createMutation.isPending}
                  onChange={(event) => setVerifiedOnly(event.target.checked)}
                  className="h-4 w-4 accent-[var(--sb-accent)]"
                />
                <span className="text-[length:var(--sb-text-sm)] text-[var(--sb-text-secondary)]">
                  Only verified emails
                </span>
              </label>
            </FieldShell>

            <Field
              label="Starts"
              type="datetime-local"
              value={startAt}
              disabled={createMutation.isPending}
              onChange={(event) => setStartAt(event.target.value)}
            />

            <Field
              label="Ends"
              hint="Optional"
              type="datetime-local"
              value={expiresAt}
              min={startAt || undefined}
              disabled={createMutation.isPending}
              onChange={(event) => setExpiresAt(event.target.value)}
            />
          </div>

          {/* Spells out the reach before you commit to it. */}
          <p className="rounded-[var(--sb-radius)] border border-[var(--sb-border)] bg-[var(--sb-bg-inset)] px-3 py-2.5 text-[length:var(--sb-text-sm)] text-[var(--sb-text-secondary)]">
            This will show to{" "}
            <span className="text-[var(--sb-text)]">
              {audienceLabel.toLowerCase()}
            </span>
            {institutionCode.trim()
              ? ` at ${institutionCode.trim().toUpperCase()}`
              : " at every institution"}
            {verifiedOnly ? ", with a verified email" : ""}, from{" "}
            <span className="text-[var(--sb-text)]">
              {startAt ? formatDateTime(startAt) : "—"}
            </span>
            {expiresAt ? ` until ${formatDateTime(expiresAt)}` : " with no end date"}.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <ConfirmButton
              variant="primary"
              confirmLabel="Yes, schedule it"
              onConfirm={() => createMutation.mutate()}
              disabled={!canPublish}
              isLoading={createMutation.isPending}
              icon={<Send className="h-4 w-4" />}
            >
              Schedule announcement
            </ConfirmButton>

            {!isStepUpActive ? (
              <Button
                asChild
                href="/step-up?next=/settings&intent=Announcements"
                variant="secondary"
                size="sm"
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                Verify first
              </Button>
            ) : !title.trim() || !body.trim() ? (
              <p className="text-[length:var(--sb-text-xs)] text-[var(--sb-text-tertiary)]">
                A title and a message are both needed.
              </p>
            ) : null}
          </div>
        </div>
      </section>

      {/* ══ Existing announcements ════════════════════════ */}
      <section className="min-w-0 space-y-3">
        <SectionTitle
          title="Announcements"
          description="Everything scheduled, live, or finished."
        />

        <FilterChips
          options={FILTERS.map((filter) => ({
            label: filter.label,
            value: filter.value,
          }))}
          value={statusFilter}
          onChange={(value) => {
            setStatusFilter(value as AdminNotificationAnnouncementsFilter);
            setPage(1);
          }}
        />

        <div className="space-y-2.5">
          {announcementsQuery.isLoading ? (
            Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-40 w-full" />
            ))
          ) : announcementsQuery.isError ? (
            <ErrorState
              title="Could not load announcements"
              error={announcementsQuery.error}
              onRetry={() => announcementsQuery.refetch()}
            />
          ) : listData?.items.length ? (
            listData.items.map((announcement) => {
              const state = getAnnouncementState(announcement);
              const canCancel = !announcement.cancelledAt;

              return (
                <article
                  key={announcement.id}
                  className="rounded-[var(--sb-radius-lg)] border border-[var(--sb-border)] bg-[var(--sb-surface-1)] p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="text-[length:var(--sb-text-md)] font-medium text-[var(--sb-text)]">
                          {announcement.title}
                        </p>
                        <Badge tone={state.tone}>{state.label}</Badge>
                        {announcement.priority === "HIGH" ? (
                          <Badge tone="warning">High priority</Badge>
                        ) : null}
                      </div>
                      <p className="mt-1.5 text-[length:var(--sb-text-sm)] leading-relaxed text-[var(--sb-text-secondary)]">
                        {announcement.body}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <Meta
                      label="Audience"
                      value={
                        AUDIENCE_OPTIONS.find(
                          (option) =>
                            option.value === announcement.targetAudience,
                        )?.label ?? announcement.targetAudience
                      }
                    />
                    <Meta
                      label="Institution"
                      value={
                        announcement.institutionCode
                          ? `${announcement.institutionCode}${
                              announcement.institutionName
                                ? ` · ${announcement.institutionName}`
                                : ""
                            }`
                          : "All institutions"
                      }
                    />
                    <Meta
                      label="Starts"
                      value={formatDateTime(announcement.startAt)}
                    />
                    <Meta
                      label="Ends"
                      value={
                        announcement.expiresAt
                          ? formatDateTime(announcement.expiresAt)
                          : "No end date"
                      }
                    />
                  </div>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-[length:var(--sb-text-xs)] text-[var(--sb-text-tertiary)]">
                      Created {formatDateTime(announcement.createdAt)}
                      {announcement.deeplink
                        ? ` · links to ${announcement.deeplink}`
                        : ""}
                    </p>

                    {canCancel ? (
                      <ConfirmButton
                        variant="danger"
                        size="sm"
                        confirmLabel="Yes, cancel it"
                        onConfirm={() => cancelMutation.mutate(announcement.id)}
                        disabled={!isStepUpActive || cancelMutation.isPending}
                        isLoading={cancelMutation.isPending}
                        icon={<SquareX className="h-3.5 w-3.5" />}
                      >
                        Cancel
                      </ConfirmButton>
                    ) : null}
                  </div>
                </article>
              );
            })
          ) : (
            <div className="rounded-[var(--sb-radius-lg)] border border-[var(--sb-border)] bg-[var(--sb-surface-1)]">
              <EmptyState
                icon={<Megaphone className="h-4 w-4" />}
                title="Nothing here"
                description={
                  statusFilter === "all"
                    ? "No announcements have been written yet."
                    : "Nothing matches this filter. Try All."
                }
              />
            </div>
          )}
        </div>

        {listData?.pagination ? (
          <Pagination
            page={listData.pagination.page}
            totalPages={listData.pagination.totalPages}
            total={listData.pagination.total}
            pageSize={listData.pagination.limit}
            onPageChange={setPage}
          />
        ) : null}
      </section>
    </div>
  );
}
