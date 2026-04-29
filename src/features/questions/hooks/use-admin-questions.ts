"use client";

import { questionsApi } from "@/lib/api/questions";
import { useQuery } from "@tanstack/react-query";

export type AdminQuestionsFilters = {
  institutionCode?: string;
  subject?: string;
  topic?: string;
  questionType?: string;
  questionPool?: string;
  search?: string;
  page?: number;
  limit?: number;
  hasImage?: boolean;
  isAiGenerated?: boolean;
};

export function useAdminQuestions(filters: AdminQuestionsFilters) {
  return useQuery({
    queryKey: ["admin", "questions", filters],
    queryFn: () => questionsApi.list(filters),
    staleTime: 20_000,
  });
}
