import type { BadgeTone } from "@/components/ui/badge";

/**
 * How a report's status and issue type are named and coloured.
 *
 * The list page and the detail page each had their own copy of these maps,
 * and they had already drifted: a PENDING report was amber in one and
 * warning-toned in the other, TYPO was cyan in one and info in the other,
 * and one file spelled the labels with `replaceAll("_", " ")` while the
 * other used a capitalising helper. The same report looked like two
 * different things depending on which screen you opened it from.
 */

export const REPORT_STATUS_TONE: Record<string, BadgeTone> = {
  PENDING: "warning",
  REVIEWED: "info",
  RESOLVED: "success",
};

/**
 * Issue type is what the learner claims is wrong. Severity is the honest
 * axis here: a wrong answer teaches something incorrect and outranks a typo.
 */
export const REPORT_ISSUE_TONE: Record<string, BadgeTone> = {
  WRONG_ANSWER: "danger",
  IMAGE_MISSING: "warning",
  AMBIGUOUS: "warning",
  TYPO: "info",
  OTHER: "neutral",
};

const REPORT_LABELS: Record<string, string> = {
  PENDING: "Pending",
  REVIEWED: "Reviewed",
  RESOLVED: "Resolved",
  WRONG_ANSWER: "Wrong answer",
  IMAGE_MISSING: "Image missing",
  AMBIGUOUS: "Ambiguous",
  TYPO: "Typo",
  OTHER: "Other",
};

/** Turns SCREAMING_SNAKE into something readable, for both maps above. */
export function reportLabel(value: string) {
  return (
    REPORT_LABELS[value] ??
    value.charAt(0) + value.slice(1).toLowerCase().replaceAll("_", " ")
  );
}

/** A note is required before a report can be reviewed or resolved. */
export const MIN_REPORT_NOTE_LENGTH = 5;
