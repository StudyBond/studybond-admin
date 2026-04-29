import { apiClient } from "@/lib/api/client";
import type {
  AdminPremiumInsightsResponse,
  AdminStepUpRequestResponse,
  AdminStepUpVerifyResponse,
  PremiumGrantMutationResponse,
  PremiumHistoryResponse,
  PremiumRevokeMutationResponse,
  PremiumUserListResponse,
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

export const adminPremiumApi = {
  getPremiumUsers(params?: { page?: number; limit?: number }) {
    const search = new URLSearchParams();

    if (params?.page) search.set("page", String(params.page));
    if (params?.limit) search.set("limit", String(params.limit));

    const suffix = search.toString() ? `?${search.toString()}` : "";
    return apiClient<PremiumUserListResponse>(`/api/admin/premium-users${suffix}`);
  },
  getPremiumHistory(userId: number) {
    return apiClient<PremiumHistoryResponse>(`/api/admin/users/${userId}/premium/history`);
  },
  getPremiumInsights(days = 30) {
    return apiClient<AdminPremiumInsightsResponse>(`/api/admin/analytics/premium?days=${days}`);
  },
  requestStepUp() {
    return apiClient<AdminStepUpRequestResponse>("/api/admin/step-up/request", {
      method: "POST",
    });
  },
  verifyStepUp(payload: { challengeId: string; otp: string }) {
    return apiClient<AdminStepUpVerifyResponse>("/api/admin/step-up/verify", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  grantPremium(
    userId: number,
    payload: {
      kind: "MANUAL" | "PROMOTIONAL" | "CORRECTIVE";
      durationDays: number;
      note: string;
    },
    headers?: SensitiveHeadersOptions,
  ) {
    return apiClient<PremiumGrantMutationResponse>(`/api/admin/users/${userId}/premium/grants`, {
      method: "POST",
      body: JSON.stringify(payload),
      headers: buildSensitiveHeaders(headers),
    });
  },
  extendPremium(
    userId: number,
    payload: {
      kind: "MANUAL" | "PROMOTIONAL" | "CORRECTIVE";
      durationDays: number;
      note: string;
    },
    headers?: SensitiveHeadersOptions,
  ) {
    return apiClient<PremiumGrantMutationResponse>(`/api/admin/users/${userId}/premium/extend`, {
      method: "POST",
      body: JSON.stringify(payload),
      headers: buildSensitiveHeaders(headers),
    });
  },
  revokePremium(
    userId: number,
    payload: { note: string },
    headers?: SensitiveHeadersOptions,
  ) {
    return apiClient<PremiumRevokeMutationResponse>(`/api/admin/users/${userId}/premium/revoke`, {
      method: "POST",
      body: JSON.stringify(payload),
      headers: buildSensitiveHeaders(headers),
    });
  },
};
