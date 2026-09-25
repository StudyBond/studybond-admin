"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { Field } from "@/components/ui/field";
import { FormattingToolbar } from "@/features/questions/components/formatting-toolbar";
import { PreviewSheet } from "@/features/questions/components/preview-sheet";
import {
  InlinePreview,
  StudentPreview,
  type PreviewField,
} from "@/features/questions/components/student-preview";
import {
  buildPayload,
  createInitialState,
  LETTERS,
  type FormState,
} from "@/features/questions/lib/question-form-state";
import type { QuestionPayload, QuestionRecord } from "@/lib/api/types";
import { cn } from "@/lib/utils/cn";
import { useMediaQuery } from "@/lib/utils/use-media-query";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Eye,
  RotateCcw,
  Save,
  ShieldCheck,
  SkipForward,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * One question, reviewed. The editable fields carry formatting toolbars,
 * and an actions bar is always on screen — sticky to the bottom of the page —
 * so a reviewer working through a long backlog never has to scroll to reach
 * Publish.
 *
 * How the result is shown depends on the room there is, because the two
 * cases need different answers rather than one layout squeezed to fit:
 *
 * Wide (1024px and up): editors on the left, the whole student view pinned
 * on the right, following whichever field you last clicked into. Editing
 * Option D never means scrolling away from Option D to see it.
 *
 * Narrow: one column, and each field shows its own result directly
 * beneath it as you type — the same "no scrolling to see the effect", by
 * putting the effect next to the thing instead of beside the page. Two
 * columns of ~350px, on a screen whose keyboard takes half the height, would
 * be worse than one good column. The whole card is a Preview button away,
 * full-screen, with its own Publish button, for the check before deciding.
 *
 * The two are chosen in JavaScript rather than hidden with CSS: a hidden
 * preview is still rendered, and drawing LaTeX for seven previews nobody can
 * see, on every keystroke, is real cost on the slowest devices — which are
 * the narrow ones.
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
  onFocus,
  placeholder,
  inlinePreview,
}: {
  label: string;
  hint?: string;
  rows: number;
  value: string;
  onChange: (next: string) => void;
  /** Tells the wide-screen preview which block to follow. */
  onFocus?: () => void;
  placeholder?: string;
  /** Set on narrow screens: show this field's own result underneath. */
  inlinePreview?: "question" | "option" | "explanation";
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
        onFocus={onFocus}
        placeholder={placeholder}
        className="w-full resize-y rounded-b-[var(--sb-radius-sm)] border border-[var(--sb-border)] bg-[var(--sb-bg-inset)] px-3 py-2.5 text-[length:var(--sb-text-sm)] text-[var(--sb-text)] outline-none transition-colors placeholder:text-[var(--sb-text-tertiary)] focus:border-[var(--sb-accent)]"
      />
      {inlinePreview ? (
        <InlinePreview content={value} variant={inlinePreview} />
      ) : null}
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
     effect — the same reasoning as QuestionForm. It also closes the preview
     sheet, which is what should happen when Publish moves to the next. */
  const [form, setForm] = useState<FormState>(() => createInitialState(question));

  /* The field last clicked into. Not cleared on blur: the outline marks
     where you were working, and clearing it would make it flicker off and
     on every time focus moves from one field to the next. Only the
     wide-screen preview reads it. */
  const [activeField, setActiveField] = useState<PreviewField | null>(null);

  /* 64rem is Tailwind's `lg` exactly, so this agrees with every lg: class. */
  const isWide = useMediaQuery("(min-width: 64rem)");
  const [previewOpen, setPreviewOpen] = useState(false);
  const closePreview = useCallback(() => setPreviewOpen(false), []);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  const isSharedRow = form.kind === "parent";
  const sharedDiagram = question.parentQuestion ?? null;
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

      {/* ── Edit on the left, the result on the right ──────
          Wide only. The preview is the sticky column, capped to the space
          between the topbar and the actions bar and scrolling inside itself,
          so a question taller than the screen keeps every part reachable —
          a sticky column taller than its viewport has an unreachable bottom
          otherwise. `lg:self-start` is what lets it stick at all: a grid
          item stretches to the row's height by default, leaving nothing to
          stick within. On narrow screens this is a single column and there
          is no second item. */}
      <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
        <div className="min-w-0 space-y-4 rounded-[var(--sb-radius-lg)] border border-[var(--sb-border)] bg-[var(--sb-surface-1)] p-4 sm:p-5">
          {form.kind === "child" && sharedDiagram ? (
            <p className="rounded-[var(--sb-radius)] border border-[var(--sb-border)] bg-[var(--sb-bg-inset)] px-3 py-2 text-[length:var(--sb-text-xs)] text-[var(--sb-text-secondary)]">
              Uses shared diagram #{sharedDiagram.id}. Students see it above
              this question; the preview shows it.
            </p>
          ) : null}

          <ToolbarField
            label={isSharedRow ? "Shared diagram or passage text" : "Question text"}
            hint="Required"
            rows={5}
            value={form.questionText}
            onChange={(value) => updateField("questionText", value)}
            onFocus={() => setActiveField("questionText")}
            placeholder="Write the full question here…"
            inlinePreview={isWide ? undefined : "question"}
          />

          {isSharedRow ? (
            <p className="rounded-[var(--sb-radius)] border border-dashed border-[var(--sb-border)] px-3 py-2.5 text-[length:var(--sb-text-sm)] text-[var(--sb-text-secondary)]">
              This is a shared diagram. It has no options, answer or
              explanation of its own; those belong to the questions that use
              it. To change its picture or add questions, open it from the
              question bank.
            </p>
          ) : null}

          {!isSharedRow ? (
          <div className="space-y-3">
            <p className="text-[length:var(--sb-text-xs)] font-medium text-[var(--sb-text-secondary)]">
              Answer choices
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
                    onClick={() => {
                      updateField("correctAnswer", letter);
                      setActiveField(key);
                    }}
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
                      onFocus={() => setActiveField(key)}
                      placeholder={`What option ${letter} says`}
                      inlinePreview={isWide ? undefined : "option"}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          ) : null}

          {!isSharedRow ? (
            <>
              <ToolbarField
                label="Explanation"
                hint="Shown after the learner answers"
                rows={4}
                value={form.explanationText}
                onChange={(value) => updateField("explanationText", value)}
                onFocus={() => setActiveField("explanationText")}
                placeholder="Walk through the reasoning…"
                inlinePreview={isWide ? undefined : "explanation"}
              />

              <Field
                label="Notes for learners"
                hint="Shown under the explanation"
                value={form.additionalNotes}
                onChange={(event) => updateField("additionalNotes", event.target.value)}
                onFocus={() => setActiveField("additionalNotes")}
                placeholder="Source: JAMB UTME 2019."
              />
            </>
          ) : null}

          <Field
            label="Team notes"
            hint="Never shown to students"
            value={form.internalNotes}
            onChange={(event) => updateField("internalNotes", event.target.value)}
            placeholder="An answer key to double-check, a gap you had to fill…"
          />
        </div>

        {isWide ? (
          <div className="min-w-0 lg:sticky lg:top-[calc(var(--sb-topbar-height)+1rem)] lg:self-start">
            <StudentPreview form={form} activeField={activeField} parent={sharedDiagram} />
          </div>
        ) : null}
      </div>

      {/* ── Actions — always reachable ─────────────────────
          sticky, not fixed: a fixed bar would need to know the sidebar's
          width to avoid sitting under it, which differs between its
          expanded and collapsed states. Sticky positions relative to this
          page's own place in the content column, so it lines up correctly
          without tracking that at all.

          Below lg it is lifted by the height of the fixed bottom navigation
          (plus the phone's home-indicator inset, which that bar pads for
          too). Without the lift the bar sits at the very bottom of the
          screen, exactly where the navigation is, and is hidden behind it.

          Labels collapse to icons under sm so the whole bar stays on one
          row on a phone: Previous, Skip, Preview and Save are icons there;
          Verify and Publish keep short words because they are the decisions
          and should never be a guess. */}
      <div className="sticky bottom-[calc(var(--sb-bottom-nav-height)+env(safe-area-inset-bottom))] z-20 -mx-4 border-t border-[var(--sb-border)] bg-[var(--sb-surface-2)] px-4 py-3 shadow-[var(--sb-shadow-xl)] sm:-mx-5 lg:bottom-0 lg:-mx-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onPrevious}
              disabled={!hasPrevious}
              aria-label="Previous question"
              title="Previous question"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Previous</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onSkip}
              aria-label="Skip to the next question"
              title="Skip to the next question"
            >
              <SkipForward className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Skip</span>
            </Button>
            {!isWide ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setPreviewOpen(true)}
                aria-label="Preview the whole question"
                title="Preview the whole question"
              >
                <Eye className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Preview</span>
              </Button>
            ) : null}
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => void withPayload({}, false)}
              disabled={isSaving}
              isLoading={isSaving}
              aria-label="Save changes"
              title="Save changes"
            >
              {!isSaving ? <Save className="h-3.5 w-3.5" /> : null}
              <span className="hidden sm:inline">Save</span>
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
                <span className="hidden sm:inline">Mark verified</span>
                <span className="sm:hidden">Verify</span>
              </Button>
            )}

            <Button
              type="button"
              size="sm"
              onClick={() => void withPayload({ reviewStatus: "PUBLISHED" }, true)}
              disabled={isSaving}
            >
              <span>
                Publish
                <span className="hidden sm:inline">{hasNext ? " & next" : ""}</span>
              </span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {previewOpen && !isWide ? (
        <PreviewSheet
          form={form}
          parent={sharedDiagram}
          onClose={closePreview}
          onPublish={() => void withPayload({ reviewStatus: "PUBLISHED" }, true)}
          isSaving={isSaving}
          hasNext={hasNext}
        />
      ) : null}
    </div>
  );
}
