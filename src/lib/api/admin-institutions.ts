import { apiClient } from "@/lib/api/client";
import type {
  AdminCreateSubjectInput,
  AdminInstitutionConfigMutationResponse,
  AdminInstitutionDetailResponse,
  AdminInstitutionExamConfigInput,
  AdminInstitutionListResponse,
  AdminInstitutionSubjectsInput,
  AdminInstitutionSubjectsMutationResponse,
  AdminSubjectCatalogueResponse,
  AdminSubjectMutationResponse,
  AdminUpdateSubjectInput,
} from "@/lib/api/types";

type SensitiveHeadersOptions = {
  stepUpToken?: string | null;
  idempotencyKey?: string;
};

/**
 * Writes here change how exams are built for every student at an
 * institution, so the backend wants a step-up token. The idempotency key
 * stops a double-click writing twice.
 */
function buildSensitiveHeaders(options?: SensitiveHeadersOptions) {
  return {
    ...(options?.stepUpToken
      ? { "x-admin-step-up-token": options.stepUpToken }
      : {}),
    "idempotency-key": options?.idempotencyKey ?? crypto.randomUUID(),
  };
}

export const adminInstitutionsApi = {
  list() {
    return apiClient<AdminInstitutionListResponse>("/api/admin/institutions");
  },

  get(institutionId: number) {
    return apiClient<AdminInstitutionDetailResponse>(
      `/api/admin/institutions/${institutionId}`,
    );
  },

  updateExamConfig(
    institutionId: number,
    payload: AdminInstitutionExamConfigInput,
    headers?: SensitiveHeadersOptions,
  ) {
    return apiClient<AdminInstitutionConfigMutationResponse>(
      `/api/admin/institutions/${institutionId}/exam-config`,
      {
        method: "PATCH",
        body: JSON.stringify(payload),
        headers: buildSensitiveHeaders(headers),
      },
    );
  },

  replaceSubjects(
    institutionId: number,
    payload: AdminInstitutionSubjectsInput,
    headers?: SensitiveHeadersOptions,
  ) {
    return apiClient<AdminInstitutionSubjectsMutationResponse>(
      `/api/admin/institutions/${institutionId}/subjects`,
      {
        method: "PUT",
        body: JSON.stringify(payload),
        headers: buildSensitiveHeaders(headers),
      },
    );
  },

  listSubjects() {
    return apiClient<AdminSubjectCatalogueResponse>("/api/admin/subjects");
  },

  createSubject(
    payload: AdminCreateSubjectInput,
    headers?: SensitiveHeadersOptions,
  ) {
    return apiClient<AdminSubjectMutationResponse>("/api/admin/subjects", {
      method: "POST",
      body: JSON.stringify(payload),
      headers: buildSensitiveHeaders(headers),
    });
  },

  updateSubject(
    subjectId: number,
    payload: AdminUpdateSubjectInput,
    headers?: SensitiveHeadersOptions,
  ) {
    return apiClient<AdminSubjectMutationResponse>(
      `/api/admin/subjects/${subjectId}`,
      {
        method: "PATCH",
        body: JSON.stringify(payload),
        headers: buildSensitiveHeaders(headers),
      },
    );
  },
};
