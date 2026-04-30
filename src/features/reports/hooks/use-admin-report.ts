"use client";

import { adminReportsApi } from "@/lib/api/admin-reports";
import type { AdminReport } from "@/lib/api/types";
import { useQuery } from "@tanstack/react-query";

export function useAdminReport(reportId?: number) {
  return useQuery<AdminReport>({
    queryKey: ["admin", "report", reportId],
    queryFn: () => adminReportsApi.getById(reportId as number),
    enabled: typeof reportId === "number" && reportId > 0,
    staleTime: 15_000,
  });
}
