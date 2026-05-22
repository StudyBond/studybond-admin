import { apiClient } from "@/lib/api/client";
import type {
  AdminCreateNotificationAnnouncementPayload,
  AdminNotificationAnnouncementMutation,
  AdminNotificationAnnouncementsFilter,
  AdminNotificationAnnouncementsList,
  AdminSystemSettingsResponse,
  SuccessEnvelope,
} from "@/lib/api/types";

type SensitiveHeadersOptions = {
  stepUpToken?: string | null;
  idempotencyKey?: string;
};

function buildSensitiveHeaders(options?: SensitiveHeadersOptions) {
  return {
    ...(options?.stepUpToken
      ? {
          "x-admin-step-up-token": options.stepUpToken,
        }
      : {}),
    "idempotency-key": options?.idempotencyKey ?? crypto.randomUUID(),
  };
}

export const adminSystemApi = {
  getSystemSettings() {
    return apiClient<AdminSystemSettingsResponse>("/api/admin/system/settings");
  },
  async getNotificationAnnouncements(params?: {
    page?: number;
    limit?: number;
    status?: AdminNotificationAnnouncementsFilter;
  }) {
    const search = new URLSearchParams();
    if (params?.page) {
      search.set("page", String(params.page));
    }
    if (params?.limit) {
      search.set("limit", String(params.limit));
    }
    if (params?.status) {
      search.set("status", params.status);
    }

    const response = await apiClient<SuccessEnvelope<AdminNotificationAnnouncementsList>>(
      `/api/admin/notifications/announcements${search.size ? `?${search.toString()}` : ""}`
    );
    return response.data;
  },
  async createNotificationAnnouncement(
    payload: AdminCreateNotificationAnnouncementPayload,
    headers?: SensitiveHeadersOptions
  ) {
    const response = await apiClient<SuccessEnvelope<AdminNotificationAnnouncementMutation>>(
      "/api/admin/notifications/announcements",
      {
        method: "POST",
        body: JSON.stringify(payload),
        headers: buildSensitiveHeaders(headers),
      }
    );
    return response.data;
  },
  async cancelNotificationAnnouncement(
    announcementId: string,
    headers?: SensitiveHeadersOptions
  ) {
    const response = await apiClient<SuccessEnvelope<AdminNotificationAnnouncementMutation>>(
      `/api/admin/notifications/announcements/${announcementId}/cancel`,
      {
        method: "PATCH",
        headers: buildSensitiveHeaders(headers),
      }
    );
    return response.data;
  },
  toggleEmailSystem(enabled: boolean, headers?: SensitiveHeadersOptions) {
    return apiClient<AdminSystemSettingsResponse>("/api/admin/system/email-toggle", {
      method: "POST",
      body: JSON.stringify({ enabled }),
      headers: buildSensitiveHeaders(headers),
    });
  },
  createInstitution(
    payload: { code: string; name: string; slug: string },
    headers?: SensitiveHeadersOptions
  ) {
    return apiClient<{ success: boolean; institution: any }>("/api/admin/institutions", {
      method: "POST",
      body: JSON.stringify(payload),
      headers: buildSensitiveHeaders(headers),
    });
  },
};
