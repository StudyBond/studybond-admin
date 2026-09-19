"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  adminInstitutionsApi,
  type AdminInstitutionStudentStatus,
} from "@/lib/api/admin-institutions";
import { cn } from "@/lib/utils/cn";
import { useMutation } from "@tanstack/react-query";
import { AlertTriangle, Eye, EyeOff, Clock } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

/**
 * Who can see this exam.
 *
 * This is the safety catch for launching a new one. A hidden exam still
 * accepts questions from the content team, so it can be built in full, and it
 * answers exactly as an exam that does not exist would, so students cannot
 * find it by guessing its code. It only becomes real when someone opens it
 * here, on purpose.
 */

type Props = {
  institutionId: number;
  currentStatus: AdminInstitutionStudentStatus;
  canEdit: boolean;
  disabledReason?: string;
  stepUpToken: string | null;
  onSaved: () => void | Promise<void>;
};

const CHOICES: Array<{
  value: AdminInstitutionStudentStatus;
  label: string;
  hint: string;
  icon: typeof Eye;
}> = [
  {
    value: "HIDDEN",
    label: "Hidden",
    hint: "Students cannot see it or reach it. The content team can still load questions.",
    icon: EyeOff,
  },
  {
    value: "COMING_SOON",
    label: "Coming soon",
    hint: "Shown in signup and the exam switcher, but nobody can pick it yet.",
    icon: Clock,
  },
  {
    value: "OPEN",
    label: "Open",
    hint: "Students can pick this exam and start using it straight away.",
    icon: Eye,
  },
];

const TONE: Record<AdminInstitutionStudentStatus, "neutral" | "warning" | "success"> = {
  HIDDEN: "neutral",
  COMING_SOON: "warning",
  OPEN: "success",
};

export function BoardStatusControl({
  institutionId,
  currentStatus,
  canEdit,
  disabledReason,
  stepUpToken,
  onSaved,
}: Props) {
  const [choice, setChoice] = useState<AdminInstitutionStudentStatus>(currentStatus);

  const mutation = useMutation({
    mutationFn: (studentStatus: AdminInstitutionStudentStatus) =>
      adminInstitutionsApi.update(institutionId, { studentStatus }, { stepUpToken }),
    onSuccess: async (result) => {
      toast.success(result.message ?? "Saved.");
      /* The backend returns things worth knowing rather than refusing, for
         example opening an exam that has no questions yet. */
      result.warnings?.forEach((warning) => toast.warning(warning));
      await onSaved();
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : "Could not save.");
    },
  });

  const selected = CHOICES.find((entry) => entry.value === choice) ?? CHOICES[0];
  const hasChanged = choice !== currentStatus;

  return (
    <section className="rounded-[var(--sb-radius-lg)] border border-[var(--sb-border)] bg-[var(--sb-surface-1)] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[length:var(--sb-text-md)] font-medium text-[var(--sb-text)]">
            Who can see this exam
          </h2>
          <p className="mt-1 text-[length:var(--sb-text-base)] text-[var(--sb-text-secondary)]">
            A new exam starts hidden so it can be prepared in full before anyone
            finds it.
          </p>
        </div>
        <Badge tone={TONE[currentStatus]}>
          {CHOICES.find((entry) => entry.value === currentStatus)?.label ?? currentStatus}
        </Badge>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {CHOICES.map((entry) => {
          const Icon = entry.icon;
          const isChoice = entry.value === choice;

          return (
            <button
              key={entry.value}
              type="button"
              disabled={!canEdit || mutation.isPending}
              onClick={() => setChoice(entry.value)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-[var(--sb-radius)] border px-3 py-1.5",
                "text-[length:var(--sb-text-sm)] transition-colors",
                isChoice
                  ? "border-[var(--sb-accent)] bg-[var(--sb-bg-inset)] text-[var(--sb-text)]"
                  : "border-[var(--sb-border)] text-[var(--sb-text-secondary)] hover:text-[var(--sb-text)]",
                (!canEdit || mutation.isPending) && "cursor-not-allowed opacity-60",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {entry.label}
            </button>
          );
        })}
      </div>

      <p className="mt-3 text-[length:var(--sb-text-base)] text-[var(--sb-text-secondary)]">
        {selected.hint}
      </p>

      {choice === "OPEN" && currentStatus !== "OPEN" ? (
        <p className="mt-3 flex items-start gap-2 text-[length:var(--sb-text-base)] text-[var(--sb-text)]">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--sb-warning)]" />
          <span>
            Students will be able to pick this exam as soon as you save. Make
            sure its subjects and questions are in place first.
          </span>
        </p>
      ) : null}

      {!canEdit && disabledReason ? (
        <p className="mt-3 text-[length:var(--sb-text-base)] text-[var(--sb-text-tertiary)]">
          {disabledReason}
        </p>
      ) : null}

      {canEdit ? (
        <div className="mt-4 flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            disabled={!hasChanged || mutation.isPending}
            onClick={() => mutation.mutate(choice)}
          >
            {mutation.isPending ? "Saving…" : "Save"}
          </Button>
          {hasChanged ? (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={mutation.isPending}
              onClick={() => setChoice(currentStatus)}
            >
              Cancel
            </Button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
