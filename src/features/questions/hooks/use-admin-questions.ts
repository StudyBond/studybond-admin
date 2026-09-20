"use client";

import { questionsApi } from "@/lib/api/questions";
import type { QuestionSearchScope } from "@/lib/api/types";
import { useQuery } from "@tanstack/react-query";

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
};

export function useAdminQuestions(filters: AdminQuestionsFilters) {
  return useQuery({
    queryKey: ["admin", "questions", filters],
    queryFn: () => questionsApi.list(filters),
    staleTime: 20_000,
  });
}
