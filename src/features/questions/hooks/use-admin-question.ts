"use client";

import { questionsApi } from "@/lib/api/questions";
import { useQuery } from "@tanstack/react-query";

export function useAdminQuestion(questionId?: number) {
  return useQuery({
    queryKey: ["admin", "questions", questionId],
    queryFn: () => questionsApi.getById(questionId as number),
    enabled: typeof questionId === "number" && questionId > 0,
    staleTime: 20_000,
  });
}
