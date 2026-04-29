"use client";

import { SectionHeading } from "@/components/ui/section-heading";
import { StatusBadge } from "@/components/ui/status-badge";
import { Surface } from "@/components/ui/surface";
import { useAdminAuditLogs } from "@/features/audit-logs/hooks/use-admin-audit-logs";
import { formatDateTime } from "@/lib/utils/format";
import { ChevronLeft, ChevronRight, Filter, ShieldAlert } from "lucide-react";
import { useState } from "react";

const actionTones: Record<string, "emerald" | "cyan" | "amber" | "rose" | "slate"> = {
  ROLE_PROMOTED: "emerald",
  ROLE_DEMOTED: "amber",
  USER_BANNED: "rose",
  USER_UNBANNED: "cyan",
  DEVICE_REMOVED: "amber",
  EMAIL_SYSTEM_TOGGLED: "cyan",
  QUESTION_DELETED: "rose",
  QUESTION_EDITED: "amber",
  PREMIUM_GRANTED: "emerald",
  PREMIUM_EXTENDED: "cyan",
  PREMIUM_REVOKED: "rose",
  STEP_UP_CHALLENGE_REQUESTED: "cyan",
  STEP_UP_CHALLENGE_VERIFIED: "emerald",
  STEP_UP_CHALLENGE_FAILED: "rose",
  REPORT_REVIEWED: "amber",
  REPORT_RESOLVED: "emerald",
  REPORT_HARD_DELETED: "rose",
  UNAUTHORIZED_ACTION_ATTEMPT: "rose",
  ROLE_PROMOTION_ATTEMPT_FAILED: "rose",
  ROLE_DEMOTION_ATTEMPT_FAILED: "rose",
  EXAM_CHEAT_VIOLATION: "rose",
};

const actionFilters = [
  { label: "All", value: "" },
  { label: "Exam violations", value: "EXAM_CHEAT_VIOLATION" },
  { label: "Role promoted", value: "ROLE_PROMOTED" },
  { label: "Role demoted", value: "ROLE_DEMOTED" },
  { label: "Role promote failed", value: "ROLE_PROMOTION_ATTEMPT_FAILED" },
  { label: "Role demote failed", value: "ROLE_DEMOTION_ATTEMPT_FAILED" },
  { label: "User banned", value: "USER_BANNED" },
  { label: "User unbanned", value: "USER_UNBANNED" },
  { label: "Device removed", value: "DEVICE_REMOVED" },
  { label: "Premium granted", value: "PREMIUM_GRANTED" },
  { label: "Premium extended", value: "PREMIUM_EXTENDED" },
  { label: "Premium revoked", value: "PREMIUM_REVOKED" },
  { label: "Step-up requested", value: "STEP_UP_CHALLENGE_REQUESTED" },
  { label: "Step-up verified", value: "STEP_UP_CHALLENGE_VERIFIED" },
  { label: "Step-up failed", value: "STEP_UP_CHALLENGE_FAILED" },
  { label: "Email toggled", value: "EMAIL_SYSTEM_TOGGLED" },
  { label: "Report reviewed", value: "REPORT_REVIEWED" },
  { label: "Report resolved", value: "REPORT_RESOLVED" },
  { label: "Report deleted", value: "REPORT_HARD_DELETED" },
  { label: "Question edited", value: "QUESTION_EDITED" },
  { label: "Question deleted", value: "QUESTION_DELETED" },
  { label: "Unauthorized", value: "UNAUTHORIZED_ACTION_ATTEMPT" },
];

/** Violation type labels for the enriched card */
const violationTypeLabels: Record<string, string> = {
  tab_switch: "Tab Switch",
  screenshot: "Screenshot Attempt",
  copy_paste: "Copy/Paste",
  right_click: "Right Click",
  devtools: "DevTools Opened",
};

