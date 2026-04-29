"use client";

import { adminAnalyticsApi } from "@/lib/api/admin-analytics";
import { useQuery } from "@tanstack/react-query";

export function usePremiumInsights(days = 30, enabled = true) {
  return useQuery({
    queryKey: ["admin", "premium-insights", days],
    queryFn: () => adminAnalyticsApi.getPremium(days),
    enabled,
    staleTime: 30_000,
  });
}
