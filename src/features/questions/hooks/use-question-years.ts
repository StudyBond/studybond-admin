"use client";

import { questionsApi } from "@/lib/api/questions";
import { useQuery } from "@tanstack/react-query";

export function useQuestionYears(institutionCode?: string) {
  return useQuery({
    queryKey: ["admin", "question-years", institutionCode],
    queryFn: () => questionsApi.listYears(institutionCode),
    staleTime: 60_000, // years change infrequently
    select: (data) => data.years,
  });
}
