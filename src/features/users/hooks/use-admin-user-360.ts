"use client";

import { adminUsersApi } from "@/lib/api/admin-users";
import { useQuery } from "@tanstack/react-query";

export function useAdminUser360(userId?: number, institutionCode?: string) {
  return useQuery({
    queryKey: ["admin", "users", "360", userId, institutionCode ?? "default"],
    queryFn: () => adminUsersApi.getUser360(userId as number, institutionCode),
    enabled: typeof userId === "number" && userId > 0,
    staleTime: 20_000,
  });
}
