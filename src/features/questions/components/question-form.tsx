"use client";

import { ApiErrorMessage } from "@/components/ui/api-error-message";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { CustomSelect } from "@/components/ui/custom-select";
import { Field, FieldShell, TextArea } from "@/components/ui/field";
import { SectionTitle } from "@/components/ui/page-header";
import { questionsApi } from "@/lib/api/questions";
import type {
  QuestionAssetKind,
  QuestionPayload,
  QuestionRecord,
} from "@/lib/api/types";
import { cn } from "@/lib/utils/cn";
import {
  getQuestionPoolLabel,
  normalizeQuestionSource,
  QUESTION_POOL_OPTIONS,
  QUESTION_TYPE_OPTIONS,
  REVIEW_STATUS_OPTIONS,
} from "@/lib/utils/questions";
import { GroupChildrenPanel } from "@/features/questions/components/group-children-panel";
import {
  ParentPicker,
  type ParentSummary,
} from "@/features/questions/components/parent-picker";
import {
  buildPayload,
  createInitialState,
  type FormErrors,
  type FormState,
  LETTERS,
  type QuestionKind,
  validateForm,
} from "@/features/questions/lib/question-form-state";
import { ImagePlus, Save, Trash2, UploadCloud, X } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

/**
 * Create or edit one question.
 *
 * The bug this rewrite fixes: a new question defaulted to
 * `questionPool: "REAL_UI"`. That value is not in QUESTION_POOL_OPTIONS, and
 * the backend does not accept it either — questions.constants.ts maps a
 * fixed alias table and throws `Invalid question pool. Use FREE_EXAM,
 * REAL_BANK, or PRACTICE.` for anything else. So opening "Add question",
 * filling it in and saving without touching the pool dropdown failed every
 * time, and because CustomSelect finds no option matching "REAL_UI" it
 * showed an empty placeholder rather than the value causing the failure.
 * The default is now REAL_BANK, which is also Prisma's default and the pool
 * that matches the default type.
 *
 * Beyond that:
 *
 * 1. Choosing the correct answer meant clicking a `role="button"` div that
 *    wrapped the whole option — its textarea and its image controls
 *    included. Inner clicks were held back with stopPropagation, which is a
 *    patch over the wrong structure: a container with tabIndex=0 announcing
 *    itself as a button while containing form fields. It is a real radio
 *    group now, so arrow keys move between options and screen readers say
 *    what is selected.
 *
 * 2. Option images were tinted by letter — A and C cyan, B and D amber, E
 *    rose — which reads as four different kinds of thing when they are five
 *    of the same thing.
 *
 * 3. Image previews were `object-cover`, cropping the diagram you attached
 *    in the moment you were checking it looked right.
 *
 * 4. Validation only ever appeared as a toast, so after dismissing it you
 *    were left hunting for the empty field. Errors now sit on the fields.
 *
 * 5. Deleting a question had no confirmation, and a "Ready to save" card
 *    took up a panel to say the backend would validate the form.
 *
 * 6. reviewStatus had no field at all — every question created here silently
 *    became DRAFT, the column's database default, with no way to change it.
 *    Now that only PUBLISHED questions are offered to students, that gap
 *    would have made every hand-created question invisible with no visible
 *    reason why. It defaults to PUBLISHED, matching how a question created
 *    here has always behaved: saved and live, unless an admin deliberately
 *    holds it back.
 */

type QuestionFormMode = "create" | "edit";

type QuestionFormProps = {
  mode: QuestionFormMode;
  initialQuestion?: QuestionRecord | null;
  /** Starting values for a new question, such as the ones a group shares. */
  initialValues?: Partial<FormState>;
  /** The shared diagram a new question starts attached to. */
  initialParent?: ParentSummary | null;
  isSubmitting?: boolean;
  isDeleting?: boolean;
  onSubmit: (payload: QuestionPayload) => Promise<unknown> | unknown;
  onDelete?: () => Promise<unknown> | unknown;
};

const KIND_CHOICES: Array<{
  value: QuestionKind;
  title: string;
  description: string;
}> = [
  {
    value: "standalone",
    title: "Ordinary question",
    description: "One question with its own options.",
  },
  {
    value: "parent",
    title: "Shared diagram or passage",
    description:
      "A picture or text that several questions use. It has no options of its own.",
  },
  {
    value: "child",
    title: "Uses a shared diagram",
    description: "A question that belongs to a shared diagram you pick.",
  },
];

