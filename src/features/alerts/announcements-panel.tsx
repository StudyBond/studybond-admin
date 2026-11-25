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
import { useAdminInstitutions } from "@/features/institutions/hooks/use-admin-institutions";
import { adminSystemApi } from "@/lib/api/admin-system";
import type {
  AdminCreateNotificationAnnouncementPayload,
  AdminNotificationAnnouncement,
  AdminNotificationAnnouncementsFilter,
  AdminNoticeOpens,
} from "@/lib/api/types";
import { formatDateTime } from "@/lib/utils/format";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BellRing, Megaphone, Send, ShieldCheck, SquareX } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { alertStatusKey } from "./alert-status-panel";

/**
 * Notices for students (canvas board 7). A notice lands in the inbox as a
 * pinned card signed by the StudyBond team. It only buzzes phones and
 * laptops when "Also send as an alert" is ticked. There is no weekly limit
 * (user, 24 Nov 2026): the form shows when the last alert went out so the
 * admin can judge.
 */

const FILTERS: Array<{ value: AdminNotificationAnnouncementsFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "active", label: "Live now" },
  { value: "scheduled", label: "Scheduled" },
  { value: "expired", label: "Ended" },
  { value: "cancelled", label: "Cancelled" },
];

const AUDIENCE_OPTIONS = [
  { value: "ALL", label: "All students" },
  { value: "PREMIUM", label: "Premium only" },
  { value: "FREE", label: "Free only" },
];

const OPENS_OPTIONS: Array<{ value: AdminNoticeOpens | "none"; label: string }> = [
  { value: "home", label: "Home" },
  { value: "duel", label: "Duel" },
  { value: "plan", label: "Plan" },
  { value: "league", label: "League" },
  { value: "streak", label: "Streak" },
  { value: "link", label: "A link" },
  { value: "none", label: "Nothing" },
];

function opensLabel(announcement: AdminNotificationAnnouncement) {
  if (announcement.opens === "link" && announcement.link) {
    return `${announcement.link} (button: "${announcement.linkLabel || "Open the link"}")`;
  }
  const value = announcement.opens;
  return OPENS_OPTIONS.find((option) => option.value === (value ?? "none"))?.label ?? value ?? "Nothing";
}

/** A rough check before sending; the server has the final say. */
function looksLikeLink(value: string) {
  const link = value.trim();
  if (!link || /\s/.test(link)) return false;
  if (link.startsWith("/")) return !link.startsWith("//");
  return /^(https:\/\/)?[^/]+\.[^/]+/i.test(link);
}

function toIso(value: string) {
  return new Date(value).toISOString();
}

function stateOf(announcement: AdminNotificationAnnouncement): { label: string; tone: BadgeTone } {
  const now = Date.now();
  if (announcement.cancelledAt) return { label: "Cancelled", tone: "neutral" };
  if (new Date(announcement.startAt).getTime() > now) return { label: "Scheduled", tone: "info" };
  if (announcement.expiresAt && new Date(announcement.expiresAt).getTime() <= now) return { label: "Ended", tone: "neutral" };
  return { label: "Live now", tone: "success" };
}

function Meta({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="rounded-[var(--sb-radius)] border border-[var(--sb-border)] bg-[var(--sb-bg-inset)] px-3 py-2">
      <p className="text-[length:var(--sb-text-xs)] text-[var(--sb-text-tertiary)]">{label}</p>
      <p className="mt-0.5 truncate text-[length:var(--sb-text-sm)] text-[var(--sb-text)]">{value}</p>
    </div>
  );
}

