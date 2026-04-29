import { apiClient } from "@/lib/api/client";
import type {
  AdminActionResponse,
  AdminUser360Response,
  AdminUserListResponse,
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

export const adminUsersApi = {
  getUsers(params?: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
    isBanned?: boolean;
    isPremium?: boolean;
  }) {
    const search = new URLSearchParams();

    if (params?.page) search.set("page", String(params.page));
    if (params?.limit) search.set("limit", String(params.limit));
    if (params?.search) search.set("search", params.search);
    if (params?.role) search.set("role", params.role);
    if (typeof params?.isBanned === "boolean") search.set("isBanned", String(params.isBanned));
    if (typeof params?.isPremium === "boolean") search.set("isPremium", String(params.isPremium));

    const suffix = search.toString() ? `?${search.toString()}` : "";
    return apiClient<AdminUserListResponse>(`/api/admin/users${suffix}`);
  },
  getUser360(userId: number, institutionCode?: string) {
    const search = institutionCode
      ? `?institutionCode=${encodeURIComponent(institutionCode)}`
      : "";
    return apiClient<AdminUser360Response>(`/api/admin/users/${userId}/360${search}`);
  },
  banUser(userId: number, payload: { reason?: string }) {
    return apiClient<AdminActionResponse>(`/api/admin/users/${userId}/ban`, {
      method: "POST",
      body: JSON.stringify(payload),
      headers: buildSensitiveHeaders(),
    });
  },
  unbanUser(userId: number) {
    return apiClient<AdminActionResponse>(`/api/admin/users/${userId}/unban`, {
      method: "POST",
      headers: buildSensitiveHeaders(),
    });
  },
  removeDevice(
    userId: number,
    deviceId: string,
    payload?: { reason?: string },
  ) {
    return apiClient<AdminActionResponse>(`/api/admin/users/${userId}/devices/${deviceId}/remove`, {
      method: "POST",
      body: JSON.stringify(payload ?? {}),
      headers: buildSensitiveHeaders(),
    });
  },
  promoteUser(
    userId: number,
    payload: { newRole: "ADMIN" | "SUPERADMIN"; reason?: string },
    headers?: SensitiveHeadersOptions,
  ) {
    return apiClient<AdminActionResponse>(`/api/admin/users/${userId}/promote`, {
      method: "POST",
      body: JSON.stringify(payload),
      headers: buildSensitiveHeaders(headers),
    });
  },
  demoteUser(
    userId: number,
    payload?: { reason?: string },
    headers?: SensitiveHeadersOptions,
  ) {
    return apiClient<AdminActionResponse>(`/api/admin/users/${userId}/demote`, {
      method: "POST",
      body: JSON.stringify(payload ?? {}),
      headers: buildSensitiveHeaders(headers),
    });
  },
};
