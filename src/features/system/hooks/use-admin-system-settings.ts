"use client";

import { adminSystemApi } from "@/lib/api/admin-system";
import { useQuery } from "@tanstack/react-query";

export function useAdminSystemSettings(enabled = true) {
  return useQuery({
    queryKey: ["admin", "system-settings"],
    queryFn: adminSystemApi.getSystemSettings,
    enabled,
    staleTime: 30_000,
  });
}
