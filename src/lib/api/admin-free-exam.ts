import { apiClient } from "@/lib/api/client";

type SensitiveHeadersOptions = {
  stepUpToken?: string | null;
  idempotencyKey?: string;
};

function buildSensitiveHeaders(options?: SensitiveHeadersOptions) {
  return {
    ...(options?.stepUpToken
      ? { "x-admin-step-up-token": options.stepUpToken }
      : {}),
    "idempotency-key": options?.idempotencyKey ?? crypto.randomUUID(),
  };
}

// ── Types ──────────────────────────────────────────────

export type FreeExamCoverageSubject = {
  institutionId: number;
  institutionCode: string;
  subject: string;
  featuredCount: number;
  cap: number;
  isFull: boolean;
};

export type FreeExamCoverageResponse = {
  subjects: FreeExamCoverageSubject[];
};

export type FreeExamToggleResponse = {
  success: boolean;
  message: string;
  updatedCount: number;
};

export type FreeExamResetResponse = {
  success: boolean;
  message: string;
  usersAffected: number;
};

// ── API ────────────────────────────────────────────────

export const adminFreeExamApi = {
  getCoverage(institutionCode?: string) {
    const params = new URLSearchParams();
    if (institutionCode) params.set("institutionCode", institutionCode);
    const suffix = params.toString() ? `?${params.toString()}` : "";
    return apiClient<FreeExamCoverageResponse>(`/api/admin/free-exam/coverage${suffix}`);
  },

  toggleQuestions(
    payload: { questionIds: number[]; featured: boolean },
    headers?: SensitiveHeadersOptions,
  ) {
    return apiClient<FreeExamToggleResponse>("/api/admin/free-exam/questions/toggle", {
      method: "POST",
      body: JSON.stringify(payload),
      headers: buildSensitiveHeaders(headers),
    });
  },

  resetCredits(headers?: SensitiveHeadersOptions) {
    return apiClient<FreeExamResetResponse>("/api/admin/free-exam/reset", {
      method: "POST",
      headers: buildSensitiveHeaders(headers),
    });
  },
};
