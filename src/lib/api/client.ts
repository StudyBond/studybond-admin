import {
  ApiError,
  createApiErrorFromResponse,
  createApiErrorFromUnknown,
} from "@/lib/api/errors";

function isFormDataBody(body: BodyInit | null | undefined) {
  return typeof FormData !== "undefined" && body instanceof FormData;
}

export async function apiClient<T>(
  input: string,
  init?: RequestInit,
): Promise<T> {
  const headers = new Headers(init?.headers ?? {});

  if (!headers.has("Content-Type") && init?.body && !isFormDataBody(init.body)) {
    headers.set("Content-Type", "application/json");
  }

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    throw createApiErrorFromUnknown(new TypeError("Network is offline"));
  }

  let response: Response;
  try {
    response = await fetch(input, {
      ...init,
      headers,
      credentials: "include",
      cache: "no-store",
    });
  } catch (error) {
    throw createApiErrorFromUnknown(error);
  }

  const payload = await response
    .json()
    .catch(() => undefined);

  if (!response.ok) {
    throw createApiErrorFromResponse(response.status, payload);
  }

  return payload as T;
}

export { ApiError };
