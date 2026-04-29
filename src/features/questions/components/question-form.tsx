"use client";

import { ApiErrorMessage } from "@/components/ui/api-error-message";
import { StatusBadge } from "@/components/ui/status-badge";
import { Surface } from "@/components/ui/surface";
import { CustomSelect } from "@/components/ui/custom-select";
import { questionsApi } from "@/lib/api/questions";
import type { QuestionAssetKind, QuestionPayload, QuestionRecord } from "@/lib/api/types";
import {
  getQuestionPoolLabel,
  getQuestionTypeLabel,
  normalizeQuestionSource,
  QUESTION_POOL_OPTIONS,
  QUESTION_TYPE_OPTIONS,
} from "@/lib/utils/questions";
import { cn } from "@/lib/utils/cn";
import { ImagePlus, LoaderCircle, Save, Trash2, UploadCloud, X, ChevronDown } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

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

type AssetFieldProps = {
  label: string;
  kind: QuestionAssetKind;
  tone: "cyan" | "emerald" | "amber" | "rose";
  url: string;
  publicId: string;
  onChange: (url: string, publicId: string) => void;
  helper?: string;
};

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
    correctAnswer: (question?.correctAnswer as FormState["correctAnswer"]) ?? "A",
    subject: question?.subject ?? "",
    topic: question?.topic ?? "",
    difficultyLevel: question?.difficultyLevel ?? "",
    questionType: question?.questionType ?? "real_past_question",
    questionPool: question?.questionPool ?? "REAL_UI",
    parentQuestionId: question?.parentQuestionId ? String(question.parentQuestionId) : "",
    year: question?.year != null ? String(question.year) : "",
    explanationText: question?.explanation?.explanationText ?? "",
    explanationImageUrl: question?.explanation?.explanationImageUrl ?? "",
    explanationImagePublicId: question?.explanation?.explanationImagePublicId ?? "",
    additionalNotes: question?.explanation?.additionalNotes ?? "",
  };
}

function compactValue(value: string) {
  return value.trim() || null;
}

function buildPayload(state: FormState): QuestionPayload {
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
    correctAnswer: state.correctAnswer,
    subject: state.subject.trim(),
    topic: compactValue(state.topic),
    difficultyLevel: compactValue(state.difficultyLevel),
    questionType: state.questionType,
    questionPool: state.questionPool,
    parentQuestionId: state.parentQuestionId.trim()
      ? Number.parseInt(state.parentQuestionId, 10)
      : null,
    explanationText: compactValue(state.explanationText),
    explanationImageUrl: compactValue(state.explanationImageUrl),
    explanationImagePublicId: compactValue(state.explanationImagePublicId),
    additionalNotes: compactValue(state.additionalNotes),
    year: state.year.trim() ? Number.parseInt(state.year, 10) : null,
  } as QuestionPayload;
}