function ViolationDetailCard({ metadata }: { metadata: any }) {
  if (!metadata || typeof metadata !== "object") return null;

  const violationType = metadata.violationType as string | undefined;
  const examId = metadata.examId as number | undefined;
  const violationCount = metadata.violationCount as number | undefined;
  const timestamp = metadata.timestamp as string | undefined;

  return (
    <div className="mt-2 flex items-start gap-3 rounded-xl border border-rose-400/10 bg-rose-400/[0.03] p-3">
      <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-rose-400/60" />
      <div className="grid gap-1.5 text-xs">
        {violationType ? (
          <div>
            <span className="text-[10px] uppercase tracking-widest text-[color:var(--muted-foreground)]">Type</span>
            <p className="font-medium text-rose-300">{violationTypeLabels[violationType] ?? violationType}</p>
          </div>
        ) : null}
        <div className="flex flex-wrap gap-4">
          {examId ? (
            <div>
              <span className="text-[10px] uppercase tracking-widest text-[color:var(--muted-foreground)]">Exam</span>
              <p className="font-mono text-white/70">#{examId}</p>
            </div>
          ) : null}
          {violationCount != null ? (
            <div>
              <span className="text-[10px] uppercase tracking-widest text-[color:var(--muted-foreground)]">Total Violations</span>
              <p className="font-mono text-rose-300">{violationCount}</p>
            </div>
          ) : null}
          {timestamp ? (
            <div>
              <span className="text-[10px] uppercase tracking-widest text-[color:var(--muted-foreground)]">At</span>
              <p className="text-white/50">{new Date(timestamp).toLocaleTimeString()}</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function AuditLogsPage() {
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState("");
  const limit = 25;

  const { data, isLoading } = useAdminAuditLogs({
    page,
    limit,
    action: actionFilter || undefined,
  });

  const logs = data?.logs ?? [];
  const meta = data?.meta;

  return (
    <section className="space-y-6">
      <SectionHeading
        eyebrow="Security"
        title="Audit logs"
        description="Activity history for all admin actions. Filter by action type to investigate specific events."
      />

      <Surface className="p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-[color:var(--muted-foreground)]" />
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {actionFilters.map((filter) => (
                <button
                  key={filter.label}
                  type="button"
                  onClick={() => {
                    setActionFilter(filter.value);
                    setPage(1);
                  }}
                  className={`shrink-0 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                    actionFilter === filter.value
                      ? "border-[color:var(--accent-cyan)]/30 bg-[color:var(--accent-cyan)]/10 text-white"
                      : "border-white/8 text-[color:var(--muted-foreground)] hover:border-white/14 hover:text-white"
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>
          {meta ? (
            <p className="text-sm text-[color:var(--muted-foreground)]">
              {meta.total} entries
            </p>
          ) : null}
        </div>
      </Surface>

      <Surface className="overflow-hidden p-0">
        {isLoading ? (
          <div className="px-5 py-12 text-center text-sm text-[color:var(--muted-foreground)]">
            Loading audit logs...
          </div>
        ) : logs.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-[color:var(--muted-foreground)]">
            No audit logs found for the current filters.
          </div>
        ) : (
          <>
            <div className="grid gap-3 p-3 md:hidden">
              {logs.map((log) => (
                <div key={log.id} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <StatusBadge tone={actionTones[log.action] ?? "slate"}>
                      {log.action.replaceAll("_", " ")}
                    </StatusBadge>
                    <p className="text-xs text-[color:var(--muted-foreground)]">{formatDateTime(log.createdAt)}</p>
                  </div>
                  <div className="mt-3 grid gap-3 text-sm">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.14em] text-[color:var(--muted-foreground)]">Admin</p>
                      <p className="mt-1 font-medium text-white">{log.actor.fullName}</p>
                      <p className="mt-1 text-xs text-[color:var(--muted-foreground)]">{log.actorRole}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.14em] text-[color:var(--muted-foreground)]">Target</p>
                      <p className="mt-1 text-white">
                        {log.targetType ? `${log.targetType}${log.targetId ? ` #${log.targetId}` : ""}` : "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.14em] text-[color:var(--muted-foreground)]">Reason</p>
                      <p className="mt-1 text-[color:var(--muted-foreground)]">{log.reason || "—"}</p>
                    </div>
                    {(log.action as string) === "EXAM_CHEAT_VIOLATION" ? (
                      <ViolationDetailCard metadata={(log as any).metadata} />
                    ) : null}
                  </div>
                </div>
              ))}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-[860px] w-full divide-y divide-white/8 text-sm">
                <thead className="bg-black/15 text-left text-[11px] uppercase tracking-[0.16em] text-[color:var(--muted-foreground)]">
                  <tr>
                    <th className="px-5 py-3">Timestamp</th>
                    <th className="px-5 py-3">Admin</th>
                    <th className="px-5 py-3">Action</th>
                    <th className="px-5 py-3">Target</th>
                    <th className="px-5 py-3">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/8 bg-black/10">
                  {logs.map((log) => (
                    <tr key={log.id} className="transition hover:bg-white/[0.03]">
                      <td className="whitespace-nowrap px-5 py-3.5 text-[color:var(--muted-foreground)]">
                        {formatDateTime(log.createdAt)}
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="font-medium text-white">{log.actor.fullName}</p>
                        <p className="mt-0.5 text-xs text-[color:var(--muted-foreground)]">{log.actorRole}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusBadge tone={actionTones[log.action] ?? "slate"}>
                          {log.action.replaceAll("_", " ")}
                        </StatusBadge>
                      </td>
                      <td className="px-5 py-3.5 text-[color:var(--muted-foreground)]">
                        {log.targetType ? (
                          <span>
                            {log.targetType}
                            {log.targetId ? ` #${log.targetId}` : ""}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="max-w-xs px-5 py-3.5 text-[color:var(--muted-foreground)]">
                        <span className="truncate block">{log.reason || "—"}</span>
                        {(log.action as string) === "EXAM_CHEAT_VIOLATION" ? (
                          <ViolationDetailCard metadata={(log as any).metadata} />
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Surface>

      {meta && meta.totalPages > 1 ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-[color:var(--muted-foreground)]">
            Page {meta.page} of {meta.totalPages}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/8 px-3 py-2 text-sm text-[color:var(--muted-foreground)] transition hover:border-white/14 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
              disabled={page >= meta.totalPages}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/8 px-3 py-2 text-sm text-[color:var(--muted-foreground)] transition hover:border-white/14 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
