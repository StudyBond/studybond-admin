"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { Field } from "@/components/ui/field";
import { FormattingToolbar } from "@/features/questions/components/formatting-toolbar";
import { StudentPreview } from "@/features/questions/components/student-preview";
import {
  buildPayload,
  createInitialState,
  isParentPrompt,
  LETTERS,
  type FormState,
} from "@/features/questions/lib/question-form-state";
import type { QuestionPayload, QuestionRecord } from "@/lib/api/types";
import { cn } from "@/lib/utils/cn";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Save,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

/**
 * One question, reviewed: the live student-facing preview on top, the
 * editable fields with their formatting toolbars below, and an actions bar
 * that is always on screen — sticky to the bottom of the page — so a
 * reviewer working through a long backlog never has to scroll to reach
 * Publish.
 *
 * "Save" persists edits without touching review status — for a reviewer
 * still deciding. "Mark verified" and "Publish" are decisions: both save
 * whatever was edited AND move the status forward, then advance to the
 * next question in the queue, because deciding a question is done is
 * exactly the point where there is nothing left to look at here.
 */

export type QueueRailItem = {
  id: number;
  subject: string;
  questionText: string;
  reviewStatus: string;
};

type QuestionReviewerProps = {
  question: QuestionRecord;
  position: number;
  total: number;
  hasPrevious: boolean;
  hasNext: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onSkip: () => void;
  onSubmit: (payload: QuestionPayload) => Promise<unknown>;
  isSaving: boolean;
  railItems: QueueRailItem[];
  currentId: number;
  onJump: (id: number) => void;
};


/** One labelled textarea with its own formatting toolbar above it. */
function ToolbarField({
  label,
  hint,
  rows,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  hint?: string;
  rows: number;
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="text-[length:var(--sb-text-xs)] font-medium text-[var(--sb-text-secondary)]">
          {label}
        </span>
        {hint ? (
          <span className="text-[length:var(--sb-text-xs)] text-[var(--sb-text-tertiary)]">
            {hint}
          </span>
        ) : null}
      </div>
      <FormattingToolbar
        textareaRef={textareaRef}
        value={value}
        onChange={onChange}
      />
      <textarea
        ref={textareaRef}
        rows={rows}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full resize-y rounded-b-[var(--sb-radius-sm)] border border-[var(--sb-border)] bg-[var(--sb-bg-inset)] px-3 py-2.5 text-[length:var(--sb-text-sm)] text-[var(--sb-text)] outline-none transition-colors placeholder:text-[var(--sb-text-tertiary)] focus:border-[var(--sb-accent)]"
      />
    </div>
  );
}