// FormState, LETTERS, the DEFAULT_* constants, createInitialState,
// buildPayload — all shared with the review queue now. See
// question-form-state.ts.

/* ── Image attachment ───────────────────────────────── */

function AssetField({
  label,
  kind,
  url,
  publicId,
  onChange,
  helper,
}: {
  label: string;
  kind: QuestionAssetKind;
  url: string;
  publicId: string;
  onChange: (url: string, publicId: string) => void;
  helper?: string;
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  async function handleFileUpload(file: File) {
    try {
      setIsUploading(true);
      const asset = await questionsApi.uploadAsset(kind, file);
      onChange(asset.url, asset.publicId);
      toast.success(`${label} uploaded`);
    } catch (error) {
      toast.error(`Could not upload the ${label.toLowerCase()}`, {
        description: (
          <ApiErrorMessage error={error} fallback="Please try again." />
        ),
      });
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="rounded-[var(--sb-radius)] border border-[var(--sb-border)] bg-[var(--sb-bg-inset)] p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[length:var(--sb-text-xs)] font-medium text-[var(--sb-text-secondary)]">
          {label}
        </p>
        {url ? (
          <Badge tone="info">Attached</Badge>
        ) : (
          <span className="text-[length:var(--sb-text-xs)] text-[var(--sb-text-tertiary)]">
            None
          </span>
        )}
      </div>

      {helper ? (
        <p className="mt-1 text-[length:var(--sb-text-xs)] text-[var(--sb-text-tertiary)]">
          {helper}
        </p>
      ) : null}

      <div className="mt-2.5 space-y-2.5">
        <Field
          size="sm"
          value={url}
          onChange={(event) => onChange(event.target.value, "")}
          placeholder="Paste an image URL, or upload below"
          aria-label={`${label} URL`}
        />

        <div className="flex flex-wrap gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void handleFileUpload(file);
              event.target.value = "";
            }}
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            isLoading={isUploading}
          >
            {!isUploading ? <UploadCloud className="h-3.5 w-3.5" /> : null}
            {isUploading ? "Uploading" : "Upload"}
          </Button>
          {url ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onChange("", "")}
            >
              <X className="h-3.5 w-3.5" />
              Remove
            </Button>
          ) : null}
        </div>

        {url ? (
          /* object-contain: this preview exists so you can check the image
             is the right one, which cropping actively prevents. */
          <div className="overflow-hidden rounded-[var(--sb-radius-sm)] border border-[var(--sb-border)] bg-[var(--sb-bg)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt={label}
              className="mx-auto max-h-48 w-auto max-w-full object-contain"
            />
          </div>
        ) : (
          <div className="flex h-24 items-center justify-center gap-2 rounded-[var(--sb-radius-sm)] border border-dashed border-[var(--sb-border)] text-[length:var(--sb-text-xs)] text-[var(--sb-text-tertiary)]">
            <ImagePlus className="h-4 w-4" />
            No image
          </div>
        )}

        {publicId ? (
          <p className="sb-mono truncate text-[length:var(--sb-text-xs)] text-[var(--sb-text-tertiary)]">
            {publicId}
          </p>
        ) : null}
      </div>
    </div>
  );
}

/* ── Form ───────────────────────────────────────────── */

