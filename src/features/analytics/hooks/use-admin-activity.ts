"use client";

import { adminAnalyticsApi } from "@/lib/api/admin-analytics";
import { useQuery } from "@tanstack/react-query";

export function useAdminActivity(days = 7, institutionCode?: string) {
  return useQuery({
    queryKey: ["admin", "analytics", "activity", days, institutionCode ?? "default"],
    queryFn: () => adminAnalyticsApi.getActivity(days, institutionCode),
    staleTime: 60_000,
  });
}
