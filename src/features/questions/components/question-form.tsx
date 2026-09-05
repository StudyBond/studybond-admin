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
} from "@/lib/utils/questions";
import { ImagePlus, Save, Trash2, UploadCloud, X } from "lucide-react";
import { useMemo, useRef, useState } from "react";
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
 */

type QuestionFormMode = "create" | "edit";

type QuestionFormProps = {
  mode: QuestionFormMode;
  initialQuestion?: QuestionRecord | null;
  isSubmitting?: boolean;
  isDeleting?: boolean;
  onSubmit: (payload: QuestionPayload) => Promise<unknown> | unknown;
  onDelete?: () => Promise<unknown> | unknown;
};

type FormState = {
  institutionCode: string;
  questionText: string;
  imageUrl: string;
  imagePublicId: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  optionE: string;
  optionAImageUrl: string;
  optionAImagePublicId: string;
  optionBImageUrl: string;
  optionBImagePublicId: string;
  optionCImageUrl: string;
  optionCImagePublicId: string;
  optionDImageUrl: string;
  optionDImagePublicId: string;
  optionEImageUrl: string;
  optionEImagePublicId: string;
  correctAnswer: "A" | "B" | "C" | "D" | "E";
  subject: string;
  topic: string;
  difficultyLevel: string;
  questionType: string;
  questionPool: string;
  parentQuestionId: string;
  year: string;
  explanationText: string;
  explanationImageUrl: string;
  explanationImagePublicId: string;
  additionalNotes: string;
};

type FormErrors = Partial<
  Record<"questionText" | "subject" | "options" | "correctAnswer", string>
>;

const LETTERS = ["A", "B", "C", "D", "E"] as const;
type Letter = (typeof LETTERS)[number];

/**
 * REAL_BANK, not REAL_UI. The old default was rejected by the backend and
 * matched no entry in the pool dropdown.
 */
const DEFAULT_POOL = "REAL_BANK";
const DEFAULT_TYPE = "real_past_question";

function createInitialState(question?: QuestionRecord | null): FormState {
  return {
    institutionCode: question?.institutionCode ?? "ui",
    questionText: question?.questionText ?? "",
    imageUrl: question?.imageUrl ?? "",
    imagePublicId: question?.imagePublicId ?? "",
    optionA: question?.optionA ?? "",
    optionB: question?.optionB ?? "",
    optionC: question?.optionC ?? "",
    optionD: question?.optionD ?? "",
    optionE: question?.optionE ?? "",
    optionAImageUrl: question?.optionAImageUrl ?? "",
    optionAImagePublicId: question?.optionAImagePublicId ?? "",
    optionBImageUrl: question?.optionBImageUrl ?? "",
    optionBImagePublicId: question?.optionBImagePublicId ?? "",
    optionCImageUrl: question?.optionCImageUrl ?? "",
    optionCImagePublicId: question?.optionCImagePublicId ?? "",
    optionDImageUrl: question?.optionDImageUrl ?? "",
    optionDImagePublicId: question?.optionDImagePublicId ?? "",
    optionEImageUrl: question?.optionEImageUrl ?? "",
    optionEImagePublicId: question?.optionEImagePublicId ?? "",
    correctAnswer:
      (question?.correctAnswer as FormState["correctAnswer"]) ?? "A",
    subject: question?.subject ?? "",
    topic: question?.topic ?? "",
    difficultyLevel: question?.difficultyLevel ?? "",
    questionType: question?.questionType ?? DEFAULT_TYPE,
    questionPool: question?.questionPool ?? DEFAULT_POOL,
    parentQuestionId: question?.parentQuestionId
      ? String(question.parentQuestionId)
      : "",
    year: question?.year != null ? String(question.year) : "",
    explanationText: question?.explanation?.explanationText ?? "",
    explanationImageUrl: question?.explanation?.explanationImageUrl ?? "",
    explanationImagePublicId:
      question?.explanation?.explanationImagePublicId ?? "",
    additionalNotes: question?.explanation?.additionalNotes ?? "",
  };
}

function compactValue(value: string) {
  return value.trim() || null;
}

