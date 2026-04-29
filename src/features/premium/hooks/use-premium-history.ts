"use client";

import { adminPremiumApi } from "@/lib/api/admin-premium";
import { useQuery } from "@tanstack/react-query";

export function usePremiumHistory(userId?: number) {
  return useQuery({
    queryKey: ["admin", "premium-history", userId],
    queryFn: () => adminPremiumApi.getPremiumHistory(userId as number),
    enabled: typeof userId === "number" && userId > 0,
    staleTime: 15_000,
  });
}
