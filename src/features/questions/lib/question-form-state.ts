import type { QuestionPayload, QuestionRecord } from "@/lib/api/types";
import { hasQuestionsToken } from "./stimulus-preview";

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

/**
 * What a row is, chosen on purpose rather than guessed from blank fields.
 *
 * - standalone: an ordinary question with its own options and answer.
 * - parent: a shared diagram or passage. It has no options and no answer, and
 *   is never served on its own; the questions that use it show it above them.
 * - child: an ordinary question that uses a parent.
 */
export type QuestionKind = "standalone" | "parent" | "child";

export type FormState = {
  kind: QuestionKind;
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
  /** Shown to students under the explanation. */
  additionalNotes: string;
  /** Team-only. The server never sends it to students. */
  internalNotes: string;
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
const FREE_POOL = "FREE_EXAM";

const OPTION_TEXT_KEYS = ["optionA", "optionB", "optionC", "optionD"] as const;

function hasText(value: string | null | undefined): boolean {
  return Boolean(value && value.trim());
}

/** Works out which kind a saved question is, including legacy blank rows. */
export function kindOfQuestion(
  question?: Pick<
    QuestionRecord,
    | "parentQuestionId"
    | "optionA"
    | "optionB"
    | "optionC"
    | "optionD"
    | "correctAnswer"
  > & { childCount?: number | null } | null,
): QuestionKind {
  if (!question) return "standalone";
  if (question.parentQuestionId) return "child";

  const hasOptions = OPTION_TEXT_KEYS.some((key) => hasText(question[key]));
  if ((question.childCount ?? 0) > 0) return "parent";
  if (!hasOptions && !hasText(question.correctAnswer)) return "parent";
  return "standalone";
}

export function createInitialState(
  question?: QuestionRecord | null,
  overrides: Partial<FormState> = {},
): FormState {
  const base: FormState = {
    kind: kindOfQuestion(question),
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
      (question?.correctAnswer as FormState["correctAnswer"]) || "A",
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
    internalNotes: question?.internalNotes ?? "",
  };

  return { ...base, ...overrides };
}

export function compactValue(value: string) {
  return value.trim() || null;
}

/** The letters a correct answer can be chosen from: E only when it has text. */
export function availableLetters(state: Pick<FormState, "optionE">): Letter[] {
  return hasText(state.optionE) ? [...LETTERS] : ["A", "B", "C", "D"];
}

export function buildPayload(state: FormState): QuestionPayload {
  const isParent = state.kind === "parent";
  const isChild = state.kind === "child" && hasText(state.parentQuestionId);

  // A shared diagram is never served on its own, so it cannot sit in the free
  // pool. The server refuses it too; this keeps the form from sending it.
  const questionPool =
    isParent && state.questionPool === FREE_POOL
      ? DEFAULT_POOL
      : state.questionPool;

  const shared = {
    institutionCode: state.institutionCode.trim() || undefined,
    questionText: state.questionText.trim(),
    hasImage: Boolean(state.imageUrl.trim()),
    imageUrl: compactValue(state.imageUrl),
    imagePublicId: compactValue(state.imagePublicId),
    subject: state.subject.trim(),
    topic: compactValue(state.topic),
    difficultyLevel: compactValue(state.difficultyLevel),
    questionType: state.questionType,
    questionPool,
    reviewStatus: state.reviewStatus,
    year: state.year.trim() ? Number.parseInt(state.year, 10) : null,
    internalNotes: compactValue(state.internalNotes),
  };

  if (isParent) {
    // Options and answer are sent blank so a row converted from an ordinary
    // question is emptied properly. The explanation fields are left out
    // entirely: a shared row has no explanation, and leaving them out means
    // saving it never wipes one that is already stored.
    return {
      ...shared,
      optionA: "",
      optionB: "",
      optionC: "",
      optionD: "",
      optionE: null,
      optionAImageUrl: null,
      optionAImagePublicId: null,
      optionBImageUrl: null,
      optionBImagePublicId: null,
      optionCImageUrl: null,
      optionCImagePublicId: null,
      optionDImageUrl: null,
      optionDImagePublicId: null,
      optionEImageUrl: null,
      optionEImagePublicId: null,
      correctAnswer: undefined,
      parentQuestionId: null,
    } as QuestionPayload;
  }

  return {
    ...shared,
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
    parentQuestionId: isChild
      ? Number.parseInt(state.parentQuestionId, 10)
      : null,
    explanationText: compactValue(state.explanationText),
    explanationImageUrl: compactValue(state.explanationImageUrl),
    explanationImagePublicId: compactValue(state.explanationImagePublicId),
    additionalNotes: compactValue(state.additionalNotes),
  } as QuestionPayload;
}

export type FormErrors = Partial<
  Record<
    "questionText" | "subject" | "options" | "correctAnswer" | "parent",
    string
  >
>;

/** What blocks saving, by kind. Empty means the form can be sent. */
export function validateForm(state: FormState): FormErrors {
  const errors: FormErrors = {};

  if (!hasText(state.questionText)) {
    errors.questionText =
      state.kind === "parent"
        ? "Write the line students read with it, such as: Use the diagram below to answer {{QUESTIONS}}."
        : "Write the question before saving.";
  }
  if (!hasText(state.subject)) {
    errors.subject = "Every question needs a subject.";
  }

  if (state.kind === "parent") return errors;

  // {{QUESTIONS}} is filled in only from a shared diagram's own text.
  const tokenFields = [
    state.questionText,
    state.optionA,
    state.optionB,
    state.optionC,
    state.optionD,
    state.optionE,
    state.explanationText,
    state.additionalNotes,
  ];
  if (tokenFields.some((text) => hasQuestionsToken(text))) {
    errors.questionText =
      "{{QUESTIONS}} only works in a shared diagram. On a question, students would read it as written.";
  }

  if (state.kind === "child" && !hasText(state.parentQuestionId)) {
    errors.parent = "Choose the shared diagram or passage this question uses.";
  }

  if (!OPTION_TEXT_KEYS.every((key) => hasText(state[key]))) {
    errors.options = "Options A to D all need text.";
  }

  if (!availableLetters(state).includes(state.correctAnswer as Letter)) {
    errors.correctAnswer = `Option ${state.correctAnswer} has no text, so it cannot be the correct answer.`;
  }

  return errors;
}
