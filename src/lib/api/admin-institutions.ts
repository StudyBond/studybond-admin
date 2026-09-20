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

/**
 * Whether students can see and pick a board.
 *
 * HIDDEN still accepts questions from the content team, so a new exam can be
 * built in full before anyone can find it.
 */
export type AdminInstitutionStudentStatus = "HIDDEN" | "COMING_SOON" | "OPEN";

export type AdminUpdateInstitutionInput = {
  name?: string;
  studentStatus?: AdminInstitutionStudentStatus;
};

/**
 * Declared here rather than in lib/api/types.ts because another session is
 * editing that file. It moves there once the generated contract is resynced.
 */
export type AdminInstitutionMutationResponse = {
  success: boolean;
  message: string;
  institution: {
    id: number;
    code: string;
    name: string;
    slug: string;
    isActive: boolean;
    studentStatus: AdminInstitutionStudentStatus;
    createdAt: string;
  };
  warnings: string[];
};

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

  update(
    institutionId: number,
    payload: AdminUpdateInstitutionInput,
    headers?: SensitiveHeadersOptions,
  ) {
    return apiClient<AdminInstitutionMutationResponse>(
      `/api/admin/institutions/${institutionId}`,
      {
        method: "PATCH",
        body: JSON.stringify(payload),
        headers: buildSensitiveHeaders(headers),
      },
    );
  },

  updateExamConfig(
    institutionId: number,
    /* trackName is not in the generated contract yet, and another session is
       mid-edit on that file, so it is widened here instead. */
    payload: AdminInstitutionExamConfigInput & {
      trackName?: string;
      trackCode?: string;
    },
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
