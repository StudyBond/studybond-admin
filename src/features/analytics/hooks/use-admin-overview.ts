"use client";

import { adminAnalyticsApi } from "@/lib/api/admin-analytics";
import { useQuery } from "@tanstack/react-query";

export function useAdminOverview(institutionCode?: string) {
  return useQuery({
    queryKey: ["admin", "analytics", "overview", institutionCode ?? "default"],
    queryFn: () => adminAnalyticsApi.getOverview(institutionCode),
    staleTime: 60_000,
  });
}
