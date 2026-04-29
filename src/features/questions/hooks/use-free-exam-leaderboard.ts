"use client";

import { useQuery } from "@tanstack/react-query";
import {
  adminFreeExamApi,
  type FreeExamLeaderboardResponse,
} from "@/lib/api/admin-free-exam";

export function useFreeExamLeaderboard(cycleIndex?: number) {
  return useQuery<FreeExamLeaderboardResponse>({
    queryKey: ["admin", "free-exam", "leaderboard", cycleIndex ?? 0],
    queryFn: () => adminFreeExamApi.getLeaderboard(cycleIndex),
    staleTime: 60_000,
  });
}
