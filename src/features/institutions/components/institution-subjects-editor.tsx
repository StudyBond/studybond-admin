"use client";

import { Button } from "@/components/ui/button";
import { CustomSelect } from "@/components/ui/custom-select";
import { Field } from "@/components/ui/field";
import { SectionTitle } from "@/components/ui/page-header";
import { formatDurationSeconds } from "@/lib/utils/format";
import type {
  AdminInstitutionDetailResponse,
  AdminInstitutionSubjectsInput,
  AdminSubjectCatalogueItem,
} from "@/lib/api/types";
import { Plus, Save, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type DetailSubject = AdminInstitutionDetailResponse["subjects"][number];

type Row = {
  subjectId: number;
  canonicalName: string;
  code: string;
  questionCount: string;
  soloDurationSeconds: string;
  freeQuestionCount: string;
  isCompulsory: boolean;
  displayOrder: string;
  isActive: boolean;
  bankQuestionCount: number;
};

function toRow(subject: DetailSubject): Row {
  return {
    subjectId: subject.subjectId,
    canonicalName: subject.canonicalName,
    code: subject.code,
    questionCount: String(subject.questionCount),
    soloDurationSeconds: String(subject.soloDurationSeconds),
    freeQuestionCount:
      subject.freeQuestionCount === null ? "" : String(subject.freeQuestionCount),
    isCompulsory: subject.isCompulsory,
    displayOrder: String(subject.displayOrder),
    isActive: subject.isActive,
    bankQuestionCount: subject.bankQuestionCount,
  };
}

export function InstitutionSubjectsEditor({
  subjects,
  catalogue,
  maxSubjects,
  fullExamQuestions,
  fullExamDurationSeconds,
  canEdit,
  disabledReason,
  isSaving,
  onSave,
}: {
  subjects: DetailSubject[];
  catalogue: AdminSubjectCatalogueItem[];
  maxSubjects: number;
  fullExamQuestions: number;
  fullExamDurationSeconds: number;
  canEdit: boolean;
  disabledReason?: string;
  isSaving: boolean;
  onSave: (payload: AdminInstitutionSubjectsInput) => void;
}) {
  const [rows, setRows] = useState<Row[]>(() => subjects.map(toRow));
  const [toAdd, setToAdd] = useState("");

  useEffect(() => {
    setRows(subjects.map(toRow));
  }, [subjects]);

  function update(subjectId: number, patch: Partial<Row>) {
    setRows((current) =>
      current.map((row) => (row.subjectId === subjectId ? { ...row, ...patch } : row)),
    );
  }

  const attachedIds = new Set(rows.map((row) => row.subjectId));
  const addable = catalogue.filter(
    (subject) => subject.isActive && !attachedIds.has(subject.id),
  );

  /* The same sum the student will experience: the first maxSubjects active
     subjects, in display order. Shown live so a mismatch is visible while
     typing rather than after saving. */
  const totals = useMemo(() => {
    const active = [...rows]
      .filter((row) => row.isActive)
      .sort((a, b) => Number(a.displayOrder) - Number(b.displayOrder))
      .slice(0, maxSubjects);

    return {
      count: active.length,
      questions: active.reduce((sum, row) => sum + (Number(row.questionCount) || 0), 0),
      seconds: active.reduce((sum, row) => sum + (Number(row.soloDurationSeconds) || 0), 0),
    };
  }, [rows, maxSubjects]);

  const questionsMatch = totals.questions === fullExamQuestions;
  const secondsMatch = totals.seconds === fullExamDurationSeconds;

  function handleSave() {
    onSave({
      subjects: rows.map((row) => ({
        subjectId: row.subjectId,
        questionCount: Number(row.questionCount) || 0,
        soloDurationSeconds: Number(row.soloDurationSeconds) || 0,
        freeQuestionCount:
          row.freeQuestionCount.trim() === "" ? null : Number(row.freeQuestionCount),
        isCompulsory: row.isCompulsory,
        displayOrder: Number(row.displayOrder) || 0,
        isActive: row.isActive,
      })),
    } as AdminInstitutionSubjectsInput);
  }

  return (
    <section className="space-y-4">
      <SectionTitle
        title="Subjects"
        description="What this institution offers, and how much of the exam each subject fills."
        action={
          <Button onClick={handleSave} disabled={!canEdit || rows.length === 0 || isSaving} isLoading={isSaving}>
            <Save className="h-4 w-4" />
            Save subjects
          </Button>
        }
      />

      {!canEdit && disabledReason ? (
        <p className="rounded-[var(--sb-radius)] border border-[var(--sb-border)] bg-[var(--sb-surface-2)] px-3 py-2 text-[length:var(--sb-text-xs)] text-[var(--sb-text-secondary)]">
          {disabledReason}
        </p>
      ) : null}

      {/* Live totals for the first maxSubjects active subjects. */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div
          className={`rounded-[var(--sb-radius-lg)] border p-3.5 ${
            questionsMatch
              ? "border-[var(--sb-border)] bg-[var(--sb-surface-1)]"
              : "border-[var(--sb-warning)] bg-[var(--sb-surface-1)]"
          }`}
        >
          <p className="text-[length:var(--sb-text-xs)] text-[var(--sb-text-secondary)]">
            Questions in a full exam
          </p>
          <p className="mt-1 text-[length:var(--sb-text-lg)] font-medium text-[var(--sb-text)]">
            {totals.questions} of {fullExamQuestions}
          </p>
          <p className="mt-1 text-[length:var(--sb-text-xs)] text-[var(--sb-text-secondary)]">
            {questionsMatch
              ? `The first ${totals.count} subjects add up exactly.`
              : "These do not add up to the exam rules above."}
          </p>
        </div>

        <div
          className={`rounded-[var(--sb-radius-lg)] border p-3.5 ${
            secondsMatch
              ? "border-[var(--sb-border)] bg-[var(--sb-surface-1)]"
              : "border-[var(--sb-warning)] bg-[var(--sb-surface-1)]"
          }`}
        >
          <p className="text-[length:var(--sb-text-xs)] text-[var(--sb-text-secondary)]">
            Time, sat one subject at a time
          </p>
          <p className="mt-1 text-[length:var(--sb-text-lg)] font-medium text-[var(--sb-text)]">
            {formatDurationSeconds(totals.seconds)} of {formatDurationSeconds(fullExamDurationSeconds)}
          </p>
          <p className="mt-1 text-[length:var(--sb-text-xs)] text-[var(--sb-text-secondary)]">
            {secondsMatch
              ? "Solo times add up to the full exam length."
              : "A student sitting these separately gets a different amount of time."}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {rows.map((row) => (
          <div
            key={row.subjectId}
            className="rounded-[var(--sb-radius-lg)] border border-[var(--sb-border)] bg-[var(--sb-surface-1)] p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-[length:var(--sb-text-md)] font-medium text-[var(--sb-text)]">
                  {row.canonicalName}{" "}
                  <span className="text-[length:var(--sb-text-xs)] text-[var(--sb-text-tertiary)]">
                    {row.code}
                  </span>
                </p>
                <p className="mt-0.5 text-[length:var(--sb-text-xs)] text-[var(--sb-text-secondary)]">
                  {row.bankQuestionCount} question{row.bankQuestionCount === 1 ? "" : "s"} in the bank
                  {Number(row.questionCount) > row.bankQuestionCount
                    ? " — not enough for a full exam yet"
                    : ""}
                </p>
              </div>

              <Button
                variant="ghost"
                size="sm"
                disabled={!canEdit || isSaving}
                onClick={() =>
                  setRows((current) => current.filter((item) => item.subjectId !== row.subjectId))
                }
              >
                <X className="h-4 w-4" />
                Remove
              </Button>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Field
                type="number"
                label="Questions"
                id={`subject-${row.subjectId}-questions`}
                min={1}
                disabled={!canEdit || isSaving}
                value={row.questionCount}
                onChange={(event) => update(row.subjectId, { questionCount: event.target.value })}
              />
              <Field
                type="number"
                label="Solo time (seconds)"
                hint={formatDurationSeconds(Number(row.soloDurationSeconds) || 0)}
                id={`subject-${row.subjectId}-duration`}
                min={60}
                disabled={!canEdit || isSaving}
                value={row.soloDurationSeconds}
                onChange={(event) =>
                  update(row.subjectId, { soloDurationSeconds: event.target.value })
                }
              />
              <Field
                type="number"
                label="Free questions"
                hint="Blank uses the default"
                id={`subject-${row.subjectId}-free`}
                min={1}
                disabled={!canEdit || isSaving}
                value={row.freeQuestionCount}
                onChange={(event) =>
                  update(row.subjectId, { freeQuestionCount: event.target.value })
                }
              />
              <Field
                type="number"
                label="Order"
                id={`subject-${row.subjectId}-order`}
                min={0}
                disabled={!canEdit || isSaving}
                value={row.displayOrder}
                onChange={(event) => update(row.subjectId, { displayOrder: event.target.value })}
              />
            </div>

            <div className="mt-3 flex flex-wrap gap-4">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-[var(--sb-accent)]"
                  checked={row.isCompulsory}
                  disabled={!canEdit || isSaving}
                  onChange={(event) =>
                    update(row.subjectId, { isCompulsory: event.target.checked })
                  }
                />
                <span className="text-[length:var(--sb-text-base)] text-[var(--sb-text)]">
                  Compulsory in a full exam
                </span>
              </label>

              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-[var(--sb-accent)]"
                  checked={row.isActive}
                  disabled={!canEdit || isSaving}
                  onChange={(event) => update(row.subjectId, { isActive: event.target.checked })}
                />
                <span className="text-[length:var(--sb-text-base)] text-[var(--sb-text)]">
                  Offered to students
                </span>
              </label>
            </div>
          </div>
        ))}
      </div>

      {addable.length > 0 ? (
        <div className="flex flex-wrap items-end gap-3 rounded-[var(--sb-radius-lg)] border border-dashed border-[var(--sb-border)] p-4">
          <div className="min-w-[14rem] flex-1 space-y-1.5">
            <span className="block text-[length:var(--sb-text-xs)] font-medium text-[var(--sb-text-secondary)]">
              Add a subject
            </span>
            <CustomSelect
              value={toAdd}
              onValueChange={setToAdd}
              placeholder="Pick from the catalogue"
              options={addable.map((subject) => ({
                label: `${subject.canonicalName} (${subject.code})`,
                value: String(subject.id),
              }))}
              disabled={!canEdit || isSaving}
              aria-label="Add a subject"
            />
          </div>

          <Button
            variant="secondary"
            disabled={!canEdit || isSaving || toAdd === ""}
            onClick={() => {
              const subject = catalogue.find((item) => String(item.id) === toAdd);
              if (!subject) return;
              setRows((current) => [
                ...current,
                {
                  subjectId: subject.id,
                  canonicalName: subject.canonicalName,
                  code: subject.code,
                  questionCount: "40",
                  soloDurationSeconds: "1800",
                  freeQuestionCount: "",
                  isCompulsory: false,
                  displayOrder: String(current.length + 1),
                  isActive: true,
                  bankQuestionCount: 0,
                },
              ]);
              setToAdd("");
            }}
          >
            <Plus className="h-4 w-4" />
            Add
          </Button>
        </div>
      ) : null}
    </section>
  );
}