function buildPayload(state: FormState): QuestionPayload {
  const hasOptionContent = [
    state.optionA,
    state.optionB,
    state.optionC,
    state.optionD,
  ].some((value) => value.trim().length > 0);
  const hasParentQuestion = Boolean(state.parentQuestionId.trim());

  return {
    institutionCode: state.institutionCode.trim() || undefined,
    questionText: state.questionText.trim(),
    hasImage: Boolean(state.imageUrl.trim()),
    imageUrl: compactValue(state.imageUrl),
    imagePublicId: compactValue(state.imagePublicId),
    optionA: state.optionA.trim(),
    optionB: state.optionB.trim(),
    optionC: state.optionC.trim(),
    optionD: state.optionD.trim(),
    optionE: compactValue(state.optionE),
    optionAImageUrl: compactValue(state.optionAImageUrl),
    optionAImagePublicId: compactValue(state.optionAImagePublicId),
    optionBImageUrl: compactValue(state.optionBImageUrl),
    optionBImagePublicId: compactValue(state.optionBImagePublicId),
    optionCImageUrl: compactValue(state.optionCImageUrl),
    optionCImagePublicId: compactValue(state.optionCImagePublicId),
    optionDImageUrl: compactValue(state.optionDImageUrl),
    optionDImagePublicId: compactValue(state.optionDImagePublicId),
    optionEImageUrl: compactValue(state.optionEImageUrl),
    optionEImagePublicId: compactValue(state.optionEImagePublicId),
    correctAnswer:
      hasOptionContent || hasParentQuestion ? state.correctAnswer : undefined,
    subject: state.subject.trim(),
    topic: compactValue(state.topic),
    difficultyLevel: compactValue(state.difficultyLevel),
    questionType: state.questionType,
    questionPool: state.questionPool,
    parentQuestionId: hasParentQuestion
      ? Number.parseInt(state.parentQuestionId, 10)
      : null,
    explanationText: compactValue(state.explanationText),
    explanationImageUrl: compactValue(state.explanationImageUrl),
    explanationImagePublicId: compactValue(state.explanationImagePublicId),
    additionalNotes: compactValue(state.additionalNotes),
    year: state.year.trim() ? Number.parseInt(state.year, 10) : null,
  } as QuestionPayload;
}

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
    createInitialState(initialQuestion),
  );
  const [errors, setErrors] = useState<FormErrors>({});

  const availableLetters = useMemo<Letter[]>(
    () => (form.optionE.trim() ? [...LETTERS] : ["A", "B", "C", "D"]),
    [form.optionE],
  );

  const isParentPrompt =
    !form.parentQuestionId.trim() &&
    !["optionA", "optionB", "optionC", "optionD"].some((key) =>
      form[key as keyof FormState].toString().trim(),
    );

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
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

  function validate(payload: QuestionPayload): FormErrors {
    const next: FormErrors = {};

    if (!payload.questionText) {
      next.questionText = "Write the question before saving.";
    }
    if (!payload.subject) {
      next.subject = "Every question needs a subject.";
    }

    const requiresAnswers = !isParentPrompt;
    if (
      requiresAnswers &&
      (!payload.optionA ||
        !payload.optionB ||
        !payload.optionC ||
        !payload.optionD)
    ) {
      next.options =
        "Options A to D all need text. Leave every option blank to save this as a parent prompt instead.";
    }

    if (
      requiresAnswers &&
      !availableLetters.includes(form.correctAnswer as Letter)
    ) {
      next.correctAnswer = `Option ${form.correctAnswer} has no text, so it cannot be the correct answer.`;
    }

    return next;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const payload = buildPayload(form);
    const nextErrors = validate(payload);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      toast.error("Some fields need attention", {
        description: "The problems are marked on the form.",
      });
      return;
    }

    try {
      await onSubmit(payload);
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
        <section className="space-y-3">
          <SectionTitle
            title="The question"
            description="What the learner reads first."
          />
          <div className="grid gap-4 rounded-[var(--sb-radius-lg)] border border-[var(--sb-border)] bg-[var(--sb-surface-1)] p-4 sm:p-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
            <TextArea
              label="Question text"
              hint="Required"
              rows={9}
              value={form.questionText}
              onChange={(event) =>
                updateField("questionText", event.target.value)
              }
              placeholder="Write the full question here…"
              error={errors.questionText}
            />

            <AssetField
              label="Question image"
              kind="question"
              url={form.imageUrl}
              publicId={form.imagePublicId}
              onChange={(nextUrl, nextPublicId) => {
                updateField("imageUrl", nextUrl);
                updateField("imagePublicId", nextPublicId);
              }}
              helper="A diagram or scan, when the question depends on one."
            />
          </div>
        </section>

        {/* ── Answers ─────────────────────────────────── */}
        <section className="space-y-3">
          <SectionTitle
            title="Answer choices"
            description={
              isParentPrompt
                ? "All blank, so this saves as a parent prompt with no options of its own."
                : "Fill A to D, then mark which one is correct."
            }
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

        {/* ── Explanation ─────────────────────────────── */}
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
                label="Notes"
                hint="Not shown to learners"
                rows={3}
                value={form.additionalNotes}
                onChange={(event) =>
                  updateField("additionalNotes", event.target.value)
                }
                placeholder="Context for whoever edits this next"
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
      </div>

      {/* ══ Classification and actions ════════════════════ */}
      <div className="min-w-0 space-y-6 lg:sticky lg:top-4 lg:col-span-4">
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
                options={[...QUESTION_POOL_OPTIONS]}
              />
            </FieldShell>

            <Field
              label="Parent question ID"
              hint="Optional"
              value={form.parentQuestionId}
              onChange={(event) =>
                updateField(
                  "parentQuestionId",
                  event.target.value.replace(/[^\d]/g, ""),
                )
              }
              placeholder="e.g. 1284"
              inputMode="numeric"
            />
            <p className="text-[length:var(--sb-text-xs)] text-[var(--sb-text-tertiary)]">
              Set this only for a follow-up question that hangs off an existing
              prompt.
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

          {mode === "edit" && onDelete ? (
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
