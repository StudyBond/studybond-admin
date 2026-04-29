type ApiErrorKind =
  | "network"
  | "auth"
  | "permission"
  | "validation"
  | "not_found"
  | "rate_limit"
  | "server"
  | "request";

type ApiErrorOptions = {
  message: string;
  status: number;
  payload?: unknown;
  code?: string;
  hint?: string;
  details?: unknown;
  requestId?: string;
  correlationId?: string;
  timestamp?: string;
  technicalMessage?: string;
  kind?: ApiErrorKind;
};

type ErrorEnvelope = {
  success?: boolean;
  message?: string;
  error?: {
    message?: string;
    statusCode?: number;
    code?: string;
    hint?: string;
    details?: unknown;
  };
  requestId?: string;
  correlationId?: string;
  timestamp?: string;
};

const KIND_PREFIX: Record<ApiErrorKind, string> = {
  network: "Network issue",
  auth: "Session issue",
  permission: "Permission issue",
  validation: "Input issue",
  not_found: "Missing resource",
  rate_limit: "Rate limit",
  server: "System issue",
  request: "Request issue",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function firstString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return undefined;
}

function inferApiErrorKind(status: number, code?: string): ApiErrorKind {
  if (status <= 0 || code === "NETWORK_ERROR" || code === "REQUEST_ABORTED") {
    return "network";
  }

  if (status === 401) {
    return "auth";
  }

  if (status === 403) {
    return "permission";
  }

  if (status === 404) {
    return "not_found";
  }

  if (status === 429) {
    return "rate_limit";
  }

  if (status >= 500) {
    return "server";
  }

  if (status === 400 || code === "VALIDATION_ERROR") {
    return "validation";
  }

  return "request";
}

function fallbackMessageForStatus(status: number) {
  if (status <= 0) {
    return "We could not reach the admin server.";
  }

  if (status === 400) {
    return "Some input fields are invalid.";
  }

  if (status === 401) {
    return "Your admin session is invalid or has expired.";
  }

  if (status === 403) {
    return "You do not have permission to perform this action.";
  }

  if (status === 404) {
    return "The requested resource could not be found.";
  }

  if (status === 429) {
    return "Too many requests were sent too quickly.";
  }

  if (status >= 500) {
    return "The backend encountered an internal error.";
  }

  return "The request could not be completed.";
}

function fallbackHintForKind(kind: ApiErrorKind) {
  switch (kind) {
    case "network":
      return "Check your internet connection or confirm the backend is running.";
    case "auth":
      return "Sign in again and retry the action.";
    case "permission":
      return "Use an account with the required admin privileges or complete step-up verification if needed.";
    case "validation":
      return "Review the form input and try again.";
    case "not_found":
      return "The item may have been deleted, moved, or never existed.";
    case "rate_limit":
      return "Wait briefly, then retry.";
    case "server":
      return "This looks like a system problem. If it keeps happening, contact support.";
    default:
      return undefined;
  }
}

function buildLeadMessage(kind: ApiErrorKind, message: string) {
  const prefix = KIND_PREFIX[kind];
  return `${prefix}: ${message}`;
}

function buildDisplayMessage(kind: ApiErrorKind, message: string, hint?: string) {
  const base = buildLeadMessage(kind, message);
  return hint ? `${base} ${hint}` : base;
}

function extractEnvelope(payload: unknown): ErrorEnvelope | undefined {
  if (!isRecord(payload)) {
    return undefined;
  }

  return payload as ErrorEnvelope;
}

export class ApiError extends Error {
  public readonly status: number;
  public readonly payload?: unknown;
  public readonly code: string;
  public readonly hint?: string;
  public readonly details?: unknown;
  public readonly requestId?: string;
  public readonly correlationId?: string;
  public readonly timestamp?: string;
  public readonly technicalMessage?: string;
  public readonly kind: ApiErrorKind;
  public readonly userMessage: string;

  constructor(options: ApiErrorOptions) {
    const kind = options.kind ?? inferApiErrorKind(options.status, options.code);
    const hint = options.hint ?? fallbackHintForKind(kind);
    const userMessage = options.message || fallbackMessageForStatus(options.status);

    super(buildDisplayMessage(kind, userMessage, hint));
    this.name = "ApiError";
    this.status = options.status;
    this.payload = options.payload;
    this.code = options.code ?? "REQUEST_FAILED";
    this.hint = hint;
    this.details = options.details;
    this.requestId = options.requestId;
    this.correlationId = options.correlationId;
    this.timestamp = options.timestamp;
    this.technicalMessage = options.technicalMessage;
    this.kind = kind;
    this.userMessage = userMessage;
  }
}

export function createApiErrorFromResponse(status: number, payload?: unknown) {
  const envelope = extractEnvelope(payload);
  const nested = envelope?.error && isRecord(envelope.error) ? envelope.error : undefined;
  const code = firstString(nested?.code, undefined) ?? "REQUEST_FAILED";
  const kind = inferApiErrorKind(status, code);
  const message =
    firstString(nested?.message, envelope?.message) ?? fallbackMessageForStatus(status);
  const hint = firstString(nested?.hint) ?? fallbackHintForKind(kind);
  const details = nested?.details;

  return new ApiError({
    message,
    status,
    payload,
    code,
    hint,
    details,
    requestId: firstString(envelope?.requestId),
    correlationId: firstString(envelope?.correlationId),
    timestamp: firstString(envelope?.timestamp),
    kind,
  });
}

export function createApiErrorFromUnknown(error: unknown) {
  if (error instanceof ApiError) {
    return error;
  }

  if (error instanceof DOMException && error.name === "AbortError") {
    return new ApiError({
      message: "The request was interrupted before it completed.",
      status: 0,
      code: "REQUEST_ABORTED",
      hint: "Retry the action. If this keeps happening, check for browser extensions or unstable connectivity.",
      technicalMessage: error.message,
      kind: "network",
    });
  }

  if (error instanceof TypeError) {
    return new ApiError({
      message: "We could not reach the admin server.",
      status: 0,
      code: "NETWORK_ERROR",
      hint: "Check your internet connection or confirm the backend is running.",
      technicalMessage: error.message,
      kind: "network",
    });
  }

  if (error instanceof Error) {
    return new ApiError({
      message: error.message || "The request could not be completed.",
      status: 0,
      code: "UNKNOWN_CLIENT_ERROR",
      technicalMessage: error.message,
      kind: "request",
    });
  }

  return new ApiError({
    message: "The request could not be completed.",
    status: 0,
    code: "UNKNOWN_CLIENT_ERROR",
    kind: "request",
  });
}

export function getErrorMessage(error: unknown, fallback = "Something went wrong.") {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
}

export function getErrorLeadMessage(error: unknown, fallback = "Something went wrong.") {
  if (error instanceof ApiError) {
    return buildLeadMessage(error.kind, error.userMessage);
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
}

export function shouldShowSignInLink(error: unknown) {
  return error instanceof ApiError && error.kind === "auth";
}

export function getErrorMeta(error: unknown) {
  if (!(error instanceof ApiError)) {
    return null;
  }

  const parts = [
    error.code ? `code: ${error.code}` : null,
    error.requestId ? `request: ${error.requestId}` : null,
    error.correlationId ? `correlation: ${error.correlationId}` : null,
  ].filter(Boolean);

  return parts.length ? parts.join(" · ") : null;
}
