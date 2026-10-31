"use client";

import type { QueueOrder } from "@/features/questions/lib/review-queue";
import { questionsApi } from "@/lib/api/questions";
import type {
  QuestionListResponse,
  QuestionSearchScope,
} from "@/lib/api/types";
import { type QueryClient, useInfiniteQuery, useQuery } from "@tanstack/react-query";

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
  /** Ordinary questions, shared diagram rows, or questions that use one. */
  kind?: QuestionKindFilter;
  /** Only the questions attached to this shared diagram row. */
  parentQuestionId?: number;
  /** Which end of the id order the list starts from. */
  order?: QueueOrder;
  /** Cursor: the last id already loaded. Only the review queue sends it. */
  afterId?: number;
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

/**
 * The review queue, loaded a batch at a time.
 *
 * Each batch starts just past the last question already loaded, so a question
 * published between two requests cannot make the next batch skip one. The
 * pages stay in queue order, so flattening them gives the queue as the
 * reviewer walks it.
 */
export function useReviewQueue(
  filters: Omit<AdminQuestionsFilters, "afterId" | "page" | "limit">,
  options: { enabled?: boolean } = {},
) {
  return useInfiniteQuery({
    queryKey: ["admin", "questions", "review-queue", filters],
    queryFn: ({ pageParam }) =>
      questionsApi.list({
        ...filters,
        limit: REVIEW_BATCH_SIZE,
        afterId: pageParam,
      }),
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (lastPage: QuestionListResponse) => {
      const lastId = lastPage.questions.at(-1)?.id;
      if (lastPage.questions.length < REVIEW_BATCH_SIZE || lastId === undefined) {
        return undefined;
      }
      return lastId;
    },
    staleTime: 20_000,
    enabled: options.enabled ?? true,
  });
}

/**
 * Loads review-queue batches for these filters until question `id` is among
 * them, and leaves them where useReviewQueue reads them, so the queue opens
 * with that question already loaded. Says whether it was found.
 */
export async function loadReviewQueueUntil(
  queryClient: QueryClient,
  filters: Omit<AdminQuestionsFilters, "afterId" | "page" | "limit">,
  id: number,
) {
  const pages: QuestionListResponse[] = [];
  const pageParams: Array<number | undefined> = [];
  let afterId: number | undefined;
  let found = false;
  for (;;) {
    const page = await questionsApi.list({ ...filters, limit: REVIEW_BATCH_SIZE, afterId });
    pages.push(page);
    pageParams.push(afterId);
    found = page.questions.some((question) => question.id === id);
    const lastId = page.questions.at(-1)?.id;
    if (found || page.questions.length < REVIEW_BATCH_SIZE || lastId === undefined) break;
    afterId = lastId;
  }
  queryClient.setQueryData(["admin", "questions", "review-queue", filters], { pages, pageParams });
  return found;
}
