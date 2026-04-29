import { apiClient } from "@/lib/api/client";
import type { AdminAuditLogsResponse } from "@/lib/api/types";

export const adminAuditApi = {
  getLogs(params?: {
    page?: number;
    limit?: number;
    action?: string;
    targetType?: string;
  }) {
    const search = new URLSearchParams();

    if (params?.page) search.set("page", String(params.page));
    if (params?.limit) search.set("limit", String(params.limit));
    if (params?.action) search.set("action", params.action);
    if (params?.targetType) search.set("targetType", params.targetType);

    const suffix = search.toString() ? `?${search.toString()}` : "";
    return apiClient<AdminAuditLogsResponse>(`/api/admin/audit-logs${suffix}`);
  },
};
