import type { QuestionListItem, QuestionListResponse } from "@/lib/api/types";

/**
 * The review queue's ordering rules, kept apart from the page so they can be
 * checked without rendering it.
 *
 * The queue arrives already sorted, in the order the admin chose. Everything
 * here compares questions by the same keys the backend sorts on, rather than
 * by list position, so a question published (and so removed from the list)
 * between two requests does not throw the reviewer off.
 */

/**
 * oldest/newest: by upload. year_desc/year_asc: by exam year, latest or
 * earliest paper first, then by upload. No year comes last in both.
 */
export type QueueOrder = "oldest" | "newest" | "year_desc" | "year_asc";

export const QUEUE_ORDERS: QueueOrder[] = ["oldest", "newest", "year_desc", "year_asc"];

/**
 * What a question is sorted on. `year` is undefined when it is not known,
 * which only happens for a question the queue was asked to start at.
 */
export type QueueKey = { id: number; year?: number | null };

export function keyOf(question: Pick<QuestionListItem, "id" | "year">): QueueKey {
  return { id: question.id, year: question.year ?? null };
}

/** Negative when `a` comes first in the queue, positive when `b` does. */
export function compareInQueue(a: QueueKey, b: QueueKey, order: QueueOrder) {
  if (order === "oldest") return a.id - b.id;
  if (order === "newest") return b.id - a.id;

  const ya = a.year ?? null;
  const yb = b.year ?? null;
  if (ya !== yb) {
    if (ya === null) return 1;
    if (yb === null) return -1;
    return order === "year_desc" ? yb - ya : ya - yb;
  }
  return a.id - b.id;
}

/** Whether `key` can be placed among other questions in this order. */
function isPlaceable(key: QueueKey, order: QueueOrder) {
  return order === "oldest" || order === "newest" || key.year !== undefined;
}

/** The question one step before or after `key`. The list is already in queue order. */
export function neighbourOf(
  list: QuestionListItem[],
  key: QueueKey,
  order: QueueOrder,
  step: 1 | -1,
) {
  if (step === 1) return list.find((q) => compareInQueue(keyOf(q), key, order) > 0);
  return list.filter((q) => compareInQueue(keyOf(q), key, order) < 0).at(-1);
}

/**
 * The question to show. When the open one has just left the queue (published,
 * or published by someone else), the one that took its place is the next in
 * order, so the reviewer moves on rather than snapping back to the top.
 *
 * A question the queue was asked to start at has no known year. The queue is
 * then loaded from that question on, so the first one is where it stood.
 */
export function pickCurrent(
  list: QuestionListItem[],
  current: QueueKey | null,
  order: QueueOrder,
) {
  if (current === null) return list[0] ?? null;
  const exact = list.find((q) => q.id === current.id);
  if (exact) return exact;
  if (!isPlaceable(current, order)) return list[0] ?? null;
  return (
    neighbourOf(list, current, order, 1) ??
    neighbourOf(list, current, order, -1) ??
    null
  );
}

/**
 * The loaded batches as one list. A question is kept once even if two
 * batches both hold it, which can happen when one was loaded either side of
 * an edit that moved it.
 */
export function flatten(pages: QuestionListResponse[] | undefined) {
  const seen = new Set<number>();
  const list: QuestionListItem[] = [];
  for (const page of pages ?? []) {
    for (const question of page.questions) {
      if (seen.has(question.id)) continue;
      seen.add(question.id);
      list.push(question);
    }
  }
  return list;
}

/** How many questions come before the first one loaded. */
export function loadedFrom(pages: QuestionListResponse[] | undefined) {
  return pages?.[0]?.meta.before ?? 0;
}

/** Whether there are questions after this batch. */
export function hasMoreAfter(page: QuestionListResponse, batchSize: number) {
  // An older backend sends no `before`; a short batch then means the end.
  if (page.meta.before === undefined) return page.questions.length >= batchSize;
  return page.meta.before + page.questions.length < page.meta.total;
}
