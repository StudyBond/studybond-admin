"use client";

import Link from "next/link";
import { ApiErrorMessage } from "@/components/ui/api-error-message";
import { SectionHeading } from "@/components/ui/section-heading";
import { StatusBadge } from "@/components/ui/status-badge";
import { Surface } from "@/components/ui/surface";
import { useAdminSession } from "@/features/admin-auth/hooks/use-admin-session";
import { useAdminReport } from "@/features/reports/hooks/use-admin-report";
import { adminReportsApi } from "@/lib/api/admin-reports";
import { formatDateTime } from "@/lib/utils/format";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCheck,
  FileWarning,
  LoaderCircle,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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

export default function ReportDetailPage() {
  const params = useParams<{ id: string }>();
  const reportId = Number.parseInt(params.id, 10);
  const queryClient = useQueryClient();
  const { data: session } = useAdminSession();
  const reportQuery = useAdminReport(Number.isFinite(reportId) ? reportId : undefined);
  const report = reportQuery.data as any;

  const [adminNote, setAdminNote] = useState("");
  const [hardDeleteReason, setHardDeleteReason] = useState("");

  useEffect(() => {
    setAdminNote(report?.adminNote ?? "");
  }, [report?.adminNote]);

  const updateMutation = useMutation({
    mutationFn: (status: "REVIEWED" | "RESOLVED") =>
      adminReportsApi.updateStatus(reportId, {
        status,
        adminNote: adminNote.trim(),
      }),
    onSuccess: async (payload: any) => {
      toast.success(`Report marked ${payload.status.toLowerCase()}`);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin", "reports"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "report", reportId] }),
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
      adminReportsApi.hardDelete(reportId, {
        reason: hardDeleteReason.trim(),
      }),
    onSuccess: async (payload: any) => {
      toast.success(payload.message);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin", "reports"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "report", reportId] }),
      ]);
      setHardDeleteReason("");
    },
    onError: (error) => {
      toast.error("Could not delete report", {
        description: <ApiErrorMessage error={error} fallback="Please try again." />,
      });
    },
  });

  const reportMeta = useMemo(
    () => [
      {
        label: "Reporter",
        value: report?.reporter.fullName ?? "Unavailable",
        helper: report?.reporter.email ?? "No reporter email",
      },
      {
        label: "Subject",
        value: report?.question.subject ?? "Unavailable",
        helper: report?.question.topic ?? "No topic assigned",
      },
      {
        label: "Reported",
        value: report?.createdAt ? formatDateTime(report.createdAt) : "Unavailable",
        helper: report?.reviewedAt ? `Reviewed ${formatDateTime(report.reviewedAt)}` : "Not reviewed yet",
      },
      {
        label: "Question",
        value: report ? `#${report.question.id}` : "Unavailable",
        helper: report?.question.questionPool ?? "No pool",
      },
    ],
    [report],
  );

  return (
    <section className="space-y-6">
      <SectionHeading
        eyebrow="Reports"
        title={report ? `Report #${report.id}` : "Report detail"}
        description="Inspect the report payload, preserve moderator notes, and take the appropriate moderation action."
        action={
          <Link
            href="/reports"
            className="inline-flex items-center gap-2 rounded-xl border border-white/8 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-white transition hover:border-white/14 hover:bg-white/[0.06]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to reports
          </Link>
        }
      />

      {reportQuery.isLoading ? (
        <Surface className="p-6">
          <p className="text-sm text-[color:var(--muted-foreground)]">Loading report details...</p>
        </Surface>
      ) : null}

      {reportQuery.isError ? (
        <Surface glow="rose" className="p-6">
          <p className="text-base font-semibold text-white">Could not load this report.</p>
          <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">
            <ApiErrorMessage error={reportQuery.error} fallback="Please try again." />
          </p>
        </Surface>
      ) : null}

      {report ? (
        <div className="grid gap-6 2xl:grid-cols-[1.14fr_0.86fr]">
          <div className="grid gap-6">
            <Surface glow="cyan" className="p-6">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge tone={issueToneMap[report.issueType] ?? "slate"}>
                  {report.issueType.replaceAll("_", " ")}
                </StatusBadge>
                <StatusBadge tone={statusTone[report.status as keyof typeof statusTone]}>{report.status}</StatusBadge>
                {report.question.hasImage ? <StatusBadge tone="cyan">has image</StatusBadge> : null}
              </div>

              <h2 className="mt-4 text-2xl font-semibold text-white">{report.question.subject}</h2>
              <p className="mt-2 text-sm leading-7 text-[color:var(--muted-foreground)]">
                {report.description || "The reporter did not add extra notes for this issue."}
              </p>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {reportMeta.map((item: any) => (
                  <div key={item.label} className="rounded-xl border border-white/8 bg-black/10 p-4">
                    <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[color:var(--muted-foreground)]">
                      {item.label}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-white">{item.value}</p>
                    <p className="mt-1 text-xs text-[color:var(--muted-foreground)]">{item.helper}</p>
                  </div>
                ))}
              </div>
            </Surface>

            <Surface className="p-6">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[color:var(--accent-amber)]">
                  Prompt
                </p>
                <h2 className="mt-2 text-xl font-semibold text-white">Question snapshot</h2>
              </div>

              <div className="mt-5 space-y-4">
                <div className="rounded-xl border border-white/8 bg-black/10 p-5">
                  <p className="text-sm leading-7 text-white">{report.question.questionText}</p>
                </div>

                {report.question.imageUrl ? (
                  <div className="overflow-hidden rounded-xl border border-white/8 bg-black/10">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={report.question.imageUrl}
                      alt={`Question ${report.question.id}`}
                      className="max-h-[420px] w-full object-cover"
                    />
                  </div>
                ) : null}
              </div>
            </Surface>
          </div>

          <div className="grid gap-6">
            <Surface glow="amber" className="p-6">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[color:var(--accent-amber)]">
                  Moderator note
                </p>
                <h2 className="mt-2 text-xl font-semibold text-white">Decision log</h2>
              </div>

              <div className="mt-5">
                <textarea
                  rows={7}
                  value={adminNote}
                  onChange={(event) => setAdminNote(event.target.value)}
                  placeholder="Document what was checked, the conclusion reached, and any follow-up work..."
                  className="w-full rounded-xl border border-white/8 bg-black/10 px-4 py-3 text-sm text-white outline-none transition placeholder:text-[color:var(--muted-foreground)]/50 focus:border-[color:var(--accent-cyan)]/40"
                />
              </div>

              <div className="mt-5 grid gap-3">
                <button
                  type="button"
                  onClick={() => updateMutation.mutate("REVIEWED")}
                  disabled={updateMutation.isPending || adminNote.trim().length < 5}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[color:var(--accent-cyan)] px-4 py-3 text-sm font-semibold text-[color:var(--background)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {updateMutation.isPending ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <FileWarning className="h-4 w-4" />
                  )}
                  Mark reviewed
                </button>
                <button
                  type="button"
                  onClick={() => updateMutation.mutate("RESOLVED")}
                  disabled={updateMutation.isPending || adminNote.trim().length < 5}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[color:var(--accent-emerald)] px-4 py-3 text-sm font-semibold text-[color:var(--background)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {updateMutation.isPending ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCheck className="h-4 w-4" />
                  )}
                  Resolve report
                </button>
              </div>
            </Surface>

            <Surface className="p-6">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[color:var(--accent-cyan)]">
                  Audit
                </p>
                <h2 className="mt-2 text-xl font-semibold text-white">Review ownership</h2>
              </div>

              <div className="mt-5 space-y-3">
                <div className="rounded-xl border border-white/8 bg-black/10 p-4">
                  <p className="text-xs text-[color:var(--muted-foreground)]">Reviewed by</p>
                  <p className="mt-2 text-sm font-semibold text-white">
                    {report.reviewedByAdmin?.fullName ?? "Not assigned"}
                  </p>
                  <p className="mt-1 text-xs text-[color:var(--muted-foreground)]">
                    {report.reviewedByAdmin?.email ?? "Awaiting review"}
                  </p>
                </div>
                <div className="rounded-xl border border-white/8 bg-black/10 p-4">
                  <p className="text-xs text-[color:var(--muted-foreground)]">Resolved by</p>
                  <p className="mt-2 text-sm font-semibold text-white">
                    {report.resolvedByAdmin?.fullName ?? "Not resolved"}
                  </p>
                  <p className="mt-1 text-xs text-[color:var(--muted-foreground)]">
                    {report.resolvedByAdmin?.email ?? "Still open"}
                  </p>
                </div>
              </div>
            </Surface>

            {session?.user?.role === "SUPERADMIN" ? (
              <Surface glow="rose" className="p-6">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[color:var(--accent-rose)]/20 bg-[color:var(--accent-rose)]/10 text-[color:var(--accent-rose)]">
                    <AlertTriangle className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-base font-semibold text-white">Hard delete report</p>
                    <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">
                      This permanently removes the report record. Use it only for exceptional cleanup or invalid submissions.
                    </p>
                  </div>
                </div>

                <textarea
                  rows={3}
                  value={hardDeleteReason}
                  onChange={(event) => setHardDeleteReason(event.target.value)}
                  placeholder="Reason for permanent deletion..."
                  className="mt-5 w-full rounded-xl border border-white/8 bg-black/10 px-4 py-3 text-sm text-white outline-none transition placeholder:text-[color:var(--muted-foreground)]/50 focus:border-[color:var(--accent-rose)]/40"
                />

                <button
                  type="button"
                  onClick={() => hardDeleteMutation.mutate()}
                  disabled={hardDeleteMutation.isPending || hardDeleteReason.trim().length < 5}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[color:var(--accent-rose)]/20 bg-[color:var(--accent-rose)]/10 px-4 py-3 text-sm font-semibold text-[color:var(--accent-rose)] transition hover:bg-[color:var(--accent-rose)]/15 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {hardDeleteMutation.isPending ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  Delete report permanently
                </button>
              </Surface>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
