import { apiClient } from "@/lib/api/client";
import type {
  AdminReport,
  AdminReportDeleteEnvelope,
  AdminReportDeleteResult,
  AdminReportEnvelope,
  AdminReportHardDeletePayload,
  AdminReportsListParams,
  AdminReportsListEnvelope,
  AdminReportsListResponse,
  AdminReportStatusEnvelope,
  AdminReportStatusResult,
  AdminReportStatusPayload,
} from "@/lib/api/types";

function unwrapEnvelope<T>(promise: Promise<{ data: T }>) {
  return promise.then((payload) => payload.data);
}

export const adminReportsApi = {
  list(params?: AdminReportsListParams): Promise<AdminReportsListResponse> {
    const search = new URLSearchParams();

    if (params?.page) search.set("page", String(params.page));
    if (params?.limit) search.set("limit", String(params.limit));
    if (params?.status) search.set("status", params.status);
    if (params?.issueType) search.set("issueType", params.issueType);
    if (params?.subject) search.set("subject", params.subject);
    if (params?.questionId) search.set("questionId", String(params.questionId));
    if (params?.userId) search.set("userId", String(params.userId));

    const suffix = search.toString() ? `?${search.toString()}` : "";
    return unwrapEnvelope(
      apiClient<AdminReportsListEnvelope>(`/api/admin/reports${suffix}`),
    );
  },
  getById(reportId: number): Promise<AdminReport> {
    return unwrapEnvelope(
      apiClient<AdminReportEnvelope>(`/api/admin/reports/${reportId}`),
    );
  },
  updateStatus(
    reportId: number,
    payload: AdminReportStatusPayload,
  ): Promise<AdminReportStatusResult> {
    return unwrapEnvelope(
      apiClient<AdminReportStatusEnvelope>(`/api/admin/reports/${reportId}/status`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      }),
    );
  },
  hardDelete(
    reportId: number,
    payload: AdminReportHardDeletePayload,
  ): Promise<AdminReportDeleteResult> {
    return unwrapEnvelope(
      apiClient<AdminReportDeleteEnvelope>(
        `/api/admin/reports/${reportId}/hard-delete`,
        {
          method: "DELETE",
          body: JSON.stringify(payload),
        },
      ),
    );
  },
};
