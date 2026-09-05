"use client";

import { ApiErrorMessage } from "@/components/ui/api-error-message";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CustomSelect } from "@/components/ui/custom-select";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { FieldShell, SearchField, TextArea } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard, StatGrid } from "@/components/ui/stat-card";
import { FilterChips } from "@/components/ui/toolbar";
import { useAdminSession } from "@/features/admin-auth/hooks/use-admin-session";
import { useAdminReport } from "@/features/reports/hooks/use-admin-report";
import { useAdminReports } from "@/features/reports/hooks/use-admin-reports";
import {
  MIN_REPORT_NOTE_LENGTH,
  REPORT_ISSUE_TONE,
  REPORT_STATUS_TONE,
  reportLabel,
} from "@/features/reports/report-display";
import { adminReportsApi } from "@/lib/api/admin-reports";
import type {
  AdminReport,
  AdminReportListItem,
  AdminReportsListParams,
} from "@/lib/api/types";
import { cn } from "@/lib/utils/cn";
import { formatDateTime, formatInteger } from "@/lib/utils/format";
import { useDebouncedValue } from "@/lib/utils/use-debounced-value";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowRight,
  CheckCheck,
  FileWarning,
  Inbox,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";

/**
 * Reports queue.
 *
 * Structural fixes over the previous version:
 *
 * 1. The master-detail split at `2xl` (1536px). On any normal laptop the
 *    detail panel therefore rendered *below* a 24-item queue — you clicked
 *    a report and its details were off-screen. It now splits at `xl`, the
 *    panel is sticky, and below `xl` rows navigate to /reports/[id]
 *    instead of selecting, so you can never be stranded.
 *
 * 2. Nine filter chips sat in one undifferentiated row — four exclusive
 *    status values followed by five toggleable issue types, distinguished
 *    only by colour. Status is now a labelled chip group and issue type is
 *    a labelled select, so the two behaviours are visibly different.
 *
 * 3. The disabled action buttons never explained themselves. The note
 *    minimum is now stated next to the field.
 */

type ReportStatusFilter = NonNullable<AdminReportsListParams["status"]> | "";
type ReportIssueTypeFilter =
  | NonNullable<AdminReportsListParams["issueType"]>
  | "";

const STATUS_OPTIONS: { label: string; value: ReportStatusFilter }[] = [
  { label: "All", value: "" },
  { label: "Pending", value: "PENDING" },
  { label: "Reviewed", value: "REVIEWED" },
  { label: "Resolved", value: "RESOLVED" },
];

const ISSUE_TYPE_OPTIONS: { label: string; value: ReportIssueTypeFilter }[] = [
  { label: "Any issue type", value: "" },
  { label: "Wrong answer", value: "WRONG_ANSWER" },
  { label: "Typo", value: "TYPO" },
  { label: "Ambiguous", value: "AMBIGUOUS" },
  { label: "Image missing", value: "IMAGE_MISSING" },
  { label: "Other", value: "OTHER" },
];

