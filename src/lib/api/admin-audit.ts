import { apiClient } from "@/lib/api/client";
import type { AdminAuditLogsResponse } from "@/lib/api/types";

export const adminAuditApi = {
  getLogs(params?: {
    page?: number;
    limit?: number;
    action?: string;
    targetType?: string;
    /** Full ISO timestamps. The backend compares them with gte/lte directly. */
    startDate?: string;
    endDate?: string;
  }) {
    const search = new URLSearchParams();

    if (params?.page) search.set("page", String(params.page));
    if (params?.limit) search.set("limit", String(params.limit));
    if (params?.action) search.set("action", params.action);
    if (params?.targetType) search.set("targetType", params.targetType);
    if (params?.startDate) search.set("startDate", params.startDate);
    if (params?.endDate) search.set("endDate", params.endDate);

    const suffix = search.toString() ? `?${search.toString()}` : "";
    return apiClient<AdminAuditLogsResponse>(`/api/admin/audit-logs${suffix}`);
  },
};
