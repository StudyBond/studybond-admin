/**
 * Option markers, for the admin preview only.
 *
 * An explanation names an option as `{{C}}` rather than "C", because options
 * are shuffled on retakes, daily challenges and bookmark exams — the letter a
 * student sees is not always the letter the option was authored under. The
 * server swaps every marker for the right letter before an explanation reaches
 * a student (studybond-backend/src/modules/questions/option-markers.ts), so
 * nobody revising ever sees a brace.
 *
 * The preview does not go through the server, so without this it would show
 * `{{C}}` in a panel titled "as students see it" — the one thing a preview
 * must never do.
 *
 * The letter shown here is the option's own, which is what a student sees
 * wherever options are not shuffled (study mode, and answer review, which
 * replays the order the student actually sat). In a shuffled exam that same
 * option may carry a different letter; the preview cannot know which, and the
 * authored order is the honest default.
 */

/** `{{A}}` to `{{E}}`. Spaces inside the braces are allowed, as on the server. */
const OPTION_MARKER = /\{\{\s*([A-E])\s*\}\}/g;

export function resolveOptionMarkers(text: string): string;
export function resolveOptionMarkers(text: string | null | undefined): string | null;
export function resolveOptionMarkers(text: string | null | undefined): string | null {
    if (!text) return text ?? null;
    return text.replace(OPTION_MARKER, (_marker, letter: string) => letter);
}
