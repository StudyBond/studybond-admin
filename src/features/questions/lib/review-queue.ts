import type { QuestionListItem, QuestionListResponse } from "@/lib/api/types";

/**
 * The review queue's ordering rules, kept apart from the page so they can be
 * checked without rendering it.
 *
 * The queue arrives already sorted by question id, in the order the admin
 * chose. Everything here works from ids rather than list positions, so a
 * question published (and so removed from the list) between two requests does
 * not throw the reviewer off.
 */

export type QueueOrder = "oldest" | "newest";

/** A number that rises through the queue in the chosen order, so "next" is always the larger one. */
export function rankOf(id: number, order: QueueOrder) {
  return order === "oldest" ? id : -id;
}

/** The question one step before or after `id`. The list is already in queue order. */
export function neighbourOf(
  list: QuestionListItem[],
  id: number,
  order: QueueOrder,
  step: 1 | -1,
) {
  const rank = rankOf(id, order);
  if (step === 1) return list.find((q) => rankOf(q.id, order) > rank);
  return list.filter((q) => rankOf(q.id, order) < rank).at(-1);
}

/**
 * The question to show. When the open one has just left the queue (published,
 * or published by someone else), the one that took its place is the next in
 * order, so the reviewer moves on rather than snapping back to the top.
 */
export function pickCurrent(
  list: QuestionListItem[],
  id: number | null,
  order: QueueOrder,
) {
  if (id === null) return list[0] ?? null;
  return (
    list.find((q) => q.id === id) ??
    neighbourOf(list, id, order, 1) ??
    neighbourOf(list, id, order, -1) ??
    null
  );
}

export function flatten(pages: QuestionListResponse[] | undefined) {
  return pages?.flatMap((page) => page.questions) ?? [];
}