export function QuestionReviewer({
  question,
  position,
  total,
  hasPrevious,
  hasNext,
  onPrevious,
  onNext,
  onSkip,
  onSubmit,
  isSaving,
  railItems,
  currentId,
  onJump,
}: QuestionReviewerProps) {
  /* Remounts on question change via key={question.id} at the call site, so
     this re-seeds from the new record rather than syncing through an
     effect — the same reasoning as QuestionForm. */
  const [form, setForm] = useState<FormState>(() => createInitialState(question));

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  const parentPrompt = isParentPrompt(form);
  const progressPercent = total > 0 ? Math.round((position / total) * 100) : 0;

  async function withPayload(
    override: Partial<Pick<FormState, "reviewStatus">>,
    thenAdvance: boolean,
  ) {
    const payload = buildPayload({ ...form, ...override });
    await onSubmit(payload);
    if (thenAdvance) onNext();
  }

  /* Ctrl/Cmd+Enter publishes even while typing — the conventional "submit
     this" shortcut. Arrow-key navigation only fires outside text fields,
     so typing "January" doesn't jump the queue on its own left arrow. */
  useEffect(() => {
    function isTypingTarget(target: EventTarget | null) {
      const el = target as HTMLElement | null;
      return el?.tagName === "TEXTAREA" || el?.tagName === "INPUT";
    }

    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
        event.preventDefault();
        void withPayload({ reviewStatus: "PUBLISHED" }, true);
        return;
      }
      if ((event.metaKey || event.ctrlKey) && event.key === "s") {
        event.preventDefault();
        void withPayload({}, false);
        return;
      }
      if (isTypingTarget(event.target)) return;
      if (event.key === "ArrowRight" && hasNext) onNext();
      if (event.key === "ArrowLeft" && hasPrevious) onPrevious();
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, hasNext, hasPrevious]);

  return (
    <div className="space-y-4">
      {/* ── Progress + jump rail ─────────────────────────── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[length:var(--sb-text-sm)] text-[var(--sb-text-secondary)]">
            Question <span className="sb-nums text-[var(--sb-text)]">{position}</span>{" "}
            of <span className="sb-nums text-[var(--sb-text)]">{total}</span>
          </p>
          <Badge tone={question.reviewStatus === "DRAFT" ? "warning" : "info"}>
            {question.reviewStatus === "DRAFT" ? "Draft" : "Verified"}
          </Badge>
        </div>
        <div className="h-1 overflow-hidden rounded-full bg-[var(--sb-border)]">
          <div
            className="h-full rounded-full bg-[var(--sb-accent)] transition-[width] duration-[var(--sb-duration)]"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {railItems.length > 1 ? (
          <div className="sb-scroll-x flex gap-1.5 pb-1">
            {railItems.map((item, index) => (
              <button
                key={item.id}
                type="button"
                title={`${index + 1}. ${item.questionText.slice(0, 60)}`}
                onClick={() => onJump(item.id)}
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--sb-radius-sm)] text-[length:var(--sb-text-xs)] font-medium transition-colors",
                  item.id === currentId
                    ? "bg-[var(--sb-accent)] text-[#0a0a0a]"
                    : item.reviewStatus === "DRAFT"
                      ? "bg-[var(--sb-warning-soft)] text-[var(--sb-warning)] hover:bg-[var(--sb-surface-3)]"
                      : "bg-[var(--sb-info-soft)] text-[var(--sb-info)] hover:bg-[var(--sb-surface-3)]",
                )}
              >
                {index + 1}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {/* ── Live preview ─────────────────────────────────── */}
      <StudentPreview form={form} />

      {/* ── Editable fields ──────────────────────────────── */}
      <div className="space-y-4 rounded-[var(--sb-radius-lg)] border border-[var(--sb-border)] bg-[var(--sb-surface-1)] p-4 sm:p-5">
        <ToolbarField
          label="Question text"
          hint="Required"
          rows={5}
          value={form.questionText}
          onChange={(value) => updateField("questionText", value)}
          placeholder="Write the full question here…"
        />

        <div className="space-y-3">
          <p className="text-[length:var(--sb-text-xs)] font-medium text-[var(--sb-text-secondary)]">
            {parentPrompt
              ? "Answer choices — all blank, this saves as a parent prompt"
              : "Answer choices"}
          </p>
          {LETTERS.map((letter) => {
            const key = `option${letter}` as const;
            const isCorrect = form.correctAnswer === letter;
            return (
              <div key={letter} className="flex items-start gap-2.5">
                <button
                  type="button"
                  title={
                    isCorrect
                      ? `Option ${letter} is marked correct`
                      : `Mark option ${letter} correct`
                  }
                  onClick={() => updateField("correctAnswer", letter)}
                  className={cn(
                    "mt-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[length:var(--sb-text-xs)] font-semibold transition-colors",
                    isCorrect
                      ? "border-[var(--sb-success-ring)] bg-[var(--sb-success-soft)] text-[var(--sb-success)]"
                      : "border-[var(--sb-border)] text-[var(--sb-text-tertiary)] hover:border-[var(--sb-text-secondary)]",
                  )}
                >
                  {isCorrect ? <Check className="h-3.5 w-3.5" /> : letter}
                </button>
                <div className="min-w-0 flex-1">
                  <ToolbarField
                    label={`Option ${letter}${letter === "E" ? " (optional)" : ""}`}
                    rows={2}
                    value={form[key]}
                    onChange={(value) => updateField(key, value)}
                    placeholder={`What option ${letter} says`}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <ToolbarField
          label="Explanation"
          hint="Shown after the learner answers"
          rows={4}
          value={form.explanationText}
          onChange={(value) => updateField("explanationText", value)}
          placeholder="Walk through the reasoning…"
        />

        <Field
          label="Notes"
          hint="Not shown to learners"
          value={form.additionalNotes}
          onChange={(event) => updateField("additionalNotes", event.target.value)}
          placeholder="Context for whoever looks at this next"
        />
      </div>

      {/* ── Actions — always reachable ─────────────────────
          sticky, not fixed: a fixed bar would need to know the sidebar's
          width to avoid sitting under it, which differs between its
          expanded and collapsed states. Sticky positions relative to this
          page's own place in the content column, so it lines up correctly
          without tracking that at all — the same technique already proven
          by .sb-sticky-col. */}
      <div className="sticky bottom-0 z-20 -mx-4 border-t border-[var(--sb-border)] bg-[var(--sb-surface-2)] px-4 py-3 shadow-[var(--sb-shadow-xl)] sm:-mx-5 lg:-mx-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onPrevious}
              disabled={!hasPrevious}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={onSkip}>
              Skip
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => void withPayload({}, false)}
              disabled={isSaving}
              isLoading={isSaving}
            >
              {!isSaving ? <Save className="h-3.5 w-3.5" /> : null}
              Save
            </Button>

            {question.reviewStatus === "VERIFIED" ? (
              <ConfirmButton
                variant="secondary"
                size="sm"
                confirmLabel="Send back to draft?"
                onConfirm={() => void withPayload({ reviewStatus: "DRAFT" }, true)}
                disabled={isSaving}
                icon={<RotateCcw className="h-3.5 w-3.5" />}
              >
                Back to draft
              </ConfirmButton>
            ) : (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => void withPayload({ reviewStatus: "VERIFIED" }, true)}
                disabled={isSaving}
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                Mark verified
              </Button>
            )}

            <Button
              type="button"
              size="sm"
              onClick={() => void withPayload({ reviewStatus: "PUBLISHED" }, true)}
              disabled={isSaving}
            >
              Publish{hasNext ? " & next" : ""}
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
