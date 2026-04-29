import { apiClient } from "@/lib/api/client";
import type { AdminSystemSettingsResponse } from "@/lib/api/types";

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
