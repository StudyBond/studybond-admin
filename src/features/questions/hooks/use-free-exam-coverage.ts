"use client";

import { adminFreeExamApi, type FreeExamCoverageResponse } from "@/lib/api/admin-free-exam";
import { useQuery } from "@tanstack/react-query";

export function useFreeExamCoverage(institutionCode?: string) {
  return useQuery<FreeExamCoverageResponse>({
    queryKey: ["admin", "free-exam", "coverage", institutionCode],
    queryFn: () => adminFreeExamApi.getCoverage(institutionCode),
    staleTime: 15_000,
  });
}
