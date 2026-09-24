"use client";

import { MathMarkdown } from "@/components/ui/math-markdown";
import type { FormState, Letter } from "@/features/questions/lib/question-form-state";
import { LETTERS } from "@/features/questions/lib/question-form-state";
import { scrollTopToReveal } from "@/features/questions/lib/preview-scroll";
import { cn } from "@/lib/utils/cn";
import { Check, Eye } from "lucide-react";
import { useEffect, useRef } from "react";

/**
 * What a learner actually sees, live, as the fields beside it are edited.
 *
 * Mirrors studybond-web's real exam screen — the same subject badge, the
 * same lettered option cards, the same accent treatment on the correct
 * answer (question-card.tsx / option-grid.tsx) — not a fresh guess at
 * "roughly what a question probably looks like." The explanation is shown
 * beneath it, labelled as such, because the real app only shows it after a
 * learner answers; a reviewer checking a question and its explanation
 * together is an admin-side convenience, not a claim that this is one exam
 * screen.
 *
 * It follows the reviewer. `activeField` is whichever field they last
 * clicked into: that block is outlined, and the panel scrolls to it if it is
 * not already in view. A preview pinned beside the editors is only worth
 * having if you never have to scroll it yourself to find what you just
 * changed. An empty field that is being edited still gets a placeholder
 * block, so there is always something to scroll to and outline — including
 * the moment before the first character is typed.
 *
 * On a screen too narrow for the two side by side, this stacks above the
 * editors and does not scroll on its own, which makes the follow behaviour a
 * harmless no-op there rather than something to switch off.
 */

export type PreviewField =
  | "questionText"
  | `option${Letter}`
  | "explanationText"
  | "additionalNotes";

/** Blue, not amber: amber already means "this is the correct answer". */
const EDITING_RING =
  "ring-2 ring-[var(--sb-info)]/50 ring-offset-4 ring-offset-[#050506]";

function optionText(form: FormState, letter: Letter): string {
  return form[`option${letter}` as `option${Letter}`];
}

function optionImageUrl(form: FormState, letter: Letter): string {
  return form[`option${letter}ImageUrl` as `option${Letter}ImageUrl`];
}

export function StudentPreview({
  form,
  activeField = null,
}: {
  form: FormState;
  activeField?: PreviewField | null;
}) {
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const body = bodyRef.current;
    if (!body || !activeField) return;

    const target = body.querySelector<HTMLElement>(
      `[data-preview="${activeField}"]`,
    );
    if (!target) return;

    const bodyRect = body.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();

    const next = scrollTopToReveal({
      scrollTop: body.scrollTop,
      viewportHeight: body.clientHeight,
      elementTop: targetRect.top - bodyRect.top + body.scrollTop,
      elementHeight: targetRect.height,
    });
    if (next === null) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    body.scrollTo({ top: next, behavior: reduceMotion ? "auto" : "smooth" });
  }, [activeField]);

  const isShown = (letter: Letter) =>
    optionText(form, letter).trim() ||
    optionImageUrl(form, letter) ||
    activeField === `option${letter}`;
  const hasAnyOption = LETTERS.some((letter) => isShown(letter));

  const showExplanation =
    form.explanationText.trim() ||
    form.explanationImageUrl ||
    activeField === "explanationText";

  return (
    <div className="flex flex-col overflow-hidden rounded-[var(--sb-radius-lg)] border border-[var(--sb-accent-ring)] lg:max-h-[calc(100dvh-var(--sb-topbar-height)-6rem)]">
      <div className="flex shrink-0 items-center gap-2 border-b border-[var(--sb-accent-ring)] bg-[var(--sb-accent-soft)] px-4 py-2">
        <Eye className="h-3.5 w-3.5 text-[var(--sb-accent)]" />
        <span className="text-[length:var(--sb-text-xs)] font-medium uppercase tracking-wide text-[var(--sb-accent)]">
          Student view
        </span>
        <span className="text-[length:var(--sb-text-xs)] text-[var(--sb-text-tertiary)]">
          — updates as you type
        </span>
      </div>

      {/* The web app's actual dark surface, not the admin's — this frame
          is meant to look like the real thing, not like more admin chrome.
          `relative` is not for positioning: it makes this the reference the
          scroll-to-field measurement is taken from. */}
      <div
        ref={bodyRef}
        className="relative min-h-0 flex-1 space-y-5 bg-[#050506] p-5 lg:overflow-y-auto"
      >
        {form.subject.trim() ? (
          <span className="inline-flex items-center rounded-lg border border-white/[0.06] bg-white/[0.04] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white/30">
            {form.subject}
          </span>
        ) : null}

        <div
          data-preview="questionText"
          className={cn(
            "rounded-xl transition-shadow duration-200",
            activeField === "questionText" && EDITING_RING,
          )}
        >
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
              if (!isShown(letter)) return null;

              const text = optionText(form, letter);
              const imageUrl = optionImageUrl(form, letter);
              const isCorrect = form.correctAnswer === letter;
              const isEditing = activeField === `option${letter}`;

              return (
                <div
                  key={letter}
                  data-preview={`option${letter}`}
                  className={cn(
                    "flex items-start gap-3.5 rounded-2xl border p-4 transition-[box-shadow,background-color,border-color] duration-200",
                    isCorrect
                      ? "border-[var(--sb-accent)]/40 bg-[var(--sb-accent)]/[0.08]"
                      : "border-white/[0.06] bg-white/[0.02]",
                    isEditing && EDITING_RING,
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
                    ) : !imageUrl ? (
                      <p className="text-sm italic text-white/25">
                        Option {letter} will appear here.
                      </p>
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

        {showExplanation ? (
          <div className="border-t border-white/[0.06] pt-4">
            <div
              data-preview="explanationText"
              className={cn(
                "rounded-xl transition-shadow duration-200",
                activeField === "explanationText" && EDITING_RING,
              )}
            >
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-white/20">
                Explanation — shown after the learner answers
              </p>
              {form.explanationText.trim() ? (
                <div className="text-sm leading-relaxed text-white/80">
                  <MathMarkdown
                    content={form.explanationText}
                    variant="explanation"
                  />
                </div>
              ) : !form.explanationImageUrl ? (
                <p className="text-sm italic text-white/25">
                  The explanation will appear here.
                </p>
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
          </div>
        ) : null}
      </div>
    </div>
  );
}
