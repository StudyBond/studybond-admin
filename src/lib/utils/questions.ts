export const QUESTION_TYPE_OPTIONS = [
  { value: "real_past_question", label: "Real past question" },
  { value: "practice", label: "Practice" },
  { value: "ai_generated", label: "AI generated" },
] as const;

export const QUESTION_POOL_OPTIONS = [
  { value: "FREE_EXAM", label: "Free exam pool" },
  { value: "REAL_BANK", label: "Real past questions" },
  { value: "PRACTICE", label: "Practice pool" },
] as const;

/**
 * DRAFT and VERIFIED are both held back from students — only PUBLISHED is
 * ever offered in an exam. VERIFIED exists as a staging state: a second
 * person has checked the question but it has not been scheduled live yet,
 * so a batch can be reviewed over time and then published together.
 */
export const REVIEW_STATUS_OPTIONS = [
  { value: "DRAFT", label: "Draft" },
  { value: "VERIFIED", label: "Verified" },
  { value: "PUBLISHED", label: "Published" },
] as const;

export function getReviewStatusLabel(value: string | null | undefined) {
  return (
    REVIEW_STATUS_OPTIONS.find((option) => option.value === value)?.label ??
    value ??
    "Unknown"
  );
}

export const QUESTION_ASSET_KINDS = [
  "question",
  "optionA",
  "optionB",
  "optionC",
  "optionD",
  "optionE",
  "explanation",
] as const;

export const BULK_UPLOAD_COLUMNS = [
  "questionText",
  "optionA",
  "optionB",
  "optionC",
  "optionD",
  "optionE",
  "correctAnswer",
  "subject",
  "topic",
  "difficultyLevel",
  "questionType",
  "questionPool",
  "imageUrl",
  "optionAImageUrl",
  "optionBImageUrl",
  "optionCImageUrl",
  "optionDImageUrl",
  "optionEImageUrl",
  "explanationText",
  "explanationImageUrl",
  "additionalNotes",
  "parentQuestionId",
  "year",
] as const;

export function getQuestionTypeLabel(value: string | null | undefined) {
  return (
    QUESTION_TYPE_OPTIONS.find((option) => option.value === value)?.label ?? value ?? "Unknown"
  );
}

export function getQuestionPoolLabel(value: string | null | undefined) {
  return (
    QUESTION_POOL_OPTIONS.find((option) => option.value === value)?.label ?? value ?? "Unknown"
  );
}

export function normalizeQuestionSource(
  questionType: string,
  questionPool: string,
) {
  let nextType = questionType;
  let nextPool = questionPool;

  if (nextPool === "FREE_EXAM" || nextPool === "REAL_BANK") {
    nextType = "real_past_question";
  }

  if (nextType === "practice" || nextType === "ai_generated") {
    nextPool = "PRACTICE";
  }

  if (nextType === "real_past_question" && nextPool === "PRACTICE") {
    nextPool = "REAL_BANK";
  }

  return {
    questionType: nextType,
    questionPool: nextPool,
  };
}
