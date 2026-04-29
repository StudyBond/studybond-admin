"use client";

import { adminAnalyticsApi } from "@/lib/api/admin-analytics";
import { useQuery } from "@tanstack/react-query";

export function useAdminSystemHealth() {
  return useQuery({
    queryKey: ["admin", "analytics", "system-health"],
    queryFn: () => adminAnalyticsApi.getSystemHealth(),
    staleTime: 30_000,
    refetchInterval: 30_000,
  });
}
