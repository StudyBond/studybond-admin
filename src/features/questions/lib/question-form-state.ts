import type { QuestionPayload, QuestionRecord } from "@/lib/api/types";

/**
 * Turning a QuestionRecord into editable state, and back into a
 * QuestionPayload, in one place.
 *
 * Two screens need exactly this: the create/edit form (question-form.tsx)
 * and the content review queue. Before this file existed, both would have
 * needed their own copy of every field name — the kind of duplication where
 * adding one new question field means remembering to touch it twice, and
 * eventually someone doesn't.
 */

export type FormState = {
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
  reviewStatus: string;
  parentQuestionId: string;
  year: string;
  explanationText: string;
  explanationImageUrl: string;
  explanationImagePublicId: string;
  additionalNotes: string;
};

export const LETTERS = ["A", "B", "C", "D", "E"] as const;
export type Letter = (typeof LETTERS)[number];

/**
 * REAL_BANK, not REAL_UI. A question pool that isn't in the dropdown and
 * that the backend rejects outright — see question-form.tsx's history.
 */
export const DEFAULT_POOL = "REAL_BANK";
export const DEFAULT_TYPE = "real_past_question";
/** Matches how a question created here has always behaved: saved and live. */
export const DEFAULT_REVIEW_STATUS = "PUBLISHED";

export function createInitialState(question?: QuestionRecord | null): FormState {
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
    reviewStatus: question?.reviewStatus ?? DEFAULT_REVIEW_STATUS,
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

export function compactValue(value: string) {
  return value.trim() || null;
}

export function buildPayload(state: FormState): QuestionPayload {
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
    reviewStatus: state.reviewStatus,
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

/** True when every answer-choice field is blank — this saves as a parent
 *  prompt with no options of its own, rather than an incomplete question. */
export function isParentPrompt(state: FormState): boolean {
  return (
    !state.parentQuestionId.trim() &&
    !state.optionA.trim() &&
    !state.optionB.trim() &&
    !state.optionC.trim() &&
    !state.optionD.trim()
  );
}
