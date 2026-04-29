"use client";

import { adminUsersApi } from "@/lib/api/admin-users";
import { useQuery } from "@tanstack/react-query";

export function useAdminUsers(params?: {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  isBanned?: boolean;
  isPremium?: boolean;
}) {
  return useQuery({
    queryKey: ["admin", "users", params ?? {}],
    queryFn: () => adminUsersApi.getUsers(params),
    staleTime: 60_000,
  });
}
