"use client";

import { ApiErrorMessage } from "@/components/ui/api-error-message";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { ErrorState } from "@/components/ui/error-state";
import { TextArea } from "@/components/ui/field";
import { PageHeader, SectionTitle } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminSession } from "@/features/admin-auth/hooks/use-admin-session";
import { useAdminReport } from "@/features/reports/hooks/use-admin-report";
import {
  MIN_REPORT_NOTE_LENGTH,
  REPORT_ISSUE_TONE,
  REPORT_STATUS_TONE,
  reportLabel,
} from "@/features/reports/report-display";
import { adminReportsApi } from "@/lib/api/admin-reports";
import type { AdminReport } from "@/lib/api/types";
import { formatDateTime } from "@/lib/utils/format";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CheckCheck, FileWarning, Trash2 } from "lucide-react";
import { useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

/**
 * One report, in full.
 *
 * The most damaging detail was the image. A report of type IMAGE_MISSING or
 * WRONG_ANSWER usually hinges on what the picture shows, and the picture was
 * rendered `object-cover` inside a `max-h-[420px]` box — so a tall diagram
 * was cropped top and bottom, by the very screen an admin opens to judge it.
 * It is `object-contain` now, on a neutral ground, at its own aspect ratio.
 *
 * The note minimum was invisible in the same way it was on the queue: both
 * action buttons disable below five characters and neither said so.
 *
 * Hard delete is permanent and had no confirmation step.
 *
 * The status and issue-type colour maps lived here in a second copy that had
 * already drifted from the queue's — PENDING was amber here and warning
 * there, TYPO cyan here and info there. Both now import one shared map.
 */

export default function ReportDetailPage() {
  const params = useParams<{ id: string }>();
  const reportId = Number.parseInt(params.id, 10);
  const queryClient = useQueryClient();
  const { data: session } = useAdminSession();
  const reportQuery = useAdminReport(
    Number.isFinite(reportId) ? reportId : undefined,
  );
  const report: AdminReport | undefined = reportQuery.data;

  /**
   * `null` means "the admin has not typed anything yet", so the saved note
   * shows through. Copying the server value into state with an effect —
   * which is what this did — meant an in-flight refetch could overwrite what
   * someone was halfway through typing, and it fired a second render on
   * every load. The queue page already derives it this way.
   */
  const [draftNote, setDraftNote] = useState<string | null>(null);
  const [hardDeleteReason, setHardDeleteReason] = useState("");

  const adminNote = draftNote ?? report?.adminNote ?? "";

  const updateMutation = useMutation({
    mutationFn: (status: "REVIEWED" | "RESOLVED") =>
      adminReportsApi.updateStatus(reportId, {
        status,
        adminNote: adminNote.trim(),
      }),
    onSuccess: async (payload) => {
      toast.success(`Report marked ${payload.status.toLowerCase()}`);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin", "reports"] }),
        queryClient.invalidateQueries({
          queryKey: ["admin", "report", reportId],
        }),
      ]);
    },
    onError: (error) => {
      toast.error("Could not update this report", {
        description: (
          <ApiErrorMessage error={error} fallback="Please try again." />
        ),
      });
    },
  });

  const hardDeleteMutation = useMutation({
    mutationFn: () =>
      adminReportsApi.hardDelete(reportId, {
        reason: hardDeleteReason.trim(),
      }),
    onSuccess: async (payload) => {
      toast.success(payload.message);
      setHardDeleteReason("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin", "reports"] }),
        queryClient.invalidateQueries({
          queryKey: ["admin", "report", reportId],
        }),
      ]);
    },
    onError: (error) => {
      toast.error("Could not delete this report", {
        description: (
          <ApiErrorMessage error={error} fallback="Please try again." />
        ),
      });
    },
  });

  if (reportQuery.isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Report" description="Loading…" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (reportQuery.isError || !report) {
    return (
      <div className="sb-enter space-y-6">
        <PageHeader
          title="Report"
          action={
            <Button asChild href="/reports" variant="secondary">
              <ArrowLeft className="h-4 w-4" />
              Back to reports
            </Button>
          }
        />
        <ErrorState
          title="Could not load this report"
          error={reportQuery.error}
          onRetry={() => reportQuery.refetch()}
        />
      </div>
    );
  }

  const isNoteTooShort = adminNote.trim().length < MIN_REPORT_NOTE_LENGTH;
  const isDeleteReasonTooShort =
    hardDeleteReason.trim().length < MIN_REPORT_NOTE_LENGTH;

  return (
    <div className="sb-enter space-y-6 pb-2">
      <PageHeader
        title={`Report #${report.id}`}
        description={`${report.question.subject} · reported ${formatDateTime(
          report.createdAt,
        )}`}
        meta={
          <>
            <Badge tone={REPORT_ISSUE_TONE[report.issueType] ?? "neutral"}>
              {reportLabel(report.issueType)}
            </Badge>
            <Badge tone={REPORT_STATUS_TONE[report.status] ?? "neutral"}>
              {reportLabel(report.status)}
            </Badge>
          </>
        }
        action={
          <Button asChild href="/reports" variant="secondary">
            <ArrowLeft className="h-4 w-4" />
            Back to reports
          </Button>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        {/* ══ What was reported ═══════════════════════════════ */}
        <div className="min-w-0 space-y-6">
          <section className="space-y-3">
            <SectionTitle title="What the learner said" />
            <div className="rounded-[var(--sb-radius-lg)] border border-[var(--sb-border)] bg-[var(--sb-surface-1)] p-4 sm:p-5">
              <p className="text-[length:var(--sb-text-md)] leading-relaxed text-[var(--sb-text)]">
                {report.description ||
                  "The reporter did not write a description."}
              </p>

              <dl className="mt-4 grid gap-2.5 sm:grid-cols-2">
                <div className="rounded-[var(--sb-radius)] border border-[var(--sb-border)] bg-[var(--sb-bg-inset)] p-3">
                  <dt className="text-[length:var(--sb-text-xs)] text-[var(--sb-text-tertiary)]">
                    Reported by
                  </dt>
                  <dd className="mt-1 truncate text-[length:var(--sb-text-sm)] font-medium text-[var(--sb-text)]">
                    {report.reporter.fullName}
                  </dd>
                  <dd className="truncate text-[length:var(--sb-text-xs)] text-[var(--sb-text-tertiary)]">
                    {report.reporter.email}
                  </dd>
                </div>
                <div className="rounded-[var(--sb-radius)] border border-[var(--sb-border)] bg-[var(--sb-bg-inset)] p-3">
                  <dt className="text-[length:var(--sb-text-xs)] text-[var(--sb-text-tertiary)]">
                    Question
                  </dt>
                  <dd className="sb-nums mt-1 text-[length:var(--sb-text-sm)] font-medium text-[var(--sb-text)]">
                    #{report.question.id}
                  </dd>
                  <dd className="truncate text-[length:var(--sb-text-xs)] text-[var(--sb-text-tertiary)]">
                    {report.question.topic ?? "No topic"}
                  </dd>
                </div>
              </dl>
            </div>
          </section>

          <section className="space-y-3">
            <SectionTitle
              title="The question"
              description="Exactly what the learner was looking at."
              action={
                <Button
                  asChild
                  href={`/questions/${report.question.id}`}
                  variant="secondary"
                  size="sm"
                >
                  Open question
                </Button>
              }
            />
            <div className="space-y-3 rounded-[var(--sb-radius-lg)] border border-[var(--sb-border)] bg-[var(--sb-surface-1)] p-4 sm:p-5">
              <p className="text-[length:var(--sb-text-md)] leading-relaxed text-[var(--sb-text)]">
                {report.question.questionText}
              </p>

              {report.question.imageUrl ? (
                /* object-contain, not object-cover: half these reports are
                   about the image, and cropping it hides the evidence. */
                <figure className="overflow-hidden rounded-[var(--sb-radius)] border border-[var(--sb-border)] bg-[var(--sb-bg-inset)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={report.question.imageUrl}
                    alt={`Attached to question ${report.question.id}`}
                    className="mx-auto max-h-[30rem] w-auto max-w-full object-contain"
                  />
                </figure>
              ) : (
                <p className="rounded-[var(--sb-radius)] border border-dashed border-[var(--sb-border)] px-3 py-4 text-center text-[length:var(--sb-text-sm)] text-[var(--sb-text-tertiary)]">
                  This question has no image.
                </p>
              )}
            </div>
          </section>
        </div>

        {/* ══ What you do about it ════════════════════════════ */}
        <div className="min-w-0 space-y-6">
          <section className="space-y-3">
            <SectionTitle
              title="Your decision"
              description="Recorded against your account and kept with the report."
            />
            <div className="rounded-[var(--sb-radius-lg)] border border-[var(--sb-border)] bg-[var(--sb-surface-1)] p-4 sm:p-5">
              <TextArea
                label="Note"
                hint={`${MIN_REPORT_NOTE_LENGTH} characters minimum`}
                rows={6}
                value={adminNote}
                onChange={(event) => setDraftNote(event.target.value)}
                placeholder="What did you check, and what did you decide?"
              />

              {/* States the rule the buttons are enforcing. */}
              {isNoteTooShort ? (
                <p className="mt-1.5 text-[length:var(--sb-text-xs)] text-[var(--sb-text-tertiary)]">
                  Write a note before marking this reviewed or resolved.
                </p>
              ) : null}

              <div className="mt-4 grid gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => updateMutation.mutate("REVIEWED")}
                  disabled={updateMutation.isPending || isNoteTooShort}
                  isLoading={updateMutation.isPending}
                >
                  <FileWarning className="h-4 w-4" />
                  Mark reviewed
                </Button>
                <Button
                  type="button"
                  onClick={() => updateMutation.mutate("RESOLVED")}
                  disabled={updateMutation.isPending || isNoteTooShort}
                  isLoading={updateMutation.isPending}
                >
                  <CheckCheck className="h-4 w-4" />
                  Resolve
                </Button>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <SectionTitle title="Who handled it" />
            <div className="space-y-2.5 rounded-[var(--sb-radius-lg)] border border-[var(--sb-border)] bg-[var(--sb-surface-1)] p-4 sm:p-5">
              <div className="rounded-[var(--sb-radius)] border border-[var(--sb-border)] bg-[var(--sb-bg-inset)] p-3">
                <p className="text-[length:var(--sb-text-xs)] text-[var(--sb-text-tertiary)]">
                  Reviewed by
                </p>
                <p className="mt-1 text-[length:var(--sb-text-sm)] font-medium text-[var(--sb-text)]">
                  {report.reviewedByAdmin?.fullName ?? "Nobody yet"}
                </p>
                <p className="text-[length:var(--sb-text-xs)] text-[var(--sb-text-tertiary)]">
                  {report.reviewedAt
                    ? formatDateTime(report.reviewedAt)
                    : "Not reviewed"}
                </p>
              </div>
              <div className="rounded-[var(--sb-radius)] border border-[var(--sb-border)] bg-[var(--sb-bg-inset)] p-3">
                <p className="text-[length:var(--sb-text-xs)] text-[var(--sb-text-tertiary)]">
                  Resolved by
                </p>
                <p className="mt-1 text-[length:var(--sb-text-sm)] font-medium text-[var(--sb-text)]">
                  {report.resolvedByAdmin?.fullName ?? "Nobody yet"}
                </p>
                <p className="text-[length:var(--sb-text-xs)] text-[var(--sb-text-tertiary)]">
                  {report.resolvedByAdmin?.email ?? "Still open"}
                </p>
              </div>
            </div>
          </section>

          {session?.user?.role === "SUPERADMIN" ? (
            <section className="space-y-3">
              <SectionTitle title="Permanent deletion" />
              <div className="rounded-[var(--sb-radius-lg)] border border-[var(--sb-danger-ring)] bg-[var(--sb-danger-soft)] p-4 sm:p-5">
                <p className="text-[length:var(--sb-text-base)] text-[var(--sb-text-secondary)]">
                  This erases the report record for good. It is for spam and
                  invalid submissions — resolving is the normal way to close a
                  real report.
                </p>

                <div className="mt-3">
                  <TextArea
                    label="Reason"
                    hint={`${MIN_REPORT_NOTE_LENGTH} characters minimum`}
                    rows={3}
                    value={hardDeleteReason}
                    onChange={(event) => setHardDeleteReason(event.target.value)}
                    placeholder="Why is this being deleted rather than resolved?"
                  />
                </div>

                <ConfirmButton
                  variant="danger"
                  className="mt-3 w-full"
                  confirmLabel="Yes, delete permanently"
                  onConfirm={() => hardDeleteMutation.mutate()}
                  disabled={
                    hardDeleteMutation.isPending || isDeleteReasonTooShort
                  }
                  isLoading={hardDeleteMutation.isPending}
                  icon={<Trash2 className="h-4 w-4" />}
                >
                  Delete report
                </ConfirmButton>
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
