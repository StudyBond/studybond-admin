"use client";

import { hasMoreAfter, type QueueOrder } from "@/features/questions/lib/review-queue";
import { questionsApi } from "@/lib/api/questions";
import type {
  QuestionListResponse,
  QuestionSearchScope,
} from "@/lib/api/types";
import { keepPreviousData, useInfiniteQuery, useQuery } from "@tanstack/react-query";

export type QuestionKindFilter = "standalone" | "parent" | "child";

/** How many questions the review queue asks for in each request. */
export const REVIEW_BATCH_SIZE = 100;

export type AdminQuestionsFilters = {
  institutionCode?: string;
  subject?: string;
  topic?: string;
  questionType?: string;
  questionPool?: string;
  reviewStatus?: string;
  search?: string;
  /** Which parts of a question `search` looks through. Defaults to all. */
  searchIn?: QuestionSearchScope;
  page?: number;
  limit?: number;
  hasImage?: boolean;
  isAiGenerated?: boolean;
  year?: number;
  /** Only questions with no exam year. */
  noYear?: boolean;
  /** Ordinary questions, shared diagram rows, or questions that use one. */
  kind?: QuestionKindFilter;
  /** Only the questions attached to this shared diagram row. */
  parentQuestionId?: number;
  /** By upload (oldest/newest) or by exam year (year_desc/year_asc). */
  order?: QueueOrder;
  /** Cursors, each a question id. Only the review queue sends them. */
  afterId?: number;
  beforeId?: number;
  fromId?: number;
  /** needed: a picture is still to come. to_check: a drawing is waiting to be checked. */
  picture?: "needed" | "to_check";
};

export function useAdminQuestions(
  filters: AdminQuestionsFilters,
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: ["admin", "questions", filters],
    queryFn: () => questionsApi.list(filters),
    staleTime: 20_000,
    enabled: options.enabled ?? true,
  });
}

type QueueFilters = Omit<AdminQuestionsFilters, "afterId" | "beforeId" | "fromId" | "page" | "limit">;

/** Which batch to load: the first, one starting at a question, or one either side of those loaded. */
type QueueCursor =
  | { afterId: number }
  | { beforeId: number }
  | { fromId: number }
  | undefined;

/**
 * The review queue, loaded a batch at a time, in both directions.
 *
 * With `startAt` the first batch starts at that question, so a reviewer who
 * reloads the page is put straight back on it, however deep in the queue it
 * is. Earlier batches load as they go back. Each batch starts just past the
 * questions already loaded, so a question published between two requests
 * cannot make one skip a question. The pages stay in queue order, so
 * flattening them gives the queue as the reviewer walks it.
 */
export function useReviewQueue(
  filters: QueueFilters,
  startAt: number | null,
  options: { enabled?: boolean } = {},
) {
  return useInfiniteQuery({
    queryKey: ["admin", "questions", "review-queue", filters, startAt],
    queryFn: ({ pageParam }) =>
      questionsApi.list({ ...filters, ...pageParam, limit: REVIEW_BATCH_SIZE }),
    initialPageParam: (startAt ? { fromId: startAt } : undefined) as QueueCursor,
    getNextPageParam: (lastPage: QuestionListResponse): QueueCursor => {
      const lastId = lastPage.questions.at(-1)?.id;
      if (lastId === undefined || !hasMoreAfter(lastPage, REVIEW_BATCH_SIZE)) return undefined;
      return { afterId: lastId };
    },
    getPreviousPageParam: (firstPage: QuestionListResponse): QueueCursor => {
      const firstId = firstPage.questions[0]?.id;
      if (firstId === undefined || !firstPage.meta.before) return undefined;
      return { beforeId: firstId };
    },
    staleTime: 20_000,
    enabled: options.enabled ?? true,
  });
}

/**
 * How many questions each subject and year holds, for the review filters.
 * The menus keep their old counts while new ones load, so they never empty.
 */
export function useReviewFacets(filters: QueueFilters, options: { enabled?: boolean } = {}) {
  // Order does not change a count, so it is left out of the request and the key.
  const { order: _order, ...counted } = filters;
  return useQuery({
    queryKey: ["admin", "questions", "facets", counted],
    queryFn: () => questionsApi.facets(counted),
    staleTime: 20_000,
    placeholderData: keepPreviousData,
    enabled: options.enabled ?? true,
  });
}
