/**
 * The admin-side half of the {{QUESTIONS}} placeholder. The server fills it
 * with the real question numbers before students see it (see
 * studybond-backend questions/stimulus-numbering.ts). Here it only has to
 * show an example, so a reviewer reads the sentence as a student will.
 */

const QUESTIONS_TOKEN = /\{\{\s*QUESTIONS\s*\}\}/gi;

/** What the reviewer sees in place of the token: numbers like a real exam. */
export const SAMPLE_QUESTIONS_PHRASE = "questions 21 to 23";

/** Used when a preview shows a single question with no numbering of its own. */
export const SINGLE_QUESTION_PHRASE = "this question";

export function hasQuestionsToken(text: string): boolean {
  QUESTIONS_TOKEN.lastIndex = 0;
  return QUESTIONS_TOKEN.test(text);
}

export function fillQuestionsToken(text: string, phrase: string): string {
  return text.replace(QUESTIONS_TOKEN, phrase);
}
