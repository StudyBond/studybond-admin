import { apiClient, ApiError } from "@/lib/api/client";
import type {
  BulkUploadResponse,
  QuestionAssetKind,
  QuestionAssetUploadResponse,
  QuestionListParams,
  QuestionListResponse,
  QuestionPayload,
  QuestionRecord,
} from "@/lib/api/types";

export const questionsApi = {
  list(params?: QuestionListParams) {
    const search = new URLSearchParams();

    if (params?.institutionCode) search.set("institutionCode", params.institutionCode);
    if (params?.subject) search.set("subject", params.subject);
    if (params?.topic) search.set("topic", params.topic);
    if (params?.questionType) search.set("questionType", params.questionType);
    if (params?.questionPool) search.set("questionPool", params.questionPool);
    if (params?.search) search.set("search", params.search);
    if (params?.page) search.set("page", String(params.page));
    if (params?.limit) search.set("limit", String(params.limit));
    if (typeof params?.hasImage === "boolean") search.set("hasImage", String(params.hasImage));
    if (typeof params?.isAiGenerated === "boolean") {
      search.set("isAiGenerated", String(params.isAiGenerated));
    }

    const suffix = search.toString() ? `?${search.toString()}` : "";
    return apiClient<QuestionListResponse>(`/api/questions${suffix}`);
  },
  getById(questionId: number) {
    return apiClient<QuestionRecord>(`/api/questions/${questionId}`);
  },
  create(payload: QuestionPayload) {
    return apiClient<QuestionRecord>("/api/questions", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  update(questionId: number, payload: Partial<QuestionPayload>) {
    return apiClient<QuestionRecord>(`/api/questions/${questionId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },
  delete(questionId: number) {
    return apiClient<void>(`/api/questions/${questionId}`, {
      method: "DELETE",
    });
  },
  uploadAsset(kind: QuestionAssetKind, file: File) {
    const formData = new FormData();
    formData.set("file", file);

    return apiClient<QuestionAssetUploadResponse>(`/api/questions/assets/upload/${kind}`, {
      method: "POST",
      body: formData,
    });
  },
  async bulkUpload(file: File, institutionCode?: string) {
    const formData = new FormData();
    formData.set("file", file);

    const search = new URLSearchParams();
    if (institutionCode?.trim()) {
      search.set("institutionCode", institutionCode.trim());
    }

    const suffix = search.toString() ? `?${search.toString()}` : "";
    try {
      return await apiClient<BulkUploadResponse>(`/api/questions/bulk${suffix}`, {
        method: "POST",
        body: formData,
      });
    } catch (error) {
      if (error instanceof ApiError && error.status === 422 && error.payload) {
        return error.payload as BulkUploadResponse;
      }
      throw error;
    }
  },
};