function FieldLabel({
  children,
  helper,
}: {
  children: React.ReactNode;
  helper?: string;
}) {
  return (
    <div className="mb-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
      <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-[color:var(--muted-foreground)]">
        {children}
      </span>
      {helper ? (
        <span className="text-[11px] text-[color:var(--muted-foreground)]/80">{helper}</span>
      ) : null}
    </div>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
  className,
  type = "text",
  inputMode,
  disabled,
  list,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  type?: React.HTMLInputTypeAttribute;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  disabled?: boolean;
  list?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      inputMode={inputMode}
      disabled={disabled}
      list={list}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className={cn(
        "w-full rounded-xl border border-white/8 bg-black/10 px-4 py-3 text-sm text-white outline-none transition placeholder:text-[color:var(--muted-foreground)]/50 focus:border-[color:var(--accent-cyan)]/40 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
    />
  );
}

function TextArea({
  value,
  onChange,
  rows = 4,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <textarea
      rows={rows}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="w-full resize-none rounded-xl border border-white/8 bg-black/10 px-4 py-3 text-sm text-white outline-none transition placeholder:text-[color:var(--muted-foreground)]/50 focus:border-[color:var(--accent-cyan)]/40"
    />
  );
}

function AssetField({
  label,
  kind,
  tone,
  url,
  publicId,
  onChange,
  helper,
}: AssetFieldProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const toneClass =
    tone === "emerald"
      ? "text-[color:var(--accent-emerald)]"
      : tone === "amber"
        ? "text-[color:var(--accent-amber)]"
        : tone === "rose"
          ? "text-[color:var(--accent-rose)]"
          : "text-[color:var(--accent-cyan)]";

  async function handleFileUpload(file: File) {
    try {
      setIsUploading(true);
      const asset = await questionsApi.uploadAsset(kind, file);
      onChange(asset.url, asset.publicId);
      toast.success(`${label} uploaded`);
    } catch (error) {
      toast.error(`Could not upload ${label.toLowerCase()}`, {
        description: <ApiErrorMessage error={error} fallback="Please try again." />,
      });
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-white/8 bg-black/10 p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className={cn("text-sm font-semibold", toneClass)}>{label}</p>
          <p className="mt-1 text-xs text-[color:var(--muted-foreground)]">
            {helper ?? "Paste an image URL or upload directly to the managed asset store."}
          </p>
        </div>
        <StatusBadge tone={url ? tone : "slate"}>{url ? "attached" : "empty"}</StatusBadge>
      </div>

      <div className="mt-4 space-y-3">
        <TextInput
          value={url}
          onChange={(value) => onChange(value, "")}
          placeholder="https://..."
        />

        <div className="flex flex-wrap gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                void handleFileUpload(file);
              }
              event.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white transition hover:border-white/20 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isUploading ? (
              <>
                <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                Uploading
              </>
            ) : (
              <>
                <UploadCloud className="h-3.5 w-3.5" />
                Upload
              </>
            )}
          </button>
          {url ? (
            <button
              type="button"
              onClick={() => onChange("", "")}
              className="inline-flex items-center gap-2 rounded-lg border border-[color:var(--accent-rose)]/20 bg-[color:var(--accent-rose)]/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--accent-rose)] transition hover:bg-[color:var(--accent-rose)]/15"
            >
              <X className="h-3.5 w-3.5" />
              Clear
            </button>
          ) : null}
        </div>

        {publicId ? (
          <div className="rounded-lg border border-white/8 bg-black/15 px-3 py-2 text-xs text-[color:var(--muted-foreground)]">
            Cloudinary ID: <span className="text-white">{publicId}</span>
          </div>
        ) : null}

        {url ? (
          <div className="overflow-hidden rounded-xl border border-white/8 bg-black/20">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt={label}
              className="max-h-48 w-full object-cover"
            />
          </div>
        ) : (
          <div className="flex h-32 items-center justify-center rounded-xl border border-dashed border-white/10 bg-black/10 text-[color:var(--muted-foreground)]">
            <div className="flex items-center gap-2 text-sm">
              <ImagePlus className="h-4 w-4" />
              No image attached
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function QuestionForm({
  mode,
  initialQuestion,
  isSubmitting = false,
  isDeleting = false,
  onSubmit,
  onDelete,
}: QuestionFormProps) {
  const [form, setForm] = useState<FormState>(() => createInitialState(initialQuestion));

  useEffect(() => {
    setForm(createInitialState(initialQuestion));
  }, [initialQuestion]);

  const correctAnswerOptions = useMemo(
    () => (form.optionE.trim() ? ["A", "B", "C", "D", "E"] : ["A", "B", "C", "D"]),
    [form.optionE],
  );

  const sourceSummary = useMemo(
    () =>
      `${getQuestionTypeLabel(form.questionType)} in ${getQuestionPoolLabel(form.questionPool)}`,
    [form.questionPool, form.questionType],
  );

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function updateSource(next: Partial<Pick<FormState, "questionType" | "questionPool">>) {
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

    const payload = buildPayload(form);
    if (!payload.questionText || !payload.optionA || !payload.optionB || !payload.optionC || !payload.optionD || !payload.subject) {
      toast.error("Complete the required fields before saving.");
      return;
    }

    if (!correctAnswerOptions.includes(payload.correctAnswer)) {
      toast.error("Correct answer must match the available options.");
      return;
    }

    try {
      await onSubmit(payload);
    } catch {
      // The page-level mutation already surfaces the error toast.
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
      {/* Main Content Area */}
      <div className="flex flex-col gap-8 lg:col-span-8">
        <Surface glow="cyan" className="p-5 max-md:!border-none max-md:!bg-transparent max-md:!p-0 max-md:!shadow-none md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[color:var(--accent-cyan)]">
                Prompt
              </p>
              <h2 className="mt-2 text-xl font-semibold text-white">Question content</h2>
            </div>
            <StatusBadge tone="cyan">{mode === "create" ? "new question" : "live record"}</StatusBadge>
          </div>

          <div className="mt-5 grid gap-4 xl:grid-cols-[1fr_0.92fr]">
            <div>
              <FieldLabel helper="Required">Question text</FieldLabel>
              <TextArea
                rows={9}
                value={form.questionText}
                onChange={(value) => updateField("questionText", value)}
                placeholder="Write the full question prompt here..."
              />
            </div>
            
            <AssetField
              label="Prompt image"
              kind="question"
              tone="cyan"
              url={form.imageUrl}
              publicId={form.imagePublicId}
              onChange={(nextUrl, nextPublicId) => {
                updateField("imageUrl", nextUrl);
                updateField("imagePublicId", nextPublicId);
              }}
              helper="Attach a diagram, chart, or question scan when the prompt depends on it."
            />
          </div>
        </Surface>

        <Surface className="p-5 max-md:!border-none max-md:!bg-transparent max-md:!p-0 max-md:!shadow-none md:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[color:var(--accent-amber)]">
                Answers
              </p>
              <h2 className="mt-2 text-xl font-semibold text-white">Options and solution</h2>
            </div>
            <StatusBadge tone="amber">{sourceSummary}</StatusBadge>
          </div>

          <div className="mt-5 grid gap-4">
            {(["A", "B", "C", "D", "E"] as const).map((letter) => {
              const optionKey = `option${letter}` as const;
              const urlKey = `option${letter}ImageUrl` as const;
              const publicIdKey = `option${letter}ImagePublicId` as const;
              const isOptional = letter === "E";
              const isSelected = form.correctAnswer === letter;

              return (
                <div
                  key={letter}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      updateField("correctAnswer", letter);
                    }
                  }}
                  onClick={() => updateField("correctAnswer", letter)}
                  className={cn(
                    "group relative overflow-hidden rounded-2xl border p-4 transition-all duration-[var(--duration-base)] ease-[var(--ease-out-expo)] md:p-5",
                    isSelected
                      ? "border-[color:var(--accent-emerald)] bg-[color:var(--accent-emerald)]/5 shadow-[0_0_24px_rgba(52,211,153,0.15)]"
                      : "border-white/5 bg-black/20 hover:border-white/15 hover:bg-black/30"
                  )}
                >
                  {/* Subtle inner glow effect when selected */}
                  {isSelected && (
                    <div className="pointer-events-none absolute -inset-px rounded-2xl border border-[color:var(--accent-emerald)]/50" />
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-4">
                      {/* Premium Radio Indicator */}
                      <div
                        className={cn(
                          "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors",
                          isSelected
                            ? "border-[color:var(--accent-emerald)] bg-[color:var(--accent-emerald)]/20"
                            : "border-white/20 bg-black/40 group-hover:border-white/40"
                        )}
                      >
                        {isSelected && (
                          <div className="h-2.5 w-2.5 rounded-full bg-[color:var(--accent-emerald)] shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <StatusBadge tone={isSelected ? "emerald" : "slate"}>
                          {isSelected ? "correct answer" : `option ${letter}`}
                        </StatusBadge>
                        <p
                          className={cn(
                            "text-sm font-semibold transition-colors",
                            isSelected ? "text-[color:var(--accent-emerald)]" : "text-white"
                          )}
                        >
                          Answer {letter}
                        </p>
                      </div>
                    </div>
                    {isOptional ? (
                      <span className="text-xs text-[color:var(--muted-foreground)]">
                        Optional fifth choice
                      </span>
                    ) : null}
                  </div>

                  <div
                    className="mt-5 grid gap-4 xl:grid-cols-[1fr_0.92fr]"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                  >
                    <div>
                      <FieldLabel helper={isOptional ? "Optional" : "Required"}>
                        Choice text
                      </FieldLabel>
                      <TextArea
                        rows={3}
                        value={form[optionKey]}
                        onChange={(value) => updateField(optionKey, value)}
                        placeholder={`Option ${letter}`}
                      />
                    </div>

                    <AssetField
                      label={`Option ${letter} image`}
                      kind={`option${letter}` as QuestionAssetKind}
                      tone={
                        letter === "A" || letter === "C"
                          ? "cyan"
                          : letter === "B" || letter === "D"
                            ? "amber"
                            : "rose"
                      }
                      url={form[urlKey]}
                      publicId={form[publicIdKey]}
                      onChange={(nextUrl, nextPublicId) => {
                        updateField(urlKey, nextUrl);
                        updateField(publicIdKey, nextPublicId);
                      }}
                      helper={`Attach an image only if option ${letter} needs visual context.`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Surface>

        <Surface className="p-5 max-md:!border-none max-md:!bg-transparent max-md:!p-0 max-md:!shadow-none md:p-6">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[color:var(--accent-emerald)]">
              Explanation
            </p>
            <h2 className="mt-2 text-xl font-semibold text-white">Learning support</h2>
          </div>

          <div className="mt-5 grid gap-4 xl:grid-cols-[1fr_0.92fr]">
            <div className="space-y-4">
              <div>
                <FieldLabel>Explanation text</FieldLabel>
                <TextArea
                  rows={5}
                  value={form.explanationText}
                  onChange={(value) => updateField("explanationText", value)}
                  placeholder="Explain the reasoning behind the correct answer..."
                />
              </div>
              <div>
                <FieldLabel>Additional notes</FieldLabel>
                <TextArea
                  rows={4}
                  value={form.additionalNotes}
                  onChange={(value) => updateField("additionalNotes", value)}
                  placeholder="Extra context for editors or learners..."
                />
              </div>
            </div>

            <AssetField
              label="Explanation image"
              kind="explanation"
              tone="emerald"
              url={form.explanationImageUrl}
              publicId={form.explanationImagePublicId}
              onChange={(nextUrl, nextPublicId) => {
                updateField("explanationImageUrl", nextUrl);
                updateField("explanationImagePublicId", nextPublicId);
              }}
              helper="Useful for worked diagrams, labels, or visual answer keys."
            />
          </div>
        </Surface>
      </div>

      {/* Right Sidebar - Sticky Metadata */}
      <div className="flex flex-col gap-8 lg:sticky lg:top-8 lg:col-span-4">
        <Surface glow="amber" className="p-5 max-md:!border-none max-md:!bg-transparent max-md:!p-0 max-md:!shadow-none md:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[color:var(--accent-amber)]">
                Metadata
              </p>
              <h2 className="mt-2 text-xl font-semibold text-white">Classification</h2>
            </div>
            <StatusBadge tone="amber">{getQuestionPoolLabel(form.questionPool)}</StatusBadge>
          </div>

          <div className="mt-5 space-y-5">
            <div className="grid gap-4">
              <div>
                <FieldLabel helper="Required">Subject</FieldLabel>
                <TextInput
                  value={form.subject}
                  onChange={(value) => updateField("subject", value)}
                  placeholder="Physics"
                  list="subject-options"
                />
                <datalist id="subject-options">
                  <option value="Physics" />
                  <option value="Chemistry" />
                  <option value="Mathematics" />
                  <option value="Biology" />
                  <option value="English" />
                  <option value="Commerce" />
                  <option value="Economics" />
                  <option value="Accounting" />
                  <option value="Government" />
                  <option value="Literature" />
                </datalist>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <FieldLabel>Topic</FieldLabel>
                  <TextInput
                    value={form.topic}
                    onChange={(value) => updateField("topic", value)}
                    placeholder="Waves and motion"
                  />
                </div>
                <div>
                  <FieldLabel>Difficulty</FieldLabel>
                  <TextInput
                    value={form.difficultyLevel}
                    onChange={(value) => updateField("difficultyLevel", value)}
                    placeholder="Intermediate"
                    list="difficulty-options"
                  />
                  <datalist id="difficulty-options">
                    <option value="Beginner" />
                    <option value="Intermediate" />
                    <option value="Advanced" />
                  </datalist>
                </div>
              </div>
              <div>
                <FieldLabel>Year</FieldLabel>
                <TextInput
                  value={form.year}
                  onChange={(value) => updateField("year", value.replace(/[^\d]/g, ""))}
                  placeholder="e.g. 2022"
                  inputMode="numeric"
                />
              </div>
            </div>

            <div className="my-2 h-px w-full bg-white/5" />

            <div className="space-y-4">
              <div>
                <FieldLabel>Question type</FieldLabel>
                <CustomSelect
                  value={form.questionType}
                  onValueChange={(val) => updateSource({ questionType: val })}
                  options={[...QUESTION_TYPE_OPTIONS]}
                />
              </div>

              <div>
                <FieldLabel>Question pool</FieldLabel>
                <CustomSelect
                  value={form.questionPool}
                  onValueChange={(val) => updateSource({ questionPool: val })}
                  options={[...QUESTION_POOL_OPTIONS]}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <FieldLabel>Parent ID</FieldLabel>
                  <TextInput
                    value={form.parentQuestionId}
                    onChange={(value) => updateField("parentQuestionId", value.replace(/[^\d]/g, ""))}
                    placeholder="Optional ID"
                    inputMode="numeric"
                  />
                </div>
                <div>
                  <FieldLabel>Institution code</FieldLabel>
                  <TextInput
                    value={form.institutionCode}
                    onChange={(value) => updateField("institutionCode", value)}
                    placeholder="ui"
                    disabled={true}
                  />
                </div>
              </div>
            </div>
          </div>
        </Surface>

        <Surface className="p-5 max-md:!border-none max-md:!bg-transparent max-md:!p-0 max-md:!shadow-none md:p-6">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-[color:var(--accent-cyan)]">
              <Save className="h-4 w-4" />
            </span>
            <div>
              <p className="text-base font-semibold text-white">Ready to save</p>
              <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">
                The current form will be validated by the backend before it is committed to the question bank.
              </p>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-[color:var(--background)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <LoaderCircle className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                {mode === "create" ? "Create question" : "Save changes"}
              </>
            )}
          </button>
        </Surface>

        {mode === "edit" && onDelete ? (
          <Surface glow="rose" className="p-5 max-md:!border-none max-md:!bg-transparent max-md:!p-0 max-md:!shadow-none md:p-6">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[color:var(--accent-rose)]/20 bg-[color:var(--accent-rose)]/10 text-[color:var(--accent-rose)]">
                <Trash2 className="h-4 w-4" />
              </span>
              <div>
                <p className="text-base font-semibold text-white">Danger zone</p>
                <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">
                  Delete this question only when it is safe to remove from the bank and no longer needed for moderation or content operations.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => void onDelete()}
              disabled={isDeleting}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[color:var(--accent-rose)]/20 bg-[color:var(--accent-rose)]/10 px-4 py-3 text-sm font-semibold text-[color:var(--accent-rose)] transition hover:bg-[color:var(--accent-rose)]/15 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isDeleting ? (
                <>
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  Delete question
                </>
              )}
            </button>
          </Surface>
        ) : null}
      </div>
    </form>
  );
}
