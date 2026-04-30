"use client";

import { ApiErrorMessage } from "@/components/ui/api-error-message";
import { MetricCard } from "@/components/ui/metric-card";
import { SectionHeading } from "@/components/ui/section-heading";
import { StatusBadge } from "@/components/ui/status-badge";
import { Surface } from "@/components/ui/surface";
import { useAdminSession } from "@/features/admin-auth/hooks/use-admin-session";
import { useAdminReport } from "@/features/reports/hooks/use-admin-report";
import { useAdminReports } from "@/features/reports/hooks/use-admin-reports";
import { adminReportsApi } from "@/lib/api/admin-reports";
import type { AdminReportsListParams } from "@/lib/api/types";
import { formatDateTime, formatInteger } from "@/lib/utils/format";
import { useDebouncedValue } from "@/lib/utils/use-debounced-value";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ArrowRight, CheckCheck, FileWarning, Search, Trash2 } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";

const statusTone = {
  PENDING: "amber",
  REVIEWED: "cyan",
  RESOLVED: "emerald",
} as const;

const issueToneMap: Record<string, "amber" | "rose" | "cyan" | "slate"> = {
  WRONG_ANSWER: "rose",
  TYPO: "cyan",
  AMBIGUOUS: "amber",
  IMAGE_MISSING: "amber",
  OTHER: "slate",
};

type ReportStatusFilter = NonNullable<AdminReportsListParams["status"]> | "";
type ReportIssueTypeFilter = NonNullable<AdminReportsListParams["issueType"]> | "";

const REPORT_ISSUE_TYPES = [
  "WRONG_ANSWER",
  "TYPO",
  "AMBIGUOUS",
  "IMAGE_MISSING",
  "OTHER",
] satisfies NonNullable<AdminReportsListParams["issueType"]>[];

