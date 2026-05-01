import type { paths } from "./generated/openapi-types";

type Operation<
  Path extends keyof paths,
  Method extends keyof paths[Path],
> = NonNullable<paths[Path][Method]>;

type JsonResponse<
  Path extends keyof paths,
  Method extends keyof paths[Path],
  Status extends number,
> = Operation<Path, Method> extends { responses: Record<Status, infer Response> }
  ? Response extends { content: { "application/json": infer Body } }
    ? Body
    : never
  : never;

type JsonRequestBody<
  Path extends keyof paths,
  Method extends keyof paths[Path],
> = Operation<Path, Method> extends {
  requestBody: { content: { "application/json": infer Body } };
}
  ? Body
  : never;

type QueryParams<
  Path extends keyof paths,
  Method extends keyof paths[Path],
> = Operation<Path, Method> extends { parameters: { query?: infer Params } }
  ? NonNullable<Params>
  : never;

type PathParams<
  Path extends keyof paths,
  Method extends keyof paths[Path],
> = Operation<Path, Method> extends { parameters: { path: infer Params } }
  ? Params
  : never;

type EnvelopeData<T> = T extends { data: infer Data } ? Data : never;
type WithContract<T, Additional> = T & Additional;

export type AuthLoginInput = JsonRequestBody<"/api/auth/login", "post">;
export type AuthVerifyOtpInput = JsonRequestBody<"/api/auth/verify-otp", "post">;
type RawAuthLoginResponse = JsonResponse<"/api/auth/login", "post", 200>;
type RawAuthVerifyOtpResponse = JsonResponse<"/api/auth/verify-otp", "post", 200>;
type RawAuthSuccessPayload = Extract<RawAuthLoginResponse, { requiresOTP: false }>;
type RawAuthVerifyOtpSuccessPayload = Extract<
  RawAuthVerifyOtpResponse,
  { requiresOTP: false }
>;
type RawAuthMeResponse = JsonResponse<"/api/auth/me", "get", 200>;

export type AuthUser = WithContract<
  RawAuthSuccessPayload["user"],
  {
    id: number;
    email: string;
    fullName: string;
    isPremium: boolean;
    role: "USER" | "ADMIN" | "SUPERADMIN" | string;
  }
>;
export type AuthSuccessPayload = WithContract<
  RawAuthSuccessPayload,
  { user: AuthUser }
>;
export type AuthOtpChallengePayload = Extract<
  RawAuthLoginResponse,
  { requiresOTP: true }
>;
export type AuthLoginResponse = AuthSuccessPayload | AuthOtpChallengePayload;
export type AuthVerifyOtpResponse =
  | WithContract<RawAuthVerifyOtpSuccessPayload, { user: AuthUser }>
  | {
      message: string;
      requiresOTP?: never;
      user?: never;
    };
export type AuthMeResponse = WithContract<RawAuthMeResponse, { user: AuthUser }>;

export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type AdminOverviewResponse = JsonResponse<
  "/api/admin/analytics/overview",
  "get",
  200
>;
export type AdminActivityResponse = JsonResponse<
  "/api/admin/analytics/activity",
  "get",
  200
>;
export type AdminPremiumInsightsResponse = JsonResponse<
  "/api/admin/analytics/premium",
  "get",
  200
>;
export type AdminSystemHealthResponse = JsonResponse<
  "/api/admin/analytics/system-health",
  "get",
  200
>;

export type AdminUserListResponse = JsonResponse<"/api/admin/users", "get", 200>;
export type AdminUser360Response = JsonResponse<"/api/admin/users/{id}/360", "get", 200>;
export type AdminActionResponse = JsonResponse<"/api/admin/users/{id}/ban", "post", 200>;

export type AdminStepUpRequestResponse = JsonResponse<
  "/api/admin/step-up/request",
  "post",
  200
>;
export type AdminStepUpVerifyResponse = JsonResponse<
  "/api/admin/step-up/verify",
  "post",
  200
>;

export type PremiumUserListResponse = JsonResponse<
  "/api/admin/premium-users",
  "get",
  200