export function QuestionForm({
  mode,
  initialQuestion,
  initialValues,
  initialParent = null,
  isSubmitting = false,
  isDeleting = false,
  onSubmit,
  onDelete,
}: QuestionFormProps) {
  /**
   * Seeded once. The edit page passes `key={question.id}`, so moving to a
   * different question remounts this and re-seeds from scratch. That is
   * deliberately not an effect: copying the prop into state on every change
   * meant a background refetch could overwrite edits mid-typing.
   */
  const [form, setForm] = useState<FormState>(() =>
    createInitialState(initialQuestion, initialValues),
  );
  const [errors, setErrors] = useState<FormErrors>({});
  const [parent, setParent] = useState<ParentSummary | null>(
    () => initialParent ?? initialQuestion?.parentQuestion ?? null,
  );

  const isParent = form.kind === "parent";
  const isChild = form.kind === "child";
  const attachedCount = initialQuestion?.childCount ?? 0;
  /* A shared row with questions attached has to stay one, so the choice is
     locked rather than left to fail on save. */
  const kindLocked = attachedCount > 0;

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function chooseKind(kind: QuestionKind) {
    if (kindLocked) return;
    setErrors({});
    setForm((current) => ({
      ...current,
      kind,
      // A shared diagram is never served on its own, so it has no free pool.
      questionPool:
        kind === "parent" && current.questionPool === "FREE_EXAM"
          ? "REAL_BANK"
          : current.questionPool,
      parentQuestionId: kind === "child" ? current.parentQuestionId : "",
    }));
    if (kind !== "child") setParent(null);
  }

  function pickParent(next: ParentSummary) {
    setParent(next);
    setErrors((current) => ({ ...current, parent: undefined }));
    setForm((current) => ({
      ...current,
      parentQuestionId: String(next.id),
      // The two have to be in the same subject, so it follows the diagram.
      subject: next.subject?.trim() ? next.subject : current.subject,
      year: current.year || (next.year != null ? String(next.year) : ""),
    }));
  }

  function clearParent() {
    setParent(null);
    updateField("parentQuestionId", "");
  }

  function updateSource(
    next: Partial<Pick<FormState, "questionType" | "questionPool">>,
  ) {
    setForm((current) => {
      const normalized = normalizeQuestionSource(
        next.questionType ?? current.questionType,
        next.questionPool ?? current.questionPool,
      );
      return {
        ...current,
        questionType: normalized.questionType,
        questionPool: normalized.questionPool,
      };
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors = validateForm(form);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      toast.error("Some fields need attention", {
        description: "The problems are marked on the form.",
      });
      return;
    }

    try {
      await onSubmit(buildPayload(form));
    } catch {
      /* The calling page surfaces the error toast. */
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12"
    >
      {/* ══ The question itself ═══════════════════════════ */}
      <div className="min-w-0 space-y-6 lg:col-span-8">
        {/* ── What is being added ─────────────────────── */}
        <section className="space-y-3">
          <SectionTitle
            title="What is this?"
            description={
              kindLocked
                ? `${attachedCount} question${attachedCount === 1 ? " uses" : "s use"} this shared diagram, so it stays one.`
                : "Questions that share a diagram are added one by one and attached to it."
            }
          />
          <div
            role="radiogroup"
            aria-label="What kind of row this is"
            className="grid gap-3 sm:grid-cols-3"
          >
            {KIND_CHOICES.map((choice) => {
              const isSelected = form.kind === choice.value;
              return (
                <label
                  key={choice.value}
                  className={cn(
                    "flex cursor-pointer flex-col gap-1 rounded-[var(--sb-radius-lg)] border p-3.5 transition-colors duration-[var(--sb-duration-fast)]",
                    isSelected
                      ? "border-[var(--sb-accent)] bg-[var(--sb-accent-soft)]"
                      : "border-[var(--sb-border)] bg-[var(--sb-surface-1)] hover:border-[var(--sb-border-hover)]",
                    kindLocked && !isSelected && "cursor-not-allowed opacity-50",
                  )}
                >
                  <span className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="questionKind"
                      value={choice.value}
                      checked={isSelected}
                      disabled={kindLocked}
                      onChange={() => chooseKind(choice.value)}
                      className="h-4 w-4 accent-[var(--sb-accent)]"
                    />
                    <span className="text-[length:var(--sb-text-base)] font-medium text-[var(--sb-text)]">
                      {choice.title}
                    </span>
                  </span>
                  <span className="pl-6 text-[length:var(--sb-text-xs)] text-[var(--sb-text-tertiary)]">
                    {choice.description}
                  </span>
                </label>
              );
            })}
          </div>
        </section>

        {isChild ? (
          <section className="space-y-3">
            <SectionTitle
              title="Shared diagram"
              description="Students see this above the question."
            />
            <div className="rounded-[var(--sb-radius-lg)] border border-[var(--sb-border)] bg-[var(--sb-surface-1)] p-4 sm:p-5">
              <ParentPicker
                selected={parent}
                onSelect={pickParent}
                onClear={clearParent}
                subject={form.subject}
                institutionCode={form.institutionCode}
                error={errors.parent}
              />
            </div>
          </section>
        ) : null}

        <section className="space-y-3">
          <SectionTitle
            title={isParent ? "The shared diagram or passage" : "The question"}
            description={
              isParent
                ? "Shown above every question that uses it. It is never a question on its own."
                : "What the learner reads first."
            }
          />
          <div className="grid gap-4 rounded-[var(--sb-radius-lg)] border border-[var(--sb-border)] bg-[var(--sb-surface-1)] p-4 sm:p-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
            <div className="space-y-2">
              <TextArea
                label={isParent ? "What students read with it" : "Question text"}
                hint="Required"
                rows={isParent ? 6 : 9}
                value={form.questionText}
                onChange={(event) =>
                  updateField("questionText", event.target.value)
                }
                placeholder={
                  isParent
                    ? "Use the diagram below to answer {{QUESTIONS}}."
                    : "Write the full question here…"
                }
                error={errors.questionText}
              />
              {isParent ? (
                <p className="text-[length:var(--sb-text-xs)] text-[var(--sb-text-tertiary)]">
                  Write <span className="sb-mono">{"{{QUESTIONS}}"}</span> where
                  the question numbers should go. Students see the real
                  numbers, like &ldquo;questions 21 to 23&rdquo;, and it stays
                  correct however the questions are ordered.
                </p>
              ) : null}
            </div>

            <AssetField
              label={isParent ? "Diagram or picture" : "Question image"}
              kind="question"
              url={form.imageUrl}
              publicId={form.imagePublicId}
              onChange={(nextUrl, nextPublicId) => {
                updateField("imageUrl", nextUrl);
                updateField("imagePublicId", nextPublicId);
              }}
              helper={
                isParent
                  ? "The picture every question in the group refers to."
                  : "A diagram or scan, when the question depends on one."
              }
            />
          </div>
        </section>

        {isParent ? (
          <p className="rounded-[var(--sb-radius)] border border-dashed border-[var(--sb-border)] px-3 py-2.5 text-[length:var(--sb-text-sm)] text-[var(--sb-text-secondary)]">
            A shared diagram has no options, answer or explanation of its own.
            Those belong to each question that uses it.
            {mode === "edit"
              ? " Use the panel below to add more questions to it."
              : " Save it first, then add the questions that use it."}
          </p>
        ) : null}

        {/* ── Answers ─────────────────────────────────── */}
        {!isParent ? (
        <section className="space-y-3">
          <SectionTitle
            title="Answer choices"
            description="Fill A to D, then mark which one is correct."
          />

          {errors.options ? (
            <p
              role="alert"
              className="rounded-[var(--sb-radius)] border border-[var(--sb-danger-ring)] bg-[var(--sb-danger-soft)] px-3 py-2 text-[length:var(--sb-text-sm)] text-[var(--sb-text-secondary)]"
            >
              {errors.options}
            </p>
          ) : null}
          {errors.correctAnswer ? (
            <p
              role="alert"
              className="rounded-[var(--sb-radius)] border border-[var(--sb-danger-ring)] bg-[var(--sb-danger-soft)] px-3 py-2 text-[length:var(--sb-text-sm)] text-[var(--sb-text-secondary)]"
            >
              {errors.correctAnswer}
            </p>
          ) : null}

          {/* A real radio group: arrow keys move between options, and a
              screen reader announces which is marked correct. */}
          <fieldset className="space-y-3">
            <legend className="sr-only">Correct answer</legend>

            {LETTERS.map((letter) => {
              const optionKey = `option${letter}` as keyof FormState;
              const urlKey = `option${letter}ImageUrl` as keyof FormState;
              const publicIdKey =
                `option${letter}ImagePublicId` as keyof FormState;
              const isSelected = form.correctAnswer === letter;
              const isOptional = letter === "E";

              return (
                <div
                  key={letter}
                  className={cn(
                    "rounded-[var(--sb-radius-lg)] border bg-[var(--sb-surface-1)] p-4 sm:p-5",
                    "transition-colors duration-[var(--sb-duration-fast)]",
                    isSelected
                      ? "border-[var(--sb-success-ring)] bg-[var(--sb-success-soft)]"
                      : "border-[var(--sb-border)]",
                  )}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className="flex cursor-pointer items-center gap-2.5">
                      <input
                        type="radio"
                        name="correctAnswer"
                        value={letter}
                        checked={isSelected}
                        onChange={() => updateField("correctAnswer", letter)}
                        className="h-4 w-4 accent-[var(--sb-success)]"
                      />
                      <span className="text-[length:var(--sb-text-md)] font-medium text-[var(--sb-text)]">
                        Option {letter}
                      </span>
                      {isSelected ? (
                        <Badge tone="success">Correct answer</Badge>
                      ) : null}
                    </label>

                    {isOptional ? (
                      <span className="text-[length:var(--sb-text-xs)] text-[var(--sb-text-tertiary)]">
                        Optional
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-3 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
                    <TextArea
                      label="Choice text"
                      hint={isOptional ? "Optional" : "Required"}
                      rows={3}
                      value={form[optionKey]}
                      onChange={(event) =>
                        updateField(optionKey, event.target.value)
                      }
                      placeholder={`What option ${letter} says`}
                    />

                    <AssetField
                      label={`Option ${letter} image`}
                      kind={`option${letter}` as QuestionAssetKind}
                      url={form[urlKey]}
                      publicId={form[publicIdKey]}
                      onChange={(nextUrl, nextPublicId) => {
                        updateField(urlKey, nextUrl);
                        updateField(publicIdKey, nextPublicId);
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </fieldset>
        </section>
        ) : null}

        {/* ── Explanation ─────────────────────────────── */}
        {!isParent ? (
        <section className="space-y-3">
          <SectionTitle
            title="Explanation"
            description="Shown after the learner answers."
          />
          <div className="grid gap-4 rounded-[var(--sb-radius-lg)] border border-[var(--sb-border)] bg-[var(--sb-surface-1)] p-4 sm:p-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
            <div className="space-y-4">
              <TextArea
                label="Why the answer is right"
                rows={5}
                value={form.explanationText}
                onChange={(event) =>
                  updateField("explanationText", event.target.value)
                }
                placeholder="Walk through the reasoning…"
              />
              <TextArea
                label="Notes for learners"
                hint="Shown under the explanation"
                rows={3}
                value={form.additionalNotes}
                onChange={(event) =>
                  updateField("additionalNotes", event.target.value)
                }
                placeholder="Source: JAMB UTME 2019."
              />
            </div>

            <AssetField
              label="Explanation image"
              kind="explanation"
              url={form.explanationImageUrl}
              publicId={form.explanationImagePublicId}
              onChange={(nextUrl, nextPublicId) => {
                updateField("explanationImageUrl", nextUrl);
                updateField("explanationImagePublicId", nextPublicId);
              }}
              helper="A worked diagram or answer key."
            />
          </div>
        </section>
        ) : null}

        {/* ── Team notes ──────────────────────────────── */}
        <section className="space-y-3">
          <SectionTitle
            title="Team notes"
            description="For whoever edits this next. Never sent to students."
          />
          <div className="rounded-[var(--sb-radius-lg)] border border-[var(--sb-border)] bg-[var(--sb-surface-1)] p-4 sm:p-5">
            <TextArea
              label="Notes for the team"
              hint="Never shown to students"
              rows={3}
              value={form.internalNotes}
              onChange={(event) =>
                updateField("internalNotes", event.target.value)
              }
              placeholder="An answer key to double-check, an option that was written to fill a gap, a diagram that could not be read."
            />
          </div>
        </section>

        {mode === "edit" && isParent && initialQuestion ? (
          <GroupChildrenPanel parent={initialQuestion} />
        ) : null}
      </div>

      {/* ══ Classification and actions ════════════════════ */}
      <div className="sb-sticky-col min-w-0 space-y-6 lg:col-span-4">
        <section className="space-y-3">
          <SectionTitle
            title="Classification"
            action={
              <Badge tone="neutral">
                {getQuestionPoolLabel(form.questionPool)}
              </Badge>
            }
          />
          <div className="space-y-4 rounded-[var(--sb-radius-lg)] border border-[var(--sb-border)] bg-[var(--sb-surface-1)] p-4 sm:p-5">
            <Field
              label="Subject"
              hint="Required"
              value={form.subject}
              onChange={(event) => updateField("subject", event.target.value)}
              placeholder="Physics"
              list="subject-options"
              error={errors.subject}
            />
            <datalist id="subject-options">
              {[
                "Physics",
                "Chemistry",
                "Mathematics",
                "Biology",
                "English",
                "Commerce",
                "Economics",
                "Accounting",
                "Government",
                "Literature",
              ].map((subject) => (
                <option key={subject} value={subject} />
              ))}
            </datalist>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Topic"
                value={form.topic}
                onChange={(event) => updateField("topic", event.target.value)}
                placeholder="Waves and motion"
              />
              <Field
                label="Difficulty"
                value={form.difficultyLevel}
                onChange={(event) =>
                  updateField("difficultyLevel", event.target.value)
                }
                placeholder="Intermediate"
                list="difficulty-options"
              />
              <datalist id="difficulty-options">
                {["Beginner", "Intermediate", "Advanced"].map((level) => (
                  <option key={level} value={level} />
                ))}
              </datalist>
            </div>

            <Field
              label="Year"
              hint="Past questions only"
              value={form.year}
              onChange={(event) =>
                updateField("year", event.target.value.replace(/[^\d]/g, ""))
              }
              placeholder="2022"
              inputMode="numeric"
            />

            <div className="h-px w-full bg-[var(--sb-border)]" />

            <FieldShell label="Source type">
              <CustomSelect
                aria-label="Source type"
                value={form.questionType}
                onValueChange={(value) => updateSource({ questionType: value })}
                options={[...QUESTION_TYPE_OPTIONS]}
              />
            </FieldShell>

            <FieldShell label="Pool">
              <CustomSelect
                aria-label="Question pool"
                value={form.questionPool}
                onValueChange={(value) => updateSource({ questionPool: value })}
                /* A shared diagram is never served on its own, so the free
                   pool is not offered for it. Each question that uses it
                   picks its own pool. */
                options={QUESTION_POOL_OPTIONS.filter(
                  (option) => !isParent || option.value !== "FREE_EXAM",
                )}
              />
            </FieldShell>

            <FieldShell label="Review status">
              <CustomSelect
                aria-label="Review status"
                value={form.reviewStatus}
                onValueChange={(value) => updateField("reviewStatus", value)}
                options={[...REVIEW_STATUS_OPTIONS]}
              />
            </FieldShell>
            <p className="text-[length:var(--sb-text-xs)] text-[var(--sb-text-tertiary)]">
              {form.reviewStatus === "PUBLISHED"
                ? "Live. This question can already be showing to students."
                : form.reviewStatus === "VERIFIED"
                  ? "Checked, but held back. Set to Published when it should go live."
                  : "Not checked yet. Held back from students until it is Published."}
            </p>

            {/* Was a permanently disabled text input. It is a fact about the
                record, so it is shown as one. */}
            <div className="flex items-center justify-between gap-3 rounded-[var(--sb-radius)] border border-[var(--sb-border)] bg-[var(--sb-bg-inset)] px-3 py-2">
              <span className="text-[length:var(--sb-text-xs)] text-[var(--sb-text-tertiary)]">
                Institution
              </span>
              <span className="sb-mono text-[length:var(--sb-text-sm)] text-[var(--sb-text)]">
                {form.institutionCode || "—"}
              </span>
            </div>
          </div>
        </section>

        <div className="space-y-2">
          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={isSubmitting}
            isLoading={isSubmitting}
          >
            {!isSubmitting ? <Save className="h-4 w-4" /> : null}
            {isSubmitting
              ? "Saving"
              : mode === "create"
                ? "Create question"
                : "Save changes"}
          </Button>

          {mode === "edit" && attachedCount > 0 ? (
            <p className="text-[length:var(--sb-text-xs)] text-[var(--sb-text-tertiary)]">
              This shared diagram cannot be deleted while {attachedCount}{" "}
              question{attachedCount === 1 ? " uses" : "s use"} it. Delete or
              detach {attachedCount === 1 ? "it" : "them"} first.
            </p>
          ) : mode === "edit" && onDelete ? (
            <ConfirmButton
              variant="danger"
              className="w-full"
              confirmLabel="Yes, delete this question"
              onConfirm={() => void onDelete()}
              disabled={isDeleting}
              isLoading={isDeleting}
              icon={<Trash2 className="h-4 w-4" />}
            >
              Delete question
            </ConfirmButton>
          ) : null}
        </div>
      </div>
    </form>
  );
}