export function AnnouncementsPanel() {
  const queryClient = useQueryClient();
  const { isActive: isStepUpActive, stepUp } = useAdminStepUp();
  const institutions = useAdminInstitutions();
  // Shared with the status panel: same key, one request.
  const alertStatus = useQuery({ queryKey: alertStatusKey, queryFn: adminSystemApi.getAlertStatus, staleTime: 10_000 }).data;

  const [statusFilter, setStatusFilter] = useState<AdminNotificationAnnouncementsFilter>("all");
  const [page, setPage] = useState(1);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [opens, setOpens] = useState<AdminNoticeOpens | "none">("home");
  const [link, setLink] = useState("");
  const [linkLabel, setLinkLabel] = useState("");
  const [board, setBoard] = useState("all");
  const [targetAudience, setTargetAudience] = useState<AdminCreateNotificationAnnouncementPayload["targetAudience"]>("ALL");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [sendAsAlert, setSendAsAlert] = useState(false);
  const [startAt, setStartAt] = useState("");
  const [expiresAt, setExpiresAt] = useState("");

  const list = useQuery({
    queryKey: ["admin", "notification-announcements", statusFilter, page],
    queryFn: () => adminSystemApi.getNotificationAnnouncements({ status: statusFilter, page, limit: 8 }),
    staleTime: 15_000,
  });
  const listData = list.data;

  const boards = (institutions.data?.institutions ?? []).filter((item) => item.isActive);
  const boardOptions = [{ value: "all", label: "All boards" }, ...boards.map((item) => ({ value: item.code, label: item.name }))];

  function resetForm() {
    setTitle("");
    setBody("");
    setOpens("home");
    setLink("");
    setLinkLabel("");
    setBoard("all");
    setTargetAudience("ALL");
    setVerifiedOnly(false);
    setSendAsAlert(false);
    setStartAt("");
    setExpiresAt("");
  }

  const create = useMutation({
    mutationFn: async () => {
      if (!stepUp?.stepUpToken) throw new Error("Step-up verification required.");
      const cleanTitle = title.trim();
      const cleanBody = body.trim();
      if (!cleanTitle || !cleanBody) throw new Error("A title and a message are both required.");
      const start = startAt ? new Date(startAt) : new Date();
      const end = expiresAt ? new Date(expiresAt) : null;
      if (Number.isNaN(start.getTime())) throw new Error("Choose a valid start time.");
      if (end && Number.isNaN(end.getTime())) throw new Error("Choose a valid end time.");
      if (end && end.getTime() <= start.getTime()) throw new Error("The end has to be after the start.");
      if (opens === "link" && !looksLikeLink(link)) {
        throw new Error("Type a full link like https://whatsapp.com/channel/..., or a StudyBond page like /dashboard/duel.");
      }

      return adminSystemApi.createNotificationAnnouncement(
        {
          title: cleanTitle,
          body: cleanBody,
          opens: opens === "none" ? null : opens,
          ...(opens === "link" ? { link: link.trim(), linkLabel: linkLabel.trim() || null } : {}),
          targetAudience,
          institutionCode: board === "all" ? null : board,
          verifiedOnly,
          sendAsAlert,
          ...(startAt ? { startAt: toIso(startAt) } : {}),
          expiresAt: expiresAt ? toIso(expiresAt) : null,
        },
        { stepUpToken: stepUp.stepUpToken },
      );
    },
    onSuccess: async () => {
      toast.success(startAt ? "Notice scheduled" : "Notice published");
      resetForm();
      setPage(1);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin", "notification-announcements"] }),
        queryClient.invalidateQueries({ queryKey: alertStatusKey }),
      ]);
    },
    onError: (error) => {
      toast.error("Could not publish this notice", {
        description: <ApiErrorMessage error={error} fallback="Check the fields and try again." />,
      });
    },
  });

  const cancel = useMutation({
    mutationFn: async (id: string) => {
      if (!stepUp?.stepUpToken) throw new Error("Step-up verification required.");
      return adminSystemApi.cancelNotificationAnnouncement(id, { stepUpToken: stepUp.stepUpToken });
    },
    onSuccess: async () => {
      toast.success("Notice taken down");
      await queryClient.invalidateQueries({ queryKey: ["admin", "notification-announcements"] });
    },
    onError: (error) => {
      toast.error("Could not take this notice down", { description: <ApiErrorMessage error={error} fallback="Please try again." /> });
    },
  });

  const audience = AUDIENCE_OPTIONS.find((option) => option.value === targetAudience)?.label ?? "All students";
  const boardName = board === "all" ? "every board" : boards.find((item) => item.code === board)?.name ?? board;
  const lastAlertAt = listData?.lastAlertAt ?? alertStatus?.lastNoticeAlertAt ?? null;
  const canPublish = isStepUpActive && title.trim() && body.trim() && !create.isPending;

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      {/* ── Write ── */}
      <section className="min-w-0 space-y-3">
        <SectionTitle
          title="New notice"
          description="Pinned at the top of every targeted student's inbox, signed by the StudyBond team."
        />

        <div className="space-y-4 rounded-[var(--sb-radius-lg)] border border-[var(--sb-border)] bg-[var(--sb-surface-1)] p-4 sm:p-5">
          <Field
            label="Title"
            hint={`${title.length}/120`}
            value={title}
            maxLength={120}
            disabled={create.isPending}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="JAMB UTME is now on StudyBond"
          />
          <TextArea
            label="Message"
            hint={`${body.length}/4000`}
            rows={4}
            value={body}
            maxLength={4000}
            disabled={create.isPending}
            onChange={(event) => setBody(event.target.value)}
            placeholder="Say what changed and what students should do. Plain words."
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <FieldShell label="Opens">
              <CustomSelect
                aria-label="Where tapping the notice goes"
                value={opens}
                onValueChange={(value) => setOpens(value as AdminNoticeOpens | "none")}
                options={OPENS_OPTIONS}
                disabled={create.isPending}
              />
            </FieldShell>
            <FieldShell label="Board">
              <CustomSelect
                aria-label="Which board's students see it"
                value={board}
                onValueChange={setBoard}
                options={boardOptions}
                disabled={create.isPending}
              />
            </FieldShell>
            {opens === "link" ? (
              <>
                <Field
                  label="Link"
                  hint="StudyBond pages open in the app. Other sites open in a new tab."
                  value={link}
                  maxLength={500}
                  inputMode="url"
                  disabled={create.isPending}
                  onChange={(event) => setLink(event.target.value)}
                  placeholder="https://whatsapp.com/channel/..."
                />
                <Field
                  label="Button text"
                  hint={linkLabel ? `${linkLabel.length}/40` : "Blank means Open the link"}
                  value={linkLabel}
                  maxLength={40}
                  disabled={create.isPending}
                  onChange={(event) => setLinkLabel(event.target.value)}
                  placeholder="Join the channel"
                />
              </>
            ) : null}
            <FieldShell label="Who sees it">
              <CustomSelect
                aria-label="Who sees this notice"
                value={targetAudience}
                onValueChange={(value) => setTargetAudience(value as AdminCreateNotificationAnnouncementPayload["targetAudience"])}
                options={AUDIENCE_OPTIONS}
                disabled={create.isPending}
              />
            </FieldShell>
            <FieldShell label="Verified accounts">
              <label className="flex h-9 cursor-pointer items-center gap-2.5">
                <input
                  type="checkbox"
                  checked={verifiedOnly}
                  disabled={create.isPending}
                  onChange={(event) => setVerifiedOnly(event.target.checked)}
                  className="h-4 w-4 accent-[var(--sb-accent)]"
                />
                <span className="text-[length:var(--sb-text-sm)] text-[var(--sb-text-secondary)]">Only verified emails</span>
              </label>
            </FieldShell>
            <Field
              label="Starts"
              hint="Blank means now"
              type="datetime-local"
              value={startAt}
              disabled={create.isPending}
              onChange={(event) => setStartAt(event.target.value)}
            />
            <Field
              label="Ends"
              hint="Optional. It disappears everywhere then."
              type="datetime-local"
              value={expiresAt}
              min={startAt || undefined}
              disabled={create.isPending}
              onChange={(event) => setExpiresAt(event.target.value)}
            />
          </div>

          <label className="flex cursor-pointer items-start gap-3 border-t border-[var(--sb-border)] pt-4">
            <input
              type="checkbox"
              checked={sendAsAlert}
              disabled={create.isPending}
              onChange={(event) => setSendAsAlert(event.target.checked)}
              className="mt-0.5 h-4 w-4 accent-[var(--sb-accent)]"
            />
            <span>
              <span className="block text-[length:var(--sb-text-sm)] font-medium text-[var(--sb-text)]">Also send as an alert</span>
              <span className="mt-0.5 block text-[length:var(--sb-text-xs)] text-[var(--sb-text-tertiary)]">
                Buzzes every device that has News switched on.{" "}
                {lastAlertAt ? `Last announcement alert went out on ${formatDateTime(lastAlertAt)}.` : "No announcement has gone out as an alert yet."}
              </span>
            </span>
          </label>
          {sendAsAlert && alertStatus?.paused ? (
            <p className="text-[length:var(--sb-text-xs)] text-[var(--sb-warning)]">Alerts are paused, so this one waits until you resume.</p>
          ) : null}

          <p className="rounded-[var(--sb-radius)] border border-[var(--sb-border)] bg-[var(--sb-bg-inset)] px-3 py-2.5 text-[length:var(--sb-text-sm)] text-[var(--sb-text-secondary)]">
            This shows to <span className="text-[var(--sb-text)]">{audience.toLowerCase()}</span> on {boardName}
            {verifiedOnly ? ", with a verified email" : ""}, from{" "}
            <span className="text-[var(--sb-text)]">{startAt ? formatDateTime(startAt) : "now"}</span>
            {expiresAt ? ` until ${formatDateTime(expiresAt)}` : " with no end date"}.
            {sendAsAlert ? " It also buzzes their phones and laptops." : " Inbox only, no alert."}
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <ConfirmButton
              variant="primary"
              confirmLabel={sendAsAlert ? "Yes, publish and alert" : "Yes, publish"}
              onConfirm={() => create.mutate()}
              disabled={!canPublish}
              isLoading={create.isPending}
              icon={<Send className="h-4 w-4" />}
            >
              Publish
            </ConfirmButton>
            {!isStepUpActive ? (
              <Button asChild href="/step-up?next=/alerts&intent=Alerts%20and%20news" variant="secondary" size="sm">
                <ShieldCheck className="h-3.5 w-3.5" />
                Verify first
              </Button>
            ) : !title.trim() || !body.trim() ? (
              <p className="text-[length:var(--sb-text-xs)] text-[var(--sb-text-tertiary)]">A title and a message are both needed.</p>
            ) : null}
          </div>
        </div>
      </section>

      {/* ── Notices so far ── */}
      <section className="min-w-0 space-y-3">
        <SectionTitle title="Notices" description="Everything scheduled, live or finished." />
        <FilterChips
          options={FILTERS.map((filter) => ({ label: filter.label, value: filter.value }))}
          value={statusFilter}
          onChange={(value) => {
            setStatusFilter(value as AdminNotificationAnnouncementsFilter);
            setPage(1);
          }}
        />

        <div className="space-y-2.5">
          {list.isLoading ? (
            Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-40 w-full" />)
          ) : list.isError ? (
            <ErrorState title="Could not load notices" error={list.error} onRetry={() => list.refetch()} />
          ) : listData?.items.length ? (
            listData.items.map((announcement) => {
              const state = stateOf(announcement);
              return (
                <article key={announcement.id} className="rounded-[var(--sb-radius-lg)] border border-[var(--sb-border)] bg-[var(--sb-surface-1)] p-4">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="text-[length:var(--sb-text-md)] font-medium text-[var(--sb-text)]">{announcement.title}</p>
                    <Badge tone={state.tone}>{state.label}</Badge>
                    {announcement.sendAsAlert ? (
                      <Badge tone="brand">
                        <BellRing className="h-3 w-3" />
                        {announcement.alertsQueuedAt ? "Alert sent" : "Alert waiting"}
                      </Badge>
                    ) : null}
                  </div>
                  <p className="mt-1.5 whitespace-pre-line text-[length:var(--sb-text-sm)] leading-relaxed text-[var(--sb-text-secondary)]">{announcement.body}</p>

                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <Meta label="Who sees it" value={`${AUDIENCE_OPTIONS.find((option) => option.value === announcement.targetAudience)?.label ?? announcement.targetAudience}${announcement.verifiedOnly ? " · verified" : ""}`} />
                    <Meta label="Board" value={announcement.institutionName ?? announcement.institutionCode ?? "All boards"} />
                    <Meta label="Starts" value={formatDateTime(announcement.startAt)} />
                    <Meta label="Ends" value={announcement.expiresAt ? formatDateTime(announcement.expiresAt) : "No end date"} />
                  </div>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-[length:var(--sb-text-xs)] text-[var(--sb-text-tertiary)]">
                      Created {formatDateTime(announcement.createdAt)} · opens {opensLabel(announcement)}
                    </p>
                    {!announcement.cancelledAt ? (
                      <ConfirmButton
                        variant="danger"
                        size="sm"
                        confirmLabel="Yes, take it down"
                        onConfirm={() => cancel.mutate(announcement.id)}
                        disabled={!isStepUpActive || cancel.isPending}
                        isLoading={cancel.isPending && cancel.variables === announcement.id}
                        icon={<SquareX className="h-3.5 w-3.5" />}
                      >
                        Take down
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
                description={statusFilter === "all" ? "No notices have been written yet." : "Nothing matches this filter. Try All."}
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
