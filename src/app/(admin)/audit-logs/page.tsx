"use client";

import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CustomSelect } from "@/components/ui/custom-select";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Field, FieldShell } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page-header";
import { FilterBar, FilterChips, Pagination } from "@/components/ui/toolbar";
import { useAdminAuditLogs } from "@/features/audit-logs/hooks/use-admin-audit-logs";
import type { AdminAuditLogEntry } from "@/lib/api/types";
import { formatDateTime } from "@/lib/utils/format";
import { ScrollText } from "lucide-react";
import { useState } from "react";

/**
 * Admin audit trail.
 *
 * The old page put all twenty-one action types in a single horizontally
 * scrolling chip row. Finding "Premium revoked" meant scrubbing sideways
 * through an undifferentiated list, and nothing told you the chips were
 * mutually exclusive. Two other filters the backend already accepts —
 * `targetType` and a date range — were not on the page at all.
 *
 * It is now two orthogonal questions, each with its own labelled control:
 *
 *   what was affected   targetType, six exclusive chips
 *   what happened       action, one select, options prefixed by category
 *
 * plus a date range, because the first thing anyone asks an audit log is
 * "what happened on the day this broke".
 *
 * Colour follows severity, not variety. The old map picked from five
 * colours per action with no rule behind it — "role promoted" was green,
 * "user unbanned" cyan, "question edited" amber. Now there are three
 * meanings and an auditor can learn them at a glance:
 *
 *   danger   an attempt failed or was blocked — investigate
 *   warning  something privileged or destructive succeeded
 *   neutral  routine
 */

const PAGE_SIZE = 25;

/** Attempts that were refused. These are the rows worth investigating. */
const BLOCKED_ACTIONS = new Set([
  "ROLE_PROMOTION_ATTEMPT_FAILED",
  "ROLE_DEMOTION_ATTEMPT_FAILED",
  "STEP_UP_CHALLENGE_FAILED",
  "UNAUTHORIZED_ACTION_ATTEMPT",
]);

/** Succeeded, but changed privilege or destroyed something. */
const SENSITIVE_ACTIONS = new Set([
  "ROLE_PROMOTED",
  "ROLE_DEMOTED",
  "USER_BANNED",
  "PREMIUM_REVOKED",
  "QUESTION_DELETED",
  "REPORT_HARD_DELETED",
]);

function actionTone(action: string): BadgeTone {
  if (BLOCKED_ACTIONS.has(action)) return "danger";
  if (SENSITIVE_ACTIONS.has(action)) return "warning";
  return "neutral";
}

const ACTION_LABELS: Record<string, string> = {
  ROLE_PROMOTED: "Promoted",
  ROLE_DEMOTED: "Demoted",
  ROLE_PROMOTION_ATTEMPT_FAILED: "Promotion blocked",
  ROLE_DEMOTION_ATTEMPT_FAILED: "Demotion blocked",
  USER_BANNED: "User banned",
  USER_UNBANNED: "User unbanned",
  DEVICE_REMOVED: "Device removed",
  PREMIUM_GRANTED: "Premium granted",
  PREMIUM_EXTENDED: "Premium extended",
  PREMIUM_REVOKED: "Premium revoked",
  STEP_UP_CHALLENGE_REQUESTED: "Step-up requested",
  STEP_UP_CHALLENGE_VERIFIED: "Step-up verified",
  STEP_UP_CHALLENGE_FAILED: "Step-up failed",
  QUESTION_EDITED: "Question edited",
  QUESTION_DELETED: "Question deleted",
  REPORT_REVIEWED: "Report reviewed",
  REPORT_RESOLVED: "Report resolved",
  REPORT_HARD_DELETED: "Report deleted",
  EMAIL_SYSTEM_TOGGLED: "Email system toggled",
  UNAUTHORIZED_ACTION_ATTEMPT: "Unauthorized attempt",
};

function actionLabel(action: string) {
  return ACTION_LABELS[action] ?? action.replaceAll("_", " ").toLowerCase();
}

/**
 * Category prefixes give a flat select the grouping the component cannot
 * render natively, and keep related actions adjacent in the list.
 */
