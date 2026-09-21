"use client";

import { MathMarkdown } from "@/components/ui/math-markdown";
import type { FormState, Letter } from "@/features/questions/lib/question-form-state";
import { LETTERS } from "@/features/questions/lib/question-form-state";
import { cn } from "@/lib/utils/cn";
import { Check, Eye } from "lucide-react";

/**
 * What a learner actually sees, live, as the fields below are edited.
 *
 * Mirrors studybond-web's real exam screen — the same subject badge, the
 * same lettered option cards, the same accent treatment on the correct
 * answer (question-card.tsx / option-grid.tsx) — not a fresh guess at
 * "roughly what a question probably looks like." The explanation is shown
 * beneath it, labelled as such, because the real app only shows it after a
 * learner answers; a reviewer checking a question and its explanation
 * together is a admin-side convenience, not a claim that this is one exam
 * screen.
 */

function optionText(form: FormState, letter: Letter): string {
  return form[`option${letter}` as `option${Letter}`];
}

function optionImageUrl(form: FormState, letter: Letter): string {
  return form[`option${letter}ImageUrl` as `option${Letter}ImageUrl`];
}

export function StudentPreview({ form }: { form: FormState }) {
  const hasAnyOption = LETTERS.some(
    (letter) => optionText(form, letter).trim() || optionImageUrl(form, letter),
  );

  return (
    <div className="overflow-hidden rounded-[var(--sb-radius-lg)] border border-[var(--sb-accent-ring)]">
      <div className="flex items-center gap-2 border-b border-[var(--sb-accent-ring)] bg-[var(--sb-accent-soft)] px-4 py-2">
        <Eye className="h-3.5 w-3.5 text-[var(--sb-accent)]" />
        <span className="text-[length:var(--sb-text-xs)] font-medium uppercase tracking-wide text-[var(--sb-accent)]">
          Student view
        </span>
        <span className="text-[length:var(--sb-text-xs)] text-[var(--sb-text-tertiary)]">
          — updates as you type
        </span>
      </div>

      {/* The web app's actual dark surface, not the admin's — this frame
          is meant to look like the real thing, not like more admin chrome. */}
      <div className="space-y-5 bg-[#050506] p-5">
        {form.subject.trim() ? (
          <span className="inline-flex items-center rounded-lg border border-white/[0.06] bg-white/[0.04] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white/30">
            {form.subject}
          </span>
        ) : null}

        <div>
          {form.questionText.trim() ? (
            <h2 className="text-base font-medium leading-relaxed text-white/90 md:text-lg">
              <MathMarkdown content={form.questionText} variant="question" />
            </h2>
          ) : (
            <p className="text-base italic text-white/25">
              The question text will appear here.
            </p>
          )}

          {form.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={form.imageUrl}
              alt="Question illustration"
              className="mt-4 max-h-72 rounded-xl border border-white/[0.06] object-contain"
            />
          ) : null}
        </div>

        {hasAnyOption ? (
          <div className="space-y-2.5">
            {LETTERS.map((letter) => {
              const text = optionText(form, letter);
              const imageUrl = optionImageUrl(form, letter);
              if (!text.trim() && !imageUrl) return null;

              const isCorrect = form.correctAnswer === letter;

              return (
                <div
                  key={letter}
                  className={cn(
                    "flex items-start gap-3.5 rounded-2xl border p-4 transition-colors",
                    isCorrect
                      ? "border-[var(--sb-accent)]/40 bg-[var(--sb-accent)]/[0.08]"
                      : "border-white/[0.06] bg-white/[0.02]",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold",
                      isCorrect
                        ? "bg-[var(--sb-accent)] text-white"
                        : "bg-white/[0.05] text-white/40",
                    )}
                  >
                    {letter}
                  </span>

                  <div className="min-w-0 flex-1 pt-0.5">
                    {text.trim() ? (
                      <div
                        className={cn(
                          "text-sm leading-relaxed",
                          isCorrect ? "text-white" : "text-white/60",
                        )}
                      >
                        <MathMarkdown content={text} variant="option" />
                      </div>
                    ) : null}
                    {imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={imageUrl}
                        alt={`Option ${letter}`}
                        className="mt-2 max-h-40 rounded-lg border border-white/[0.06] object-contain"
                      />
                    ) : null}
                  </div>

                  {isCorrect ? (
                    <div className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--sb-accent)] text-white">
                      <Check className="h-3 w-3" strokeWidth={3} />
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm italic text-white/25">
            No answer choices yet — this will save as a parent prompt.
          </p>
        )}

        {form.explanationText.trim() || form.explanationImageUrl ? (
          <div className="border-t border-white/[0.06] pt-4">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-white/20">
              Explanation — shown after the learner answers
            </p>
            {form.explanationText.trim() ? (
              <div className="text-sm leading-relaxed text-white/80">
                <MathMarkdown content={form.explanationText} variant="explanation" />
              </div>
            ) : null}
            {form.explanationImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={form.explanationImageUrl}
                alt="Explanation illustration"
                className="mt-2 max-h-64 rounded-xl border border-white/[0.06] object-contain"
              />
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
