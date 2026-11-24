"use client";

import { ApiErrorMessage } from "@/components/ui/api-error-message";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { ErrorState } from "@/components/ui/error-state";
import { SectionTitle } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard, StatGrid } from "@/components/ui/stat-card";
import { useAdminStepUp } from "@/features/admin-auth/hooks/use-admin-step-up";
import { adminSystemApi } from "@/lib/api/admin-system";
import type { AdminAlertStatus } from "@/lib/api/types";
import { formatDateTime, formatInteger } from "@/lib/utils/format";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pause, Play, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

/**
 * The pause button (plan section 10, canvas board 7).
 *
 * For a bad day, like a bug that sends the same alert 50 times. While
 * paused, notes still land in students' inboxes; only the buzzing on phones
 * and laptops stops, and waiting alerts are held. On resume the admin picks:
 * drop held alerts older than an hour (the default, so a 9 pm streak alert
 * doesn't arrive at 1 am) or send everything.
 *
 * Stored in the database, superadmin + step-up, every change audited.
 */

export const alertStatusKey = ["admin", "alerts", "status"] as const;

function minutesAgo(iso: string) {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  const hours = Math.round(mins / 60);
  return `${hours} hour${hours === 1 ? "" : "s"} ago`;
}

function timeOnly(iso: string | null) {
  if (!iso) return "None";
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit", hour12: true });
}