const ACTION_OPTIONS = [
  { label: "Any action", value: "" },

  { label: "Roles · Promoted", value: "ROLE_PROMOTED" },
  { label: "Roles · Demoted", value: "ROLE_DEMOTED" },
  { label: "Roles · Promotion blocked", value: "ROLE_PROMOTION_ATTEMPT_FAILED" },
  { label: "Roles · Demotion blocked", value: "ROLE_DEMOTION_ATTEMPT_FAILED" },

  { label: "Moderation · User banned", value: "USER_BANNED" },
  { label: "Moderation · User unbanned", value: "USER_UNBANNED" },
  { label: "Moderation · Device removed", value: "DEVICE_REMOVED" },

  { label: "Premium · Granted", value: "PREMIUM_GRANTED" },
  { label: "Premium · Extended", value: "PREMIUM_EXTENDED" },
  { label: "Premium · Revoked", value: "PREMIUM_REVOKED" },

  { label: "Security · Step-up requested", value: "STEP_UP_CHALLENGE_REQUESTED" },
  { label: "Security · Step-up verified", value: "STEP_UP_CHALLENGE_VERIFIED" },
  { label: "Security · Step-up failed", value: "STEP_UP_CHALLENGE_FAILED" },
  { label: "Security · Unauthorized attempt", value: "UNAUTHORIZED_ACTION_ATTEMPT" },

  { label: "Content · Question edited", value: "QUESTION_EDITED" },
  { label: "Content · Question deleted", value: "QUESTION_DELETED" },
  { label: "Content · Report reviewed", value: "REPORT_REVIEWED" },
  { label: "Content · Report resolved", value: "REPORT_RESOLVED" },
  { label: "Content · Report deleted", value: "REPORT_HARD_DELETED" },

  { label: "System · Email system toggled", value: "EMAIL_SYSTEM_TOGGLED" },
];

const TARGET_OPTIONS = [
  { label: "Everything", value: "" },
  { label: "Users", value: "USER" },
  { label: "Questions", value: "QUESTION" },
  { label: "Devices", value: "DEVICE" },
  { label: "Reports", value: "REPORT" },
  { label: "System", value: "SYSTEM" },
];

/**
 * A date input gives us "2026-08-31", and the backend does
 * `createdAt.lte = new Date(value)` — which is UTC midnight. Sent as-is,
 * picking today as the end date would exclude everything that happened
 * today. So each bound is widened to the edge of that day, parsed in the
 * admin's own timezone rather than UTC, and sent as a full timestamp.
 */
function dayStart(value: string) {
  return value ? new Date(`${value}T00:00:00`).toISOString() : undefined;
}

function dayEnd(value: string) {
  return value ? new Date(`${value}T23:59:59.999`).toISOString() : undefined;
}

