import { adminAuditApi } from "@/lib/api/admin-audit";
import { useQuery } from "@tanstack/react-query";

export function useAdminAuditLogs(params?: {
  page?: number;
  limit?: number;
  action?: string;
  targetType?: string;
}) {
  return useQuery({
    queryKey: ["admin", "audit-logs", params],
    queryFn: () => adminAuditApi.getLogs(params),
    staleTime: 30_000,
  });
}