export default function ReportsPage() {
  const queryClient = useQueryClient();
  const { data: session } = useAdminSession();

  const [statusFilter, setStatusFilter] = useState<ReportStatusFilter>("");
  const [issueTypeFilter, setIssueTypeFilter] =
    useState<ReportIssueTypeFilter>("");
  const [subjectFilter, setSubjectFilter] = useState("");
  const debouncedSubject = useDebouncedValue(subjectFilter.trim(), 350);

  const [selectedReportId, setSelectedReportId] = useState<number | null>(null);
  const [adminNote, setAdminNote] = useState<Record<number, string>>({});
  const [hardDeleteReason, setHardDeleteReason] = useState("");

  const reportsQuery = useAdminReports({
    page: 1,
    limit: 24,
    status: statusFilter || undefined,
    issueType: issueTypeFilter || undefined,
    subject: debouncedSubject || undefined,
  });

  const reportRows = useMemo<AdminReportListItem[]>(
    () => reportsQuery.data?.reports ?? [],
    [reportsQuery.data],
  );

  const resolvedSelectedReportId = useMemo(() => {
    if (
      selectedReportId &&
      reportRows.some((report) => report.id === selectedReportId)
    ) {
      return selectedReportId;
    }
    return reportRows[0]?.id ?? null;
  }, [reportRows, selectedReportId]);

  const detailQuery = useAdminReport(resolvedSelectedReportId ?? undefined);
  const selectedReport: AdminReport | undefined = detailQuery.data;

  const currentAdminNote =
    (resolvedSelectedReportId
      ? adminNote[resolvedSelectedReportId]
      : undefined) ??
    selectedReport?.adminNote ??
    "";
  const isNoteTooShort = currentAdminNote.trim().length < MIN_REPORT_NOTE_LENGTH;

  const updateMutation = useMutation({
    mutationFn: (status: "REVIEWED" | "RESOLVED") =>
      adminReportsApi.updateStatus(resolvedSelectedReportId as number, {
        status,
        adminNote: currentAdminNote.trim(),
      }),
    onSuccess: async (payload) => {
      toast.success(`Report marked ${payload.status.toLowerCase()}`);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin", "reports"] }),
        queryClient.invalidateQueries({
          queryKey: ["admin", "report", resolvedSelectedReportId],
        }),
      ]);
    },
    onError: (error) => {
      toast.error("Could not update report", {
        description: (
          <ApiErrorMessage error={error} fallback="Please try again." />
        ),
      });
    },
  });

  const hardDeleteMutation = useMutation({
    mutationFn: () =>
      adminReportsApi.hardDelete(resolvedSelectedReportId as number, {
        reason: hardDeleteReason.trim(),
      }),
    onSuccess: async (payload) => {
      toast.success(payload.message);
      setHardDeleteReason("");
      setSelectedReportId(null);
      if (resolvedSelectedReportId) {
        setAdminNote((current) => {
          const next = { ...current };
          delete next[resolvedSelectedReportId];
          return next;
        });
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin", "reports"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "report"] }),
      ]);
    },
    onError: (error) => {
      toast.error("Could not delete report", {
        description: (
          <ApiErrorMessage error={error} fallback="Please try again." />
        ),
      });
    },
  });

  const summary = reportsQuery.data?.summary;
  const totalItems = reportsQuery.data?.pagination?.total ?? 0;
  const hasActiveFilters = Boolean(
    statusFilter || issueTypeFilter || debouncedSubject,
  );

  return (
    <div className="sb-enter space-y-6 pb-2">
      <PageHeader
        title="Question reports"
        description="Triage issues learners have flagged, then record what you decided."
      />

      <StatGrid>
        <StatCard
          label="Pending"
          value={formatInteger(summary?.pending ?? 0)}
          hint="Awaiting review"
          status={summary?.pending ? "warning" : "success"}
        />
        <StatCard
          label="Reviewed"
          value={formatInteger(summary?.reviewed ?? 0)}
          hint="Investigated, not yet closed"
          status="info"
        />
        <StatCard
          label="Resolved"
          value={formatInteger(summary?.resolved ?? 0)}
          hint="Closed"
          status="success"
        />
        <StatCard
          label="Total tracked"
          value={formatInteger(summary?.totalTracked ?? 0)}
          hint="All reports, all statuses"
        />
      </StatGrid>

      {/* ── Filters ───────────────────────────────────────────
          Status and issue type behave differently, so they look
          different: chips are exclusive, the select is a value. */}
      <div className="rounded-[var(--sb-radius-lg)] border border-[var(--sb-border)] bg-[var(--sb-surface-1)] p-3 sm:p-4">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_14rem_16rem]">
          <FieldShell label="Status">
            <FilterChips
              options={STATUS_OPTIONS}
              value={statusFilter}
              onChange={(value) =>
                setStatusFilter(value as ReportStatusFilter)
              }
            />
          </FieldShell>

          <FieldShell label="Issue type">
            <CustomSelect
              aria-label="Issue type"
              value={issueTypeFilter}
              onValueChange={(value) =>
                setIssueTypeFilter(value as ReportIssueTypeFilter)
              }
              options={ISSUE_TYPE_OPTIONS}
              placeholder="Any issue type"
            />
          </FieldShell>

          <FieldShell label="Subject">
            <SearchField
              value={subjectFilter}
              onChange={(event) => setSubjectFilter(event.target.value)}
              placeholder="Filter by subject"
              aria-label="Filter by subject"
            />
          </FieldShell>
        </div>
      </div>

      {reportsQuery.isError ? (
        <ErrorState
          title="Could not load reports"
          error={reportsQuery.error}
          onRetry={() => reportsQuery.refetch()}
        />
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] 2xl:grid-cols-[minmax(0,1fr)_minmax(0,30rem)]">
        {/* ── Queue ─────────────────────────────────────────── */}
        <section className="min-w-0 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-[length:var(--sb-text-lg)] font-semibold tracking-tight text-[var(--sb-text)]">
              Queue
            </h2>
            <span className="sb-nums text-[length:var(--sb-text-xs)] text-[var(--sb-text-secondary)]">
              {formatInteger(totalItems)}{" "}
              {totalItems === 1 ? "report" : "reports"}
            </span>
          </div>

          <div className="overflow-hidden rounded-[var(--sb-radius-lg)] border border-[var(--sb-border)] bg-[var(--sb-surface-1)]">
            {reportsQuery.isLoading ? (
              <div className="space-y-2 p-4">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Skeleton key={index} className="h-24 w-full" />
                ))}
              </div>
            ) : reportRows.length ? (
              <ul className="divide-y divide-[var(--sb-border)]">
                {reportRows.map((report) => {
                  const isSelected = report.id === resolvedSelectedReportId;

                  const body = (
                    <>
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-[length:var(--sb-text-base)] font-medium text-[var(--sb-text)]">
                            {report.question.subject}
                          </p>
                          <p className="mt-0.5 truncate text-[length:var(--sb-text-xs)] text-[var(--sb-text-tertiary)]">
                            {report.question.topic ?? "No topic"}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-wrap gap-1.5">
                          <Badge tone={REPORT_ISSUE_TONE[report.issueType] ?? "neutral"}>
                            {reportLabel(report.issueType)}
                          </Badge>
                          <Badge
                            tone={
                              REPORT_STATUS_TONE[report.status] ?? "neutral"
                            }
                          >
                            {reportLabel(report.status)}
                          </Badge>
                        </div>
                      </div>

                      <p className="mt-2 line-clamp-2 text-[length:var(--sb-text-sm)] text-[var(--sb-text-secondary)]">
                        {report.description || report.question.questionText}
                      </p>

                      <p className="mt-2 text-[length:var(--sb-text-xs)] text-[var(--sb-text-tertiary)]">
                        {report.reporter.fullName} ·{" "}
                        {formatDateTime(report.createdAt)}
                      </p>
                    </>
                  );

                  return (
                    <li key={report.id} className="relative">
                      {/* Below xl there is no detail panel beside the list,
                          so a row navigates instead of selecting. */}
                      <Link
                        href={`/reports/${report.id}`}
                        className="block p-4 transition-colors duration-[var(--sb-duration-fast)] hover:bg-[var(--sb-surface-2)] xl:hidden"
                      >
                        {body}
                      </Link>

                      <button
                        type="button"
                        onClick={() => setSelectedReportId(report.id)}
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
                icon={<Inbox className="h-4 w-4" />}
                title={
                  hasActiveFilters
                    ? "No reports match these filters"
                    : "No reports yet"
                }
                description={
                  hasActiveFilters
                    ? "Try a different status, or clear the subject filter."
                    : "Reported questions will appear here as learners flag them."
                }
                action={
                  hasActiveFilters ? (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setStatusFilter("");
                        setIssueTypeFilter("");
                        setSubjectFilter("");
                      }}
                    >
                      Clear filters
                    </Button>
                  ) : null
                }
              />
            )}
          </div>
        </section>

        {/* ── Detail — sticky, desktop only ─────────────────── */}
        <aside className="hidden min-w-0 xl:block">
          <div className="sticky top-0 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-[length:var(--sb-text-lg)] font-semibold tracking-tight text-[var(--sb-text)]">
                Review
              </h2>
              {selectedReport ? (
                <Button
                  asChild
                  href={`/reports/${selectedReport.id}`}
                  variant="ghost"
                  size="sm"
                >
                  Full page
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              ) : null}
            </div>

            <div className="rounded-[var(--sb-radius-lg)] border border-[var(--sb-border)] bg-[var(--sb-surface-1)]">
              {selectedReport ? (
                <div className="max-h-[calc(100dvh-13rem)] overflow-y-auto overscroll-contain p-4 sm:p-5">
                  <div className="flex flex-wrap gap-1.5">
                    <Badge
                      tone={REPORT_ISSUE_TONE[selectedReport.issueType] ?? "neutral"}
                    >
                      {reportLabel(selectedReport.issueType)}
                    </Badge>
                    <Badge
                      tone={
                        REPORT_STATUS_TONE[selectedReport.status] ?? "neutral"
                      }
                    >
                      {reportLabel(selectedReport.status)}
                    </Badge>
                  </div>

                  <h3 className="mt-3 text-[length:var(--sb-text-lg)] font-semibold text-[var(--sb-text)]">
                    {selectedReport.question.subject}
                  </h3>
                  <p className="mt-1 text-[length:var(--sb-text-base)] text-[var(--sb-text-secondary)]">
                    {selectedReport.description ||
                      "The reporter did not add a description."}
                  </p>

                  <div className="mt-4 space-y-2.5">
                    <div className="rounded-[var(--sb-radius)] border border-[var(--sb-border)] bg-[var(--sb-bg-inset)] p-3">
                      <p className="text-[length:var(--sb-text-xs)] text-[var(--sb-text-tertiary)]">
                        Question #{selectedReport.question.id}
                      </p>
                      <p className="mt-1.5 text-[length:var(--sb-text-sm)] text-[var(--sb-text)]">
                        {selectedReport.question.questionText}
                      </p>
                    </div>

                    <dl className="grid gap-2.5 sm:grid-cols-2">
                      <div className="rounded-[var(--sb-radius)] border border-[var(--sb-border)] bg-[var(--sb-bg-inset)] p-3">
                        <dt className="text-[length:var(--sb-text-xs)] text-[var(--sb-text-tertiary)]">
                          Reported by
                        </dt>
                        <dd className="mt-1 truncate text-[length:var(--sb-text-sm)] font-medium text-[var(--sb-text)]">
                          {selectedReport.reporter.fullName}
                        </dd>
                        <dd className="truncate text-[length:var(--sb-text-xs)] text-[var(--sb-text-tertiary)]">
                          {selectedReport.reporter.email}
                        </dd>
                      </div>
                      <div className="rounded-[var(--sb-radius)] border border-[var(--sb-border)] bg-[var(--sb-bg-inset)] p-3">
                        <dt className="text-[length:var(--sb-text-xs)] text-[var(--sb-text-tertiary)]">
                          Received
                        </dt>
                        <dd className="mt-1 text-[length:var(--sb-text-sm)] font-medium text-[var(--sb-text)]">
                          {formatDateTime(selectedReport.createdAt)}
                        </dd>
                      </div>
                    </dl>
                  </div>

                  <div className="mt-4">
                    <TextArea
                      label="Admin note"
                      hint={`${MIN_REPORT_NOTE_LENGTH} characters minimum`}
                      rows={4}
                      value={currentAdminNote}
                      onChange={(event) =>
                        setAdminNote((current) => ({
                          ...current,
                          [resolvedSelectedReportId as number]:
                            event.target.value,
                        }))
                      }
                      placeholder="What did you find, and what did you decide?"
                    />
                    {isNoteTooShort ? (
                      <p className="mt-1.5 text-[length:var(--sb-text-xs)] text-[var(--sb-text-tertiary)]">
                        A note is required before you can review or resolve
                        this report.
                      </p>
                    ) : null}
                  </div>

                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
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

                  {session?.user?.role === "SUPERADMIN" ? (
                    <div className="mt-4 rounded-[var(--sb-radius)] border border-[var(--sb-danger-ring)] bg-[var(--sb-danger-soft)] p-3.5">
                      <div className="flex items-start gap-2.5">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--sb-danger)]" />
                        <div className="min-w-0 flex-1">
                          <p className="text-[length:var(--sb-text-base)] font-medium text-[var(--sb-text)]">
                            Permanently delete
                          </p>
                          <p className="mt-1 text-[length:var(--sb-text-sm)] text-[var(--sb-text-secondary)]">
                            This cannot be undone. Use it only for exceptional
                            cleanup.
                          </p>

                          <div className="mt-2.5">
                            <TextArea
                              rows={2}
                              value={hardDeleteReason}
                              onChange={(event) =>
                                setHardDeleteReason(event.target.value)
                              }
                              placeholder="Reason for permanent deletion"
                              aria-label="Reason for permanent deletion"
                            />
                          </div>

                          <Button
                            type="button"
                            variant="danger"
                            size="sm"
                            className="mt-2.5"
                            onClick={() => hardDeleteMutation.mutate()}
                            disabled={
                              hardDeleteMutation.isPending ||
                              hardDeleteReason.trim().length < MIN_REPORT_NOTE_LENGTH
                            }
                            isLoading={hardDeleteMutation.isPending}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete report
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : detailQuery.isLoading ? (
                <div className="space-y-2 p-4">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-24 w-full" />
                </div>
              ) : (
                <EmptyState
                  title="No report selected"
                  description="Pick a report from the queue to review it here."
                />
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
