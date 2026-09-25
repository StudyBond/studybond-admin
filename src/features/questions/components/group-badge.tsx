import { Badge } from "@/components/ui/badge";
import { kindOfQuestion } from "@/features/questions/lib/question-form-state";
import type { QuestionListItem } from "@/lib/api/types";

/**
 * Marks a row that is part of a shared-diagram group, in the question bank
 * and the review queue, so a diagram row is never mistaken for a question
 * and a question that uses one says which.
 */
export function GroupBadge({ question }: { question: QuestionListItem }) {
  const kind = kindOfQuestion(question);

  if (kind === "parent") {
    const count = question.childCount ?? 0;
    return (
      <Badge tone="info">
        Shared diagram · {count} question{count === 1 ? "" : "s"}
      </Badge>
    );
  }

  if (kind === "child") {
    return <Badge tone="neutral">Uses diagram #{question.parentQuestionId}</Badge>;
  }

  return null;
}