export function AlertStatusPanel() {
  const queryClient = useQueryClient();
  const { isActive: isStepUpActive, stepUp } = useAdminStepUp();
  const [dropOld, setDropOld] = useState(true);

  const status = useQuery({
    queryKey: alertStatusKey,
    queryFn: adminSystemApi.getAlertStatus,
    refetchInterval: 30_000,
    staleTime: 10_000,
  });

  const onDone = (data: AdminAlertStatus) => {
    queryClient.setQueryData(alertStatusKey, data);
    void queryClient.invalidateQueries({ queryKey: ["admin", "notification-announcements"] });
  };

  const pause = useMutation({
    mutationFn: async () => {
      if (!stepUp?.stepUpToken) throw new Error("Step-up verification required.");
      return adminSystemApi.pauseAlerts({ stepUpToken: stepUp.stepUpToken });
    },
    onSuccess: (data) => {
      onDone(data);
      toast.success("All alerts are paused", { description: "Notes still land in students' inboxes." });
    },
    onError: (error) => toast.error("Could not pause alerts", { description: <ApiErrorMessage error={error} fallback="Please try again." /> }),
  });

  const resume = useMutation({
    mutationFn: async () => {
      if (!stepUp?.stepUpToken) throw new Error("Step-up verification required.");
      return adminSystemApi.resumeAlerts(dropOld, { stepUpToken: stepUp.stepUpToken });
    },
    onSuccess: (data) => {
      onDone(data);
      toast.success("Alerts are going out again");
    },
    onError: (error) => toast.error("Could not resume alerts", { description: <ApiErrorMessage error={error} fallback="Please try again." /> }),
  });

  const data = status.data;
  const paused = data?.paused ?? null;

  return (
    <section className="min-w-0 space-y-3">
      <SectionTitle
        title="Alerts on phones and laptops"
        description="The pause button only stops the buzzing. Notes always land in students' inboxes."
        action={
          <Badge tone={isStepUpActive ? "success" : "warning"} dot>
            {isStepUpActive ? "Verified" : "Step-up needed"}
          </Badge>
        }
      />

      {status.isLoading ? (
        <Skeleton className="h-56 w-full" />
      ) : status.isError || !data ? (
        <ErrorState title="Could not load the alert status" error={status.error} onRetry={() => status.refetch()} />
      ) : (
        <div
          className={
            paused
              ? "rounded-[var(--sb-radius-lg)] border border-[var(--sb-warning-ring)] bg-[var(--sb-surface-1)] p-4 sm:p-5"
              : "rounded-[var(--sb-radius-lg)] border border-[var(--sb-border)] bg-[var(--sb-surface-1)] p-4 sm:p-5"
          }
        >
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={paused ? "warning" : "success"} dot>
              {paused ? "Paused" : "Running"}
            </Badge>
            <h2 className="text-[length:var(--sb-text-lg)] font-semibold text-[var(--sb-text)]">
              {paused ? "Alerts are paused" : "Alerts are going out"}
            </h2>
          </div>

          {paused ? (
            <p className="mt-2 text-[length:var(--sb-text-base)] text-[var(--sb-text-secondary)]">
              Paused by <span className="text-[var(--sb-text)]">{paused.by?.name ?? "an admin"}</span> at{" "}
              {formatDateTime(paused.at)}, {minutesAgo(paused.at)}. Notes still land in inboxes.
            </p>
          ) : null}

          <StatGrid className="mt-4 lg:grid-cols-3">
            {paused ? (
              <>
                <StatCard label="Alerts held" value={formatInteger(data.waiting)} status={data.waiting > 0 ? "warning" : undefined} />
                <StatCard label="Oldest held" value={timeOnly(data.oldestWaitingAt)} />
                <StatCard label="Newest held" value={timeOnly(data.newestWaitingAt)} />
              </>
            ) : (
              <>
                <StatCard label="Sent in the last hour" value={formatInteger(data.sentLastHour)} />
                <StatCard label="Waiting to send" value={formatInteger(data.waiting)} />
                <StatCard label="Failed today" value={formatInteger(data.failedToday)} status={data.failedToday > 0 ? "danger" : undefined} />
              </>
            )}
          </StatGrid>

          <p className="mt-3 text-[length:var(--sb-text-xs)] text-[var(--sb-text-tertiary)]">
            {formatInteger(data.devicesWithAlerts)} device{data.devicesWithAlerts === 1 ? "" : "s"} have alerts on.
          </p>

          {paused ? (
            <fieldset className="mt-4 grid gap-2">
              <legend className="mb-2 text-[length:var(--sb-text-sm)] font-medium text-[var(--sb-text-secondary)]">When you resume</legend>
              <label className="flex cursor-pointer items-start gap-3 rounded-[var(--sb-radius)] border border-[var(--sb-border)] bg-[var(--sb-bg-inset)] p-3">
                <input type="radio" name="held" checked={dropOld} onChange={() => setDropOld(true)} className="mt-0.5 h-4 w-4 accent-[var(--sb-accent)]" />
                <span>
                  <span className="block text-[length:var(--sb-text-sm)] font-medium text-[var(--sb-text)]">Drop held alerts older than an hour</span>
                  <span className="mt-0.5 block text-[length:var(--sb-text-xs)] text-[var(--sb-text-tertiary)]">
                    So a 9 pm streak alert doesn&apos;t arrive at 1 am. {formatInteger(data.waitingOlderThanHour)} of the{" "}
                    {formatInteger(data.waiting)} would be dropped.
                  </span>
                </span>
              </label>
              <label className="flex cursor-pointer items-start gap-3 rounded-[var(--sb-radius)] border border-[var(--sb-border)] bg-[var(--sb-bg-inset)] p-3">
                <input type="radio" name="held" checked={!dropOld} onChange={() => setDropOld(false)} className="mt-0.5 h-4 w-4 accent-[var(--sb-accent)]" />
                <span>
                  <span className="block text-[length:var(--sb-text-sm)] font-medium text-[var(--sb-text)]">Send everything that was held</span>
                  <span className="mt-0.5 block text-[length:var(--sb-text-xs)] text-[var(--sb-text-tertiary)]">
                    All {formatInteger(data.waiting)} go out as soon as you resume.
                  </span>
                </span>
              </label>
            </fieldset>
          ) : null}

          <div className="mt-4 flex flex-wrap items-center gap-3">
            {paused ? (
              <ConfirmButton
                variant="primary"
                confirmLabel="Yes, resume"
                onConfirm={() => resume.mutate()}
                disabled={!isStepUpActive || resume.isPending}
                isLoading={resume.isPending}
                icon={<Play className="h-4 w-4" />}
              >
                Resume alerts
              </ConfirmButton>
            ) : (
              <ConfirmButton
                variant="danger"
                confirmLabel="Yes, pause all"
                onConfirm={() => pause.mutate()}
                disabled={!isStepUpActive || pause.isPending}
                isLoading={pause.isPending}
                icon={<Pause className="h-4 w-4" />}
              >
                Pause all alerts
              </ConfirmButton>
            )}
            {!isStepUpActive ? (
              <Button asChild href="/step-up?next=/alerts&intent=Alerts%20and%20news" variant="secondary" size="sm">
                <ShieldCheck className="h-3.5 w-3.5" />
                Verify first
              </Button>
            ) : (
              <span className="text-[length:var(--sb-text-xs)] text-[var(--sb-text-tertiary)]">Superadmin only. Recorded in the audit log.</span>
            )}
          </div>
        </div>
      )}

      {data ? (
        <div className="rounded-[var(--sb-radius-lg)] border border-[var(--sb-border)] bg-[var(--sb-surface-1)] p-4 sm:p-5">
          <h3 className="text-[length:var(--sb-text-md)] font-medium text-[var(--sb-text)]">History</h3>
          {data.history.length === 0 ? (
            <p className="mt-2 text-[length:var(--sb-text-sm)] text-[var(--sb-text-tertiary)]">Alerts have never been paused.</p>
          ) : (
            <ul className="mt-2 divide-y divide-[var(--sb-border)]">
              {data.history.map((entry) => (
                <li key={`${entry.action}-${entry.at}`} className="flex flex-wrap justify-between gap-3 py-2.5 text-[length:var(--sb-text-sm)] text-[var(--sb-text-secondary)]">
                  <span>
                    <span className="font-medium text-[var(--sb-text)]">{entry.action === "PAUSED" ? "Paused" : "Resumed"}</span>
                    {" "}by {entry.by?.name ?? "an admin"}
                    {entry.action === "RESUMED" && entry.dropped !== null
                      ? entry.dropped > 0
                        ? ` · dropped ${formatInteger(entry.dropped)} old alert${entry.dropped === 1 ? "" : "s"}`
                        : " · sent everything held"
                      : ""}
                  </span>
                  <span className="tabular-nums">{formatDateTime(entry.at)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </section>
  );
}
