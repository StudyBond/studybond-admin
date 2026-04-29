"use client";

import { adminAnalyticsApi } from "@/lib/api/admin-analytics";
import { useQuery } from "@tanstack/react-query";

export function useAdminPremiumInsights(days = 30, enabled = true) {
  return useQuery({
    queryKey: ["admin", "analytics", "premium", days],
    queryFn: () => adminAnalyticsApi.getPremium(days),
    enabled,
    staleTime: 60_000,
  });
}