export default function ReportsPage() {
  const queryClient = useQueryClient();
  const { data: session } = useAdminSession();
  const [statusFilter, setStatusFilter] = useState<ReportStatusFilter>("");
  const [issueTypeFilter, setIssueTypeFilter] = useState<ReportIssueTypeFilter>("");
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

  const reportRows = useMemo(() => (reportsQuery.data as any)?.reports ?? [], [reportsQuery.data]);

  const resolvedSelectedReportId = useMemo(() => {
    if (selectedReportId && reportRows.some((report: any) => report.id === selectedReportId)) {
      return selectedReportId;
    }

    return reportRows[0]?.id ?? null;
  }, [reportRows, selectedReportId]);

  const detailQuery = useAdminReport(resolvedSelectedReportId ?? undefined);
  const selectedReport = detailQuery.data;
  const currentAdminNote =
    (resolvedSelectedReportId ? adminNote[resolvedSelectedReportId] : undefined) ??
    selectedReport?.adminNote ??
    "";

  const updateMutation = useMutation({
    mutationFn: (status: "REVIEWED" | "RESOLVED") =>
      adminReportsApi.updateStatus(resolvedSelectedReportId as number, {
        status,
        adminNote: currentAdminNote.trim(),
      }),
    onSuccess: async (payload: any) => {
      toast.success(`Report marked ${payload.status.toLowerCase()}`);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin", "reports"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "report", resolvedSelectedReportId] }),
      ]);
    },
    onError: (error) => {
      toast.error("Could not update report", {
        description: <ApiErrorMessage error={error} fallback="Please try again." />,
      });
    },
  });

  const hardDeleteMutation = useMutation({
    mutationFn: () =>
      adminReportsApi.hardDelete(resolvedSelectedReportId as number, {
        reason: hardDeleteReason.trim(),
      }),
    onSuccess: async (payload: any) => {
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
        description: <ApiErrorMessage error={error} fallback="Please try again." />,
      });
    },
  });

  const summary = (reportsQuery.data as any)?.summary;
  const filterPills = useMemo<Array<{ label: string; value: ReportStatusFilter }>>(
    () => [
      { label: "All", value: "" },
      { label: "Pending", value: "PENDING" },
      { label: "Reviewed", value: "REVIEWED" },
      { label: "Resolved", value: "RESOLVED" },
    ],
    [],
  );

  return (
    <section className="space-y-6">
      <SectionHeading
        eyebrow="Reports"
        title="Question reports"
        description="Review, triage, and resolve reported question issues."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Pending" value={formatInteger(summary?.pending ?? 0)} delta="Awaiting review" tone="amber" className="admin-enter" style={{ animationDelay: '0ms' }} />
        <MetricCard label="Reviewed" value={formatInteger(summary?.reviewed ?? 0)} delta="Under investigation" tone="cyan" className="admin-enter" style={{ animationDelay: '80ms' }} />
        <MetricCard label="Resolved" value={formatInteger(summary?.resolved ?? 0)} delta="Closed" tone="emerald" className="admin-enter" style={{ animationDelay: '160ms' }} />
        <MetricCard label="Total" value={formatInteger(summary?.totalTracked ?? 0)} delta="All reports tracked" tone="rose" className="admin-enter" style={{ animationDelay: '240ms' }} />
      </div>

      <div className="grid gap-6 2xl:grid-cols-[1.05fr_0.95fr]">
        <div className="grid gap-6">
          <Surface className="p-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-white">Filter reports</h2>
              </div>
              <div className="group/search flex w-full items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-2.5 transition-all duration-200 focus-within:border-[color:var(--accent-cyan)]/25 focus-within:shadow-[0_0_0_3px_rgba(110,196,184,0.06)] xl:w-auto">
                <Search className="h-4 w-4 text-[color:var(--muted-foreground)] transition-colors duration-200 group-focus-within/search:text-[color:var(--accent-cyan)]" />
                <input
                  value={subjectFilter}
                  onChange={(event) => setSubjectFilter(event.target.value)}
                  placeholder="Filter by subject..."
                  className="w-full min-w-0 bg-transparent text-sm text-white outline-none placeholder:text-[color:var(--muted-foreground)]/40 transition-[width] duration-300 sm:w-48 sm:focus:w-64"
                />
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {filterPills.map((pill: any) => (
                <button
                  key={pill.label}
                  type="button"
                  onClick={() => setStatusFilter(pill.value)}
                  className={`rounded-lg border px-3 py-2 text-xs font-medium uppercase tracking-[0.14em] transition-all duration-200 ${
                    statusFilter === pill.value
                      ? "border-[color:var(--accent-cyan)]/30 bg-[color:var(--accent-cyan)]/10 text-white"
                      : "border-white/[0.06] text-[color:var(--muted-foreground)] hover:border-white/10 hover:bg-white/[0.03] hover:text-white"
                  }`}
                >
                  {pill.label}
                </button>
              ))}
              {REPORT_ISSUE_TYPES.map((value: any) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setIssueTypeFilter((current) => (current === value ? "" : value))}
                  className={`rounded-lg border px-3 py-2 text-xs font-medium uppercase tracking-[0.14em] transition-all duration-200 ${
                    issueTypeFilter === value
                      ? "border-[color:var(--accent-amber)]/30 bg-[color:var(--accent-amber)]/10 text-white"
                      : "border-white/[0.06] text-[color:var(--muted-foreground)] hover:border-white/10 hover:bg-white/[0.03] hover:text-white"
                  }`}
                >
                  {value.replaceAll("_", " ")}
                </button>
              ))}
            </div>
          </Surface>

          <Surface className="p-6">
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-lg font-semibold text-white">Report queue</h3>
              <StatusBadge tone="slate">{(reportsQuery.data as any)?.pagination?.total ?? 0} items</StatusBadge>
            </div>

            <div className="mt-5 grid gap-2.5">
              {reportsQuery.isLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_: any, i: number) => (
                    <div key={i} className="skeleton h-28 rounded-xl" style={{ animationDelay: `${i * 100}ms` }} />
                  ))}
                </div>
              ) : reportRows.length ? (
                reportRows.map((report: any) => {
                  const isSelected = report.id === resolvedSelectedReportId;
                  return (
                    <button
                      key={report.id}
                      type="button"
                      onClick={() => setSelectedReportId(report.id)}
                      className={`relative overflow-hidden rounded-xl border p-4 text-left transition-all duration-200 ${
                        isSelected
                          ? "border-[color:var(--accent-cyan)]/25 bg-[color:var(--accent-cyan)]/6"
                          : "border-white/[0.06] bg-white/[0.02] hover:border-white/10 hover:bg-white/[0.04]"
                      }`}
                    >
                      <span
                        className={`absolute left-0 top-0 h-full w-[3px] rounded-r-full transition-opacity duration-200 ${
                          isSelected
                            ? "bg-[color:var(--accent-cyan)] opacity-100"
                            : "bg-[color:var(--accent-cyan)] opacity-0"
                        }`}
                      />
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-white">{report.question.subject}</p>
                          <p className="mt-0.5 text-xs text-[color:var(--muted-foreground)]">{report.question.topic ?? "No topic"}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusBadge tone={issueToneMap[report.issueType] ?? "slate"}>
                            {report.issueType.replaceAll("_", " ")}
                          </StatusBadge>
                          <StatusBadge tone={statusTone[report.status as keyof typeof statusTone]}>{report.status}</StatusBadge>
                        </div>
                      </div>
                      <p className="mt-3 line-clamp-2 text-sm text-[color:var(--muted-foreground)]">
                        {report.description || report.question.questionText}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-4 text-xs text-[color:var(--muted-foreground)]">
                        <span>By {report.reporter.fullName}</span>
                        <span>{formatDateTime(report.createdAt)}</span>
                      </div>
                    </button>
                  );
                })
              ) : (
                <p className="text-sm text-[color:var(--muted-foreground)]">No reports match the current filters.</p>
              )}
            </div>
          </Surface>
        </div>

        <div className="grid gap-6">
          <Surface glow="cyan" className="p-6">
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[color:var(--accent-cyan)]">Detail</p>
            {selectedReport ? (
              <>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <StatusBadge tone={issueToneMap[selectedReport.issueType] ?? "slate"}>
                    {selectedReport.issueType.replaceAll("_", " ")}
                  </StatusBadge>
                  <StatusBadge tone={statusTone[selectedReport.status]}>{selectedReport.status}</StatusBadge>
                </div>
                <h3 className="mt-3 text-xl font-semibold text-white">{selectedReport.question.subject}</h3>
                <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">
                  {selectedReport.description || "No additional description provided."}
                </p>
                <Link
                  href={`/reports/${selectedReport.id}`}
                  className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-[color:var(--accent-cyan)]"
                >
                  Open full detail page
                  <ArrowRight className="h-4 w-4" />
                </Link>

                <div className="mt-5 space-y-3">
                  <div className="rounded-xl border border-white/8 bg-black/10 p-4">
                    <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[color:var(--muted-foreground)]">Question</p>
                    <p className="mt-2 text-sm text-white">{selectedReport.question.questionText}</p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-white/8 bg-black/10 p-4">
                      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[color:var(--muted-foreground)]">Reporter</p>
                      <p className="mt-2 text-sm font-medium text-white">{selectedReport.reporter.fullName}</p>
                      <p className="mt-0.5 text-xs text-[color:var(--muted-foreground)]">{selectedReport.reporter.email}</p>
                    </div>
                    <div className="rounded-xl border border-white/8 bg-black/10 p-4">
                      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[color:var(--muted-foreground)]">Reported on</p>
                      <p className="mt-2 text-sm font-medium text-white">{formatDateTime(selectedReport.createdAt)}</p>
                      <p className="mt-0.5 text-xs text-[color:var(--muted-foreground)]">Question #{selectedReport.question.id}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-5">
                  <label className="space-y-2">
                    <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-[color:var(--muted-foreground)]">Admin note</span>
                    <textarea
                      rows={4}
                      value={currentAdminNote}
                      onChange={(event) =>
                        setAdminNote((current) => ({
                          ...current,
                          [resolvedSelectedReportId as number]: event.target.value,
                        }))
                      }
                      placeholder="Document your findings and decision..."
                      className="w-full rounded-xl border border-white/8 bg-black/10 px-4 py-3 text-sm text-white outline-none transition placeholder:text-[color:var(--muted-foreground)]/50 focus:border-[color:var(--accent-cyan)]/40"
                    />
                  </label>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => updateMutation.mutate("REVIEWED")}
                    disabled={updateMutation.isPending || currentAdminNote.trim().length < 5}
                    className="inline-flex items-center justify-center rounded-xl bg-[color:var(--accent-cyan)] px-4 py-3 text-sm font-semibold text-[color:var(--background)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <FileWarning className="mr-2 h-4 w-4" />
                    Mark reviewed
                  </button>
                  <button
                    type="button"
                    onClick={() => updateMutation.mutate("RESOLVED")}
                    disabled={updateMutation.isPending || currentAdminNote.trim().length < 5}
                    className="inline-flex items-center justify-center rounded-xl bg-[color:var(--accent-emerald)] px-4 py-3 text-sm font-semibold text-[color:var(--background)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <CheckCheck className="mr-2 h-4 w-4" />
                    Resolve
                  </button>
                </div>

                {session?.user?.role === "SUPERADMIN" ? (
                  <div className="mt-5 rounded-xl border border-[color:var(--accent-rose)]/18 bg-[color:var(--accent-rose)]/8 p-5">
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[color:var(--accent-rose)]/20 bg-[color:var(--accent-rose)]/12 text-[color:var(--accent-rose)]">
                        <AlertTriangle className="h-4 w-4" />
                      </span>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-white">Permanently delete</p>
                        <p className="mt-1.5 text-sm text-[color:var(--muted-foreground)]">
                          This action is irreversible and should only be used for exceptional cleanup.
                        </p>
                        <textarea
                          rows={2}
                          value={hardDeleteReason}
                          onChange={(event) => setHardDeleteReason(event.target.value)}
                          placeholder="Reason for permanent deletion..."
                          className="mt-3 w-full rounded-xl border border-white/8 bg-black/10 px-4 py-3 text-sm text-white outline-none transition placeholder:text-[color:var(--muted-foreground)]/50 focus:border-[color:var(--accent-rose)]/40"
                        />
                        <button
                          type="button"
                          onClick={() => hardDeleteMutation.mutate()}
                          disabled={hardDeleteMutation.isPending || hardDeleteReason.trim().length < 5}
                          className="mt-3 inline-flex items-center justify-center rounded-xl border border-[color:var(--accent-rose)]/20 bg-[color:var(--accent-rose)]/12 px-4 py-2.5 text-sm font-semibold text-[color:var(--accent-rose)] transition hover:bg-[color:var(--accent-rose)]/18 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete report
                        </button>
                      </div>
                    </div>
                  </div>
                ) : null}
              </>
            ) : detailQuery.isLoading ? (
              <p className="mt-4 text-sm text-[color:var(--muted-foreground)]">Loading report details...</p>
            ) : (
              <p className="mt-4 text-sm text-[color:var(--muted-foreground)]">Select a report to view details.</p>
            )}
          </Surface>
        </div>
      </div>
    </section>
  );
}