export default function AuditLogsPage() {
  const [page, setPage] = useState(1);
  const [action, setAction] = useState("");
  const [targetType, setTargetType] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  /** Any filter change returns to page 1 — page 7 of a new result set is a dead end. */
  function applyFilter(set: (value: string) => void) {
    return (value: string) => {
      set(value);
      setPage(1);
    };
  }

  const isRangeBackwards = Boolean(
    startDate && endDate && startDate > endDate,
  );

  const logsQuery = useAdminAuditLogs({
    page,
    limit: PAGE_SIZE,
    action: action || undefined,
    targetType: targetType || undefined,
    startDate: dayStart(startDate),
    endDate: dayEnd(endDate),
  });

  const logs: AdminAuditLogEntry[] = logsQuery.data?.logs ?? [];
  const meta = logsQuery.data?.meta;
  const hasActiveFilters = Boolean(
    action || targetType || startDate || endDate,
  );

  function clearFilters() {
    setAction("");
    setTargetType("");
    setStartDate("");
    setEndDate("");
    setPage(1);
  }

  const columns: Column<AdminAuditLogEntry>[] = [
    {
      key: "action",
      header: "Action",
      primary: true,
      width: "13rem",
      cell: (log) => (
        <Badge tone={actionTone(log.action)} dot={BLOCKED_ACTIONS.has(log.action)}>
          {actionLabel(log.action)}
        </Badge>
      ),
    },
    {
      key: "time",
      header: "When",
      width: "12rem",
      cell: (log) => (
        <span className="sb-nums whitespace-nowrap">
          {formatDateTime(log.createdAt)}
        </span>
      ),
    },
    {
      key: "actor",
      header: "Admin",
      cell: (log) => (
        <div className="min-w-0">
          <p className="truncate text-[var(--sb-text)]">{log.actor.fullName}</p>
          <p className="truncate text-[length:var(--sb-text-xs)] text-[var(--sb-text-tertiary)]">
            {log.actorRole}
          </p>
        </div>
      ),
    },
    {
      key: "target",
      header: "Target",
      width: "9rem",
      cell: (log) => (
        <span className="whitespace-nowrap">
          {log.targetType}
          {log.targetId ? (
            <span className="sb-nums text-[var(--sb-text-tertiary)]">
              {" "}
              #{log.targetId}
            </span>
          ) : null}
        </span>
      ),
    },
    {
      key: "reason",
      header: "Reason",
      showFrom: "lg",
      cell: (log) =>
        log.reason ? (
          <span className="line-clamp-2">{log.reason}</span>
        ) : (
          <span className="text-[var(--sb-text-tertiary)]">No reason given</span>
        ),
    },
    {
      key: "ip",
      header: "IP",
      showFrom: "xl",
      width: "9rem",
      cell: (log) =>
        log.ipAddress ? (
          <span className="sb-mono text-[length:var(--sb-text-xs)]">
            {log.ipAddress}
          </span>
        ) : (
          <span className="text-[var(--sb-text-tertiary)]">—</span>
        ),
    },
  ];

  return (
    <div className="sb-enter space-y-6 pb-2">
      <PageHeader
        title="Audit logs"
        description="Every privileged action taken in this console, newest first. Red means an attempt was blocked; amber means something privileged or destructive went through."
      />

      <div className="space-y-3">
        <FieldShell label="What was affected">
          <FilterChips
            options={TARGET_OPTIONS}
            value={targetType}
            onChange={applyFilter(setTargetType)}
          />
        </FieldShell>

        <FilterBar>
          <FieldShell label="Action">
            <CustomSelect
              aria-label="Filter by action"
              value={action}
              onValueChange={applyFilter(setAction)}
              options={ACTION_OPTIONS}
              placeholder="Any action"
            />
          </FieldShell>

          <FieldShell label="From">
            <Field
              type="date"
              value={startDate}
              max={endDate || undefined}
              onChange={(event) => {
                setStartDate(event.target.value);
                setPage(1);
              }}
              aria-label="Show entries from this date"
            />
          </FieldShell>

          <FieldShell label="To">
            <Field
              type="date"
              value={endDate}
              min={startDate || undefined}
              onChange={(event) => {
                setEndDate(event.target.value);
                setPage(1);
              }}
              aria-label="Show entries up to this date"
            />
          </FieldShell>
        </FilterBar>

        {isRangeBackwards ? (
          <p className="text-[length:var(--sb-text-xs)] text-[var(--sb-warning)]">
            The start date is after the end date, so nothing can match. Swap them
            to see results.
          </p>
        ) : null}
      </div>

      <DataTable
        caption="Admin audit trail"
        items={logs}
        columns={columns}
        getKey={(log) => log.id}
        isLoading={logsQuery.isLoading}
        error={logsQuery.isError ? logsQuery.error : undefined}
        onRetry={() => logsQuery.refetch()}
        emptyIcon={<ScrollText className="h-4 w-4" />}
        emptyTitle={
          hasActiveFilters ? "Nothing matches these filters" : "No admin activity yet"
        }
        emptyDescription={
          hasActiveFilters
            ? "Widen the date range, or set the action back to Any."
            : "Privileged actions are recorded here as admins perform them."
        }
        emptyAction={
          hasActiveFilters ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={clearFilters}
            >
              Clear filters
            </Button>
          ) : null
        }
      />

      {meta ? (
        <Pagination
          page={meta.page}
          totalPages={meta.totalPages}
          total={meta.total}
          pageSize={meta.limit}
          onPageChange={setPage}
        />
      ) : null}
    </div>
  );
}
