"use client";

import { authApi } from "@/lib/api/auth";
import { useQuery } from "@tanstack/react-query";

export function useAdminSession() {
  return useQuery({
    queryKey: ["auth", "me"],
    queryFn: authApi.me,
    retry: false,
    staleTime: 60_000,
  });
}
