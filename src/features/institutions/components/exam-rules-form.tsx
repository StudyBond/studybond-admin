"use client";

import { Button } from "@/components/ui/button";
import { CustomSelect } from "@/components/ui/custom-select";
import { Field } from "@/components/ui/field";
import { SectionTitle } from "@/components/ui/page-header";
import { formatDurationSeconds } from "@/lib/utils/format";
import type {
  AdminInstitutionDetailResponse,
  AdminInstitutionExamConfigInput,
} from "@/lib/api/types";
import { Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type ExamConfig = AdminInstitutionDetailResponse["examConfig"];

/** Only the fields an admin should be able to change from here. */
const NUMBER_GROUPS: Array<{
  title: string;
  description: string;
  fields: Array<{ key: keyof ExamConfig; label: string; hint?: string; seconds?: boolean }>;
}> = [
  {
    title: "Exam shape",
    description: "How many subjects a full exam covers, and how many questions it carries.",
    fields: [
      { key: "maxSubjects", label: "Subjects in a full exam", hint: "JAMB and UI both use 4" },
      { key: "questionsPerSubject", label: "Questions per subject", hint: "Used for partial exams" },
      { key: "fullExamQuestions", label: "Questions in a full exam" },
    ],
  },
  {
    title: "Timing",
    description: "Entered in seconds so odd splits stay exact. The reading underneath is the same number in minutes.",
    fields: [
      { key: "fullExamDurationSeconds", label: "Full exam", seconds: true },
      { key: "singleSubjectDurationSeconds", label: "One subject", seconds: true },
      { key: "twoSubjectDurationSeconds", label: "Two subjects", seconds: true },
      { key: "threeSubjectDurationSeconds", label: "Three subjects", seconds: true },
      { key: "collaborationDurationSeconds", label: "Duel", seconds: true },
    ],
  },
  {
    title: "Free plan",
    description: "What somebody gets before paying.",
    fields: [
      { key: "freeRealExamCount", label: "Free subject credits" },
      { key: "freeFullRealTotalAttempts", label: "Free full exam attempts" },
      { key: "freeQuestionsPerSubject", label: "Free questions per subject" },
    ],
  },
  {
    title: "Premium",
    description: "Daily limits and the gate on duels.",
    fields: [
      { key: "premiumDailyRealExamLimit", label: "Daily subject credits" },
      { key: "collaborationGateRealExams", label: "Real exams before duels unlock" },
    ],
  },
];

const TOGGLES: Array<{ key: keyof ExamConfig; label: string; description: string }> = [
  {
    key: "allowMixedPartialExams",
    label: "Mixed partial exams",
    description: "Let a student mix real and practice questions when sitting fewer than a full set.",
  },
  {
    key: "allowMixedFullExams",
    label: "Mixed full exams",
    description: "Let a full exam mix real and practice questions. Off for a faithful past-paper run.",
  },
  {
    key: "allowPracticeCollaboration",
    label: "Practice duels",
    description: "Let duels be built from practice questions.",
  },
  {
    key: "allowMixedCollaboration",
    label: "Mixed duels",
    description: "Let duels mix real and practice questions.",
  },
  {
    key: "studyModeEnabled",
    label: "Study mode",
    description: "Topic-by-topic practice with explanations.",
  },
];

const SOURCE_OPTIONS = [
  { label: "Official past questions", value: "REAL_PAST_QUESTION" },
  { label: "Practice", value: "PRACTICE" },
  { label: "Mixed", value: "MIXED" },
];

const SOURCE_FIELDS: Array<{ key: keyof ExamConfig; label: string }> = [
  { key: "defaultFullExamSource", label: "Full exam default" },
  { key: "defaultPartialExamSource", label: "Partial exam default" },
  { key: "defaultCollabSource", label: "Duel default" },
];

export function ExamRulesForm({
  examConfig,
  canEdit,
  disabledReason,
  isSaving,
  onSave,
}: {
  examConfig: ExamConfig;
  canEdit: boolean;
  disabledReason?: string;
  isSaving: boolean;
  onSave: (changes: AdminInstitutionExamConfigInput) => void;
}) {
  const [draft, setDraft] = useState<Record<string, string | number | boolean>>({});

  /* Reset the draft whenever the saved config changes, so the form always
     shows what is actually stored rather than a stale edit. */
  useEffect(() => {
    setDraft({});
  }, [examConfig]);

  function valueOf(key: keyof ExamConfig) {
    return key in draft ? draft[key as string] : (examConfig[key] as string | number | boolean);
  }

  function setValue(key: keyof ExamConfig, value: string | number | boolean) {
    setDraft((current) => ({ ...current, [key as string]: value }));
  }

  /* Only send what actually differs from the stored config. */
  const changes = useMemo(() => {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(draft)) {
      const saved = examConfig[key as keyof ExamConfig];
      if (typeof saved === "number") {
        const parsed = Number(value);
        if (Number.isFinite(parsed) && parsed !== saved) result[key] = parsed;
        continue;
      }
      if (value !== saved) result[key] = value;
    }
    return result;
  }, [draft, examConfig]);

  const changeCount = Object.keys(changes).length;

  return (
    <section className="space-y-5">
      <SectionTitle
        title="Exam rules"
        description="These decide how every exam at this institution is built."
        action={
          <Button
            onClick={() => onSave(changes as AdminInstitutionExamConfigInput)}
            disabled={!canEdit || changeCount === 0 || isSaving}
            isLoading={isSaving}
          >
            <Save className="h-4 w-4" />
            {changeCount === 0 ? "No changes" : `Save ${changeCount} change${changeCount === 1 ? "" : "s"}`}
          </Button>
        }
      />

      {!canEdit && disabledReason ? (
        <p className="rounded-[var(--sb-radius)] border border-[var(--sb-border)] bg-[var(--sb-surface-2)] px-3 py-2 text-[length:var(--sb-text-xs)] text-[var(--sb-text-secondary)]">
          {disabledReason}
        </p>
      ) : null}

      {NUMBER_GROUPS.map((group) => (
        <div
          key={group.title}
          className="rounded-[var(--sb-radius-lg)] border border-[var(--sb-border)] bg-[var(--sb-surface-1)] p-4 sm:p-5"
        >
          <h3 className="text-[length:var(--sb-text-md)] font-medium text-[var(--sb-text)]">
            {group.title}
          </h3>
          <p className="mt-1 text-[length:var(--sb-text-base)] text-[var(--sb-text-secondary)]">
            {group.description}
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {group.fields.map((field) => {
              const raw = valueOf(field.key);
              const numeric = Number(raw);
              return (
                <Field
                  key={String(field.key)}
                  type="number"
                  label={field.label}
                  hint={
                    field.seconds && Number.isFinite(numeric)
                      ? formatDurationSeconds(numeric)
                      : field.hint
                  }
                  id={`config-${String(field.key)}`}
                  min={0}
                  disabled={!canEdit || isSaving}
                  value={String(raw ?? "")}
                  onChange={(event) => setValue(field.key, event.target.value)}
                />
              );
            })}
          </div>
        </div>
      ))}

      <div className="rounded-[var(--sb-radius-lg)] border border-[var(--sb-border)] bg-[var(--sb-surface-1)] p-4 sm:p-5">
        <h3 className="text-[length:var(--sb-text-md)] font-medium text-[var(--sb-text)]">
          Question sources
        </h3>
        <p className="mt-1 text-[length:var(--sb-text-base)] text-[var(--sb-text-secondary)]">
          What a student gets when they do not pick a source themselves.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {SOURCE_FIELDS.map((field) => (
            <div key={String(field.key)} className="space-y-1.5">
              <span className="block text-[length:var(--sb-text-xs)] font-medium text-[var(--sb-text-secondary)]">
                {field.label}
              </span>
              <CustomSelect
                value={String(valueOf(field.key) ?? "")}
                onValueChange={(value) => setValue(field.key, value)}
                options={SOURCE_OPTIONS}
                disabled={!canEdit || isSaving}
                aria-label={field.label}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-[var(--sb-radius-lg)] border border-[var(--sb-border)] bg-[var(--sb-surface-1)] p-4 sm:p-5">
        <h3 className="text-[length:var(--sb-text-md)] font-medium text-[var(--sb-text)]">
          What is allowed
        </h3>

        <div className="mt-3 space-y-2">
          {TOGGLES.map((toggle) => (
            <label
              key={String(toggle.key)}
              className="flex cursor-pointer items-start gap-3 rounded-[var(--sb-radius)] px-2 py-2 hover:bg-[var(--sb-surface-2)]"
            >
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--sb-accent)]"
                checked={Boolean(valueOf(toggle.key))}
                disabled={!canEdit || isSaving}
                onChange={(event) => setValue(toggle.key, event.target.checked)}
              />
              <span>
                <span className="block text-[length:var(--sb-text-base)] text-[var(--sb-text)]">
                  {toggle.label}
                </span>
                <span className="block text-[length:var(--sb-text-xs)] text-[var(--sb-text-secondary)]">
                  {toggle.description}
                </span>
              </span>
            </label>
          ))}
        </div>
      </div>
    </section>
  );
}
