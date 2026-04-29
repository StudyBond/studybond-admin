"use client";

import { adminPremiumApi } from "@/lib/api/admin-premium";
import { useQuery } from "@tanstack/react-query";

export function usePremiumUsers(
  params?: { page?: number; limit?: number },
  enabled = true,
) {
  return useQuery({
    queryKey: ["admin", "premium-users", params?.page ?? 1, params?.limit ?? 20],
    queryFn: () => adminPremiumApi.getPremiumUsers(params),
    enabled,
    staleTime: 30_000,
  });
}
