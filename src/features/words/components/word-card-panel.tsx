"use client";

import { ApiErrorMessage } from "@/components/ui/api-error-message";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { CustomSelect } from "@/components/ui/custom-select";
import { Field, FieldShell, TextArea } from "@/components/ui/field";
import {
  OPTION_LETTERS,
  cameOutLine,
  cardState,
  changedFields,
  emptyForm,
  formatDay,
  formToFields,
  parseSyllables,
  splitUnderline,
  toForm,
  type CardForm,
} from "@/features/words/lib/word-rules";
import { useAdminQuestion } from "@/features/questions/hooks/use-admin-question";
import { ApiError } from "@/lib/api/errors";
import { adminWordsApi, type WordCard, type WordCardFields, type WordKind } from "@/lib/api/admin-words";
import { cn } from "@/lib/utils/cn";
import { useMutation } from "@tanstack/react-query";
import { AlertTriangle, ExternalLink, Plus, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

/**
 * One word card: what still blocks it, its real JAMB questions, the days it
 * was shown or is planned for, and the form to edit it. With no card, the
 * same form adds a new one.
 */

type Props = {
  card: WordCard | null;
  newKind?: WordKind;
  onSaved: (card: WordCard) => void | Promise<void>;
  onDeleted?: () => void | Promise<void>;
  onCancelNew?: () => void;
  onDirtyChange?: (dirty: boolean) => void;
};

function problemsOf(error: unknown): string[] {
  if (!(error instanceof ApiError)) return [];
  const details = error.details as { problems?: unknown } | undefined;
  return Array.isArray(details?.problems) ? details.problems.filter((line): line is string => typeof line === "string") : [];
}

function showError(title: string, error: unknown) {
  const problems = problemsOf(error);
  toast.error(title, {
    description: problems.length ? (
      <ul className="list-disc space-y-0.5 pl-4">
        {problems.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    ) : (
      <ApiErrorMessage error={error} fallback="Please try again." />
    ),
  });
}

export function Underlined({ text }: { text: string }) {
  return (
    <>
      {splitUnderline(text).map((part, index) =>
        part.underlined ? (
          <u key={index} className="decoration-[var(--sb-accent)] decoration-2 underline-offset-4 text-[var(--sb-text)]">
            {part.text}
          </u>
        ) : (
          <span key={index}>{part.text}</span>
        ),
      )}
    </>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 border-t border-[var(--sb-border)] pt-4">
      <div>
        <h3 className="text-[length:var(--sb-text-md)] font-semibold text-[var(--sb-text)]">{title}</h3>
        {hint ? <p className="mt-0.5 text-[length:var(--sb-text-sm)] text-[var(--sb-text-secondary)]">{hint}</p> : null}
      </div>
      {children}
    </section>
  );
}

type QuestionText = {
  questionText?: string;
  optionA?: string;
  optionB?: string;
  optionC?: string;
  optionD?: string;
  optionE?: string | null;
  correctAnswer?: string;
};

/**
 * The tested sentence and its options, so the team can check the trap
 * letter against the real question. The list's excerpt is cut at 160
 * characters, which is mostly the instruction, so the full question is
 * fetched for the open card only.
 */
function QuestionBody({ questionId, excerpt, trap }: { questionId: number; excerpt: string; trap: string }) {
  const query = useAdminQuestion(questionId);
  const data = query.data as QuestionText | undefined;
  if (!data?.questionText) {
    return (
      <p className="mt-2 whitespace-pre-line text-[length:var(--sb-text-sm)] leading-relaxed text-[var(--sb-text-secondary)]">
        <Underlined text={excerpt} />
      </p>
    );
  }
  const parts = data.questionText.split(/\n\s*\n/);
  const sentence = parts.length > 1 ? parts.slice(1).join("\n\n") : parts[0];
  const options = OPTION_LETTERS.map((letter) => ({
    letter,
    text: data[`option${letter}` as keyof QuestionText] as string | null | undefined,
  })).filter((option) => option.text);
  const answer = (data.correctAnswer ?? "").trim().toUpperCase();

  return (
    <div className="mt-2 space-y-2">
      <p className="whitespace-pre-line text-[length:var(--sb-text-base)] leading-relaxed text-[var(--sb-text)]">
        <Underlined text={sentence} />
      </p>
      <ul className="grid gap-1 sm:grid-cols-2">
        {options.map((option) => (
          <li key={option.letter} className="flex items-baseline gap-2 text-[length:var(--sb-text-sm)] text-[var(--sb-text-secondary)]">
            <span className="w-4 shrink-0 font-mono text-[var(--sb-text-tertiary)]">{option.letter}</span>
            <span className={cn(option.letter === answer && "font-medium text-[var(--sb-success)]")}>{option.text}</span>
            {option.letter === answer ? <span className="text-[length:var(--sb-text-2xs)] text-[var(--sb-success)]">answer</span> : null}
            {option.letter === trap ? <span className="text-[length:var(--sb-text-2xs)] text-[var(--sb-warning)]">trap</span> : null}
          </li>
        ))}
      </ul>
      {trap && trap === answer ? (
        <p className="text-[length:var(--sb-text-xs)] text-[var(--sb-warning)]">The trap option is the right answer. Pick a wrong option as the trap.</p>
      ) : null}
    </div>
  );
}

/** The capitalised part of "in-SOL-vent", to check it against the stress tap. */
function stressedPart(sayAs: string): string | null {
  const parts = sayAs.split(/[\s-]+/).filter((part) => /[A-Z]/.test(part) && part === part.toUpperCase());
  return parts.length === 1 ? parts[0] : null;
}

export function WordCardPanel({ card, newKind = "WORD", onSaved, onDeleted, onCancelNew, onDirtyChange }: Props) {
  const isNew = card === null;
  const startForm = useMemo(() => (card ? toForm(card) : emptyForm(newKind)), [card, newKind]);
  const [form, setForm] = useState<CardForm>(startForm);
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});

  const result = useMemo(() => formToFields(form), [form]);
  const patch = useMemo(
    () => (card && result.fields ? changedFields(card, result.fields) : null),
    [card, result.fields],
  );
  const isDirty = JSON.stringify(form) !== JSON.stringify(startForm);
  /* With a field to fix, Save stays on so pressing it shows what to fix. */
  const hasChanges = isNew || patch === null ? isDirty : Object.keys(patch).length > 0;

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  const set = <K extends keyof CardForm>(key: K, value: CardForm[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    if (errors[key as string]) setErrors((current) => ({ ...current, [key as string]: undefined }));
  };

  const save = useMutation({
    mutationFn: (fields: WordCardFields) =>
      card ? adminWordsApi.update(card.id, changedFields(card, fields)) : adminWordsApi.create(fields),
    onSuccess: async (saved) => {
      toast.success(isNew ? `Added "${saved.headword}" as a draft` : "Saved");
      setForm(toForm(saved));
      await onSaved(saved);
    },
    onError: (error) => showError("Could not save the card", error),
  });

  const status = useMutation({
    mutationFn: (next: "DRAFT" | "READY") => adminWordsApi.setStatus((card as WordCard).id, next),
    onSuccess: async (saved) => {
      toast.success(saved.status === "READY" ? `"${saved.headword}" is ready` : `"${saved.headword}" is back to draft`);
      await onSaved(saved);
    },
    onError: (error) => showError("Could not change the status", error),
  });

  const remove = useMutation({
    mutationFn: () => adminWordsApi.remove((card as WordCard).id),
    onSuccess: async () => {
      toast.success("Card deleted");
      await onDeleted?.();
    },
    onError: (error) => showError("Could not delete the card", error),
  });

  function submit() {
    if (!result.fields) {
      setErrors(result.errors);
      toast.error("Fix the marked fields first");
      return;
    }
    save.mutate(result.fields);
  }

  const syllables = parseSyllables(form.syllables);
  const stressed = form.stressIndex !== null ? syllables[form.stressIndex] : undefined;
  const sayAsStress = stressedPart(form.sayAs);
  const stressMismatch =
    stressed && sayAsStress && sayAsStress.toLowerCase() !== stressed.toLowerCase()
      ? `"How to say it" stresses ${sayAsStress}, but the tap marks ${stressed.toUpperCase()}.`
      : null;
  const known = new Map((card?.questions ?? []).map((question) => [String(question.questionId), question]));
  const kindLocked = Boolean(card && (card.shownOn.length > 0 || card.plannedFor.length > 0));
  const slugLocked = Boolean(card && card.shownOn.length > 0);
  const state = card ? cardState(card) : null;
  const busy = save.isPending || status.isPending || remove.isPending;

  return (
    <div className="space-y-4 rounded-[var(--sb-radius-lg)] border border-[var(--sb-border)] bg-[var(--sb-surface-1)] p-4 sm:p-5">
      {/* Head */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-[length:var(--sb-text-xl)] font-semibold tracking-tight text-[var(--sb-text)]">
              {isNew ? `New ${newKind === "IDIOM" ? "idiom" : "word"}` : card.headword}
            </h2>
            {state ? <Badge tone={state.tone}>{state.label}</Badge> : <Badge>Starts as a draft</Badge>}
          </div>
          {card ? (
            <p className="mt-1 text-[length:var(--sb-text-sm)] text-[var(--sb-text-secondary)]">
              {[card.kind === "IDIOM" ? "Idiom" : "Word", card.partOfSpeech !== "idiom" ? card.partOfSpeech : null, card.sayAs, card.ipa]
                .filter(Boolean)
                .join(" · ")}
              <span className="text-[var(--sb-text-tertiary)]"> · came out in {cameOutLine(card)}</span>
            </p>
          ) : (
            <p className="mt-1 text-[length:var(--sb-text-sm)] text-[var(--sb-text-secondary)]">
              Most cards come in from the content pipeline on the Upload page. Add one here only for a quick fix.
            </p>
          )}
        </div>
        {card ? (
          <div className="flex flex-wrap items-center gap-2">
            {card.status === "DRAFT" ? (
              <Button
                type="button"
                onClick={() => status.mutate("READY")}
                disabled={card.readyProblems.length > 0 || busy || isDirty}
                isLoading={status.isPending}
                title={
                  isDirty
                    ? "Save your changes first"
                    : card.readyProblems.length > 0
                      ? "Fix the points below first"
                      : undefined
                }
              >
                Set ready
              </Button>
            ) : (
              <ConfirmButton
                variant="secondary"
                confirmLabel="Yes, back to draft"
                onConfirm={() => status.mutate("DRAFT")}
                isLoading={status.isPending}
                disabled={busy}
              >
                Set to draft
              </ConfirmButton>
            )}
            {card.shownOn.length === 0 ? (
              <ConfirmButton
                variant="secondary"
                confirmLabel="Yes, delete"
                onConfirm={() => remove.mutate()}
                isLoading={remove.isPending}
                disabled={busy}
                icon={<Trash2 className="h-3.5 w-3.5" />}
              >
                Delete
              </ConfirmButton>
            ) : null}
          </div>
        ) : null}
      </div>

      {card?.status === "READY" ? (
        <p className="text-[length:var(--sb-text-sm)] text-[var(--sb-text-secondary)]">
          Setting it back to draft takes it off today and every day after. Days already shown stay as they were.
        </p>
      ) : null}

      {card && card.readyProblems.length > 0 ? (
        <div className="flex gap-3 rounded-[var(--sb-radius)] border border-[var(--sb-warning-ring)] bg-[var(--sb-warning-soft)] p-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--sb-warning)]" />
          <div className="min-w-0 text-[length:var(--sb-text-sm)]">
            <p className="font-medium text-[var(--sb-text)]">Before it can go ready</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[var(--sb-text-secondary)]">
              {card.readyProblems.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      {/* Days */}
      {card ? (
        <dl className="grid gap-3 text-[length:var(--sb-text-sm)] sm:grid-cols-2">
          <div>
            <dt className="text-[length:var(--sb-text-xs)] font-medium text-[var(--sb-text-secondary)]">Shown on</dt>
            <dd className="mt-1 text-[var(--sb-text)]">
              {card.shownOn.length ? card.shownOn.map((day) => formatDay(day, true)).join(", ") : <span className="text-[var(--sb-text-tertiary)]">Not shown yet</span>}
            </dd>
          </div>
          <div>
            <dt className="text-[length:var(--sb-text-xs)] font-medium text-[var(--sb-text-secondary)]">Planned for</dt>
            <dd className="mt-1 text-[var(--sb-text)]">
              {card.plannedFor.length ? card.plannedFor.map((day) => formatDay(day)).join(", ") : <span className="text-[var(--sb-text-tertiary)]">Not planned</span>}
            </dd>
          </div>
        </dl>
      ) : null}

      {/* The word */}
      <Section title="The word">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field
            label={form.kind === "IDIOM" ? "Idiom" : "Word"}
            value={form.headword}
            onChange={(event) => set("headword", event.target.value)}
            error={errors.headword}
            maxLength={120}
          />
          <FieldShell label="Kind" hint={kindLocked ? "Locked: already planned or shown" : undefined}>
            <CustomSelect
              aria-label="Kind"
              value={form.kind}
              disabled={kindLocked}
              onValueChange={(value) => set("kind", value as WordKind)}
              options={[
                { value: "WORD", label: "Word" },
                { value: "IDIOM", label: "Idiom" },
              ]}
            />
          </FieldShell>
          <Field
            label="Part of speech"
            value={form.partOfSpeech}
            onChange={(event) => set("partOfSpeech", event.target.value)}
           
            error={errors.partOfSpeech}
          />
          <Field
            label="Link name"
            hint={slugLocked ? "Locked: already shown" : "Empty = made from the word"}
            value={form.slug}
            disabled={slugLocked}
            onChange={(event) => set("slug", event.target.value)}
            error={errors.slug}
          />
          <Field
            label="How to say it"
            hint="Stress in CAPITALS"
            value={form.sayAs}
            onChange={(event) => set("sayAs", event.target.value)}
            error={errors.sayAs}
          />
          <Field label="IPA" value={form.ipa} onChange={(event) => set("ipa", event.target.value)} error={errors.ipa} />
        </div>

        {form.kind === "WORD" ? (
          <div className="space-y-2">
            <Field
              label="Stress tap syllables"
              hint="Like in · sol · vent. Empty = no stress tap"
              value={form.syllables}
              onChange={(event) => set("syllables", event.target.value)}
              error={errors.syllables}
            />
            {syllables.length > 1 ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[length:var(--sb-text-xs)] text-[var(--sb-text-secondary)]">Stressed:</span>
                {syllables.map((part, index) => (
                  <button
                    key={`${part}-${index}`}
                    type="button"
                    aria-pressed={form.stressIndex === index}
                    onClick={() => set("stressIndex", index)}
                    className={cn(
                      "rounded-[var(--sb-radius-sm)] border px-3 py-1.5 font-mono text-[length:var(--sb-text-sm)] transition-colors duration-[var(--sb-duration-fast)]",
                      form.stressIndex === index
                        ? "border-[var(--sb-accent)] bg-[var(--sb-accent-soft)] font-semibold text-[var(--sb-accent-text)]"
                        : "border-[var(--sb-border)] bg-[var(--sb-bg-inset)] text-[var(--sb-text-secondary)] hover:border-[var(--sb-border-hover)]",
                    )}
                  >
                    {form.stressIndex === index ? part.toUpperCase() : part}
                  </button>
                ))}
                {form.stressIndex === null || form.stressIndex >= syllables.length ? (
                  <span className="text-[length:var(--sb-text-xs)] text-[var(--sb-warning)]">Tap the stressed syllable</span>
                ) : null}
              </div>
            ) : null}
            {stressMismatch ? <p className="text-[length:var(--sb-text-xs)] text-[var(--sb-warning)]">{stressMismatch}</p> : null}
          </div>
        ) : null}
      </Section>

      {/* Meaning */}
      <Section title="Meaning and examples">
        <TextArea
          label="Meaning"
          value={form.meaning}
          onChange={(event) => set("meaning", event.target.value)}
          error={errors.meaning}
          maxLength={400}
          className="min-h-16"
        />
        {form.examples.map((line, index) => (
          <Field
            key={index}
            label={`Example ${index + 1}`}
            hint={index === 0 ? "At least one" : "Optional"}
            value={line}
            onChange={(event) => {
              const next = [...form.examples];
              next[index] = event.target.value;
              set("examples", next);
            }}
            error={index === 0 ? errors.examples : undefined}
            maxLength={300}
          />
        ))}
        <div className="grid gap-3 sm:grid-cols-2">
          {form.kind === "WORD" ? (
            <Field label="Built from" value={form.builtFrom} onChange={(event) => set("builtFrom", event.target.value)} error={errors.builtFrom} />
          ) : (
            <Field label="Comes from" value={form.comesFrom} onChange={(event) => set("comesFrom", event.target.value)} error={errors.comesFrom} />
          )}
          <Field label="Theme" hint="Pairs cards now and then" value={form.theme} onChange={(event) => set("theme", event.target.value)} error={errors.theme} />
          <Field label="Opposite" value={form.opposite} onChange={(event) => set("opposite", event.target.value)} error={errors.opposite} />
          <Field label="Close to" value={form.closeTo} onChange={(event) => set("closeTo", event.target.value)} error={errors.closeTo} />
        </div>
        <TextArea label="Watch out" hint="Shown when a student picks the trap" value={form.watchOut} onChange={(event) => set("watchOut", event.target.value)} error={errors.watchOut} className="min-h-16" />
      </Section>

      {/* Questions */}
      <Section title="The real question" hint="The main question is the one students try on the card. It must be published before the card can go ready.">
        <div className="space-y-2">
          {form.questions.map((row, index) => {
            const linked = known.get(row.questionId.trim().replace(/^#/, ""));
            return (
              <div key={index} className="rounded-[var(--sb-radius)] border border-[var(--sb-border)] bg-[var(--sb-bg-inset)] p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    aria-label="Question number"
                    value={row.questionId}
                    onChange={(event) => {
                      const next = [...form.questions];
                      next[index] = { ...row, questionId: event.target.value };
                      set("questions", next);
                    }}
                    placeholder="Question #"
                    inputMode="numeric"
                    className="h-8 w-28 rounded-[var(--sb-radius-sm)] border border-[var(--sb-border)] bg-[var(--sb-surface-1)] px-2.5 font-mono text-[length:var(--sb-text-sm)] text-[var(--sb-text)] outline-none focus:border-[var(--sb-accent)]"
                  />
                  <label className="inline-flex items-center gap-1.5 text-[length:var(--sb-text-sm)] text-[var(--sb-text-secondary)]">
                    <input
                      type="radio"
                      name="main-question"
                      checked={row.isMain}
                      onChange={() => set("questions", form.questions.map((entry, at) => ({ ...entry, isMain: at === index })))}
                      className="accent-[var(--sb-accent)]"
                    />
                    Main
                  </label>
                  {linked ? (
                    <>
                      <span className="text-[length:var(--sb-text-xs)] text-[var(--sb-text-secondary)]">
                        {[linked.board, linked.subject, linked.year].filter(Boolean).join(" ")}
                      </span>
                      <Badge tone={linked.reviewStatus === "PUBLISHED" ? "success" : "warning"}>
                        {linked.reviewStatus === "PUBLISHED" ? "Published" : linked.reviewStatus === "VERIFIED" ? "Verified, not published" : "Draft, not published"}
                      </Badge>
                    </>
                  ) : row.questionId.trim() ? (
                    <span className="text-[length:var(--sb-text-xs)] text-[var(--sb-text-tertiary)]">Checked when you save</span>
                  ) : null}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="ml-auto"
                    aria-label="Remove this question"
                    onClick={() => set("questions", form.questions.filter((_, at) => at !== index))}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
                {linked ? (
                  <>
                    <QuestionBody questionId={linked.questionId} excerpt={linked.excerpt} trap={row.isMain ? form.trapOption : ""} />
                    <div className="mt-2 flex flex-wrap gap-3 text-[length:var(--sb-text-xs)]">
                      <Link href={`/questions/${linked.questionId}`} className="inline-flex items-center gap-1 text-[var(--sb-accent-text)] hover:underline">
                        Open question <ExternalLink className="h-3 w-3" />
                      </Link>
                      {linked.reviewStatus !== "PUBLISHED" ? (
                        <Link href={`/questions/review?question=${linked.questionId}`} className="inline-flex items-center gap-1 text-[var(--sb-accent-text)] hover:underline">
                          Check and publish it <ExternalLink className="h-3 w-3" />
                        </Link>
                      ) : null}
                    </div>
                  </>
                ) : null}
              </div>
            );
          })}
          {errors.questions ? <p className="text-[length:var(--sb-text-xs)] text-[var(--sb-danger)]">{errors.questions}</p> : null}
          {form.questions.length < 10 ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => set("questions", [...form.questions, { questionId: "", isMain: form.questions.length === 0 }])}
            >
              <Plus className="h-3.5 w-3.5" />
              {form.questions.length ? "Add another year it came out" : "Link a question"}
            </Button>
          ) : null}
        </div>
        <div className="grid gap-3 sm:grid-cols-[9rem_minmax(0,1fr)]">
          <FieldShell label="Trap option">
            <CustomSelect
              aria-label="Trap option"
              value={form.trapOption || "none"}
              onValueChange={(value) => set("trapOption", value === "none" ? "" : (value as CardForm["trapOption"]))}
              options={[{ value: "none", label: "None" }, ...OPTION_LETTERS.map((letter) => ({ value: letter, label: letter }))]}
            />
          </FieldShell>
          <TextArea label="Answer note" hint="After a right answer" value={form.answerNote} onChange={(event) => set("answerNote", event.target.value)} error={errors.answerNote} className="min-h-16" />
        </div>
      </Section>

      {/* Save */}
      <div className="sticky bottom-0 -mx-4 -mb-4 flex flex-wrap items-center justify-end gap-2 border-t border-[var(--sb-border)] bg-[var(--sb-surface-1)] px-4 py-3 sm:-mx-5 sm:-mb-5 sm:px-5">
        {isNew ? (
          <Button type="button" variant="ghost" onClick={onCancelNew} disabled={save.isPending}>
            Cancel
          </Button>
        ) : isDirty ? (
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setForm(startForm);
              setErrors({});
            }}
            disabled={save.isPending}
          >
            Undo changes
          </Button>
        ) : null}
        <Button type="button" onClick={submit} isLoading={save.isPending} disabled={!hasChanges || busy}>
          {isNew ? "Add card" : "Save changes"}
        </Button>
      </div>
    </div>
  );
}
