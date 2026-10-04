"use client";

import type { QueueOrder } from "@/features/questions/lib/review-queue";
import { questionsApi } from "@/lib/api/questions";
import type {
  QuestionListResponse,
  QuestionSearchScope,
} from "@/lib/api/types";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";

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