>;
export type PremiumHistoryResponse = JsonResponse<
  "/api/admin/users/{id}/premium/history",
  "get",
  200
>;
export type PremiumCoverageState = PremiumHistoryResponse["currentAccess"];
export type PremiumGrantMutationResponse = JsonResponse<
  "/api/admin/users/{id}/premium/grants",
  "post",
  200
>;
export type PremiumRevokeMutationResponse = JsonResponse<
  "/api/admin/users/{id}/premium/revoke",
  "post",
  200
>;

export type AdminSystemSettingsResponse = JsonResponse<
  "/api/admin/system/settings",
  "get",
  200
>;

export type AdminReportsListEnvelope = JsonResponse<
  "/api/admin/reports/",
  "get",
  200
>;
export type AdminReportsListParams = QueryParams<"/api/admin/reports/", "get">;
export type AdminReportEnvelope = JsonResponse<
  "/api/admin/reports/{reportId}",
  "get",
  200
>;
export type AdminReportStatusPayload = JsonRequestBody<
  "/api/admin/reports/{reportId}/status",
  "patch"
>;
export type AdminReportStatusEnvelope = JsonResponse<
  "/api/admin/reports/{reportId}/status",
  "patch",
  200
>;
export type AdminReportHardDeletePayload = JsonRequestBody<
  "/api/admin/reports/{reportId}/hard-delete",
  "delete"
>;
export type AdminReportDeleteEnvelope = JsonResponse<
  "/api/admin/reports/{reportId}/hard-delete",
  "delete",
  200
>;
export type AdminReportsListResponse = EnvelopeData<AdminReportsListEnvelope>;
export type AdminReportListItem = AdminReportsListResponse["reports"][number];
export type AdminReport = EnvelopeData<AdminReportEnvelope>;
export type AdminReportStatusResult = EnvelopeData<AdminReportStatusEnvelope>;
export type AdminReportDeleteResult = EnvelopeData<AdminReportDeleteEnvelope>;

export type AdminAuditLogsResponse = JsonResponse<"/api/admin/audit-logs", "get", 200>;
export type AdminAuditLogEntry = AdminAuditLogsResponse["logs"][number];

type RawQuestionRecord = JsonResponse<"/api/questions/{id}", "get", 200>;
type RawQuestionListResponse = JsonResponse<"/api/questions/", "get", 200>;
type RawQuestionListItem = RawQuestionListResponse["questions"][number];
type RawBulkUploadResponse = JsonResponse<"/api/questions/bulk", "post", 201>;

export type QuestionPayload = WithContract<JsonRequestBody<"/api/questions/", "post">, { year?: number | null; isFeaturedFree?: boolean }>;
export type QuestionRecord = WithContract<RawQuestionRecord, { year?: number | null; isFeaturedFree?: boolean }>;
export type QuestionListItem = WithContract<RawQuestionListItem, { year?: number | null; isFeaturedFree?: boolean }>;
export type QuestionListResponse = RawQuestionListResponse;
export type QuestionListParams = QueryParams<"/api/questions/", "get">;
export type QuestionAssetKind = PathParams<
  "/api/questions/assets/upload/{kind}",
  "post"
>["kind"];
export type QuestionAssetUploadResponse = JsonResponse<
  "/api/questions/assets/upload/{kind}",
  "post",
  201
>;
export type BulkUploadRowError = RawBulkUploadResponse["errors"][number];
export type BulkUploadResponse = RawBulkUploadResponse;

// ── Bulk Upload Batch Tracking ────────────────────────

export type BulkUploadBatch = {
  id: number;
  institutionId: number;
  institutionCode: string;
  uploadedById: number;
  uploaderName: string;
  fileName: string;
  fileHash: string;
  totalRows: number;
  successCount: number;
  errorCount: number;
  questionCount: number;
  status: "COMPLETED" | "FAILED";
  createdAt: string;
};

export type BulkUploadHistoryResponse = {
  batches: BulkUploadBatch[];
  total: number;
};

export type BulkUploadDuplicateCheckResponse = {
  isDuplicate: boolean;
  existingBatch: BulkUploadBatch | null;
};
