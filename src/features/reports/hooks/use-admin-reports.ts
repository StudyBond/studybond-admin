"use client";

import { adminReportsApi } from "@/lib/api/admin-reports";
import type { AdminReportsListParams, AdminReportsListResponse } from "@/lib/api/types";
import { useQuery } from "@tanstack/react-query";

export type AdminReportsFilters = AdminReportsListParams;

export function useAdminReports(filters: AdminReportsFilters) {
  return useQuery<AdminReportsListResponse>({
    queryKey: [
      "admin",
      "reports",
      filters.page ?? 1,
      filters.limit ?? 20,
      filters.status ?? "",
      filters.issueType ?? "",
      filters.subject ?? "",
    ],
    queryFn: () => adminReportsApi.list(filters),
    staleTime: 15_000,
  });
}
