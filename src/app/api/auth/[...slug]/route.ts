import {
  clearAdminAuthCookies,
  parseJsonSafely,
  refreshAdminSession,
  setAdminAuthCookies,
} from "@/lib/server/backend-session";
import { getBackendApiBaseUrl } from "@/lib/env/server";
import { ADMIN_ACCESS_COOKIE, ADMIN_REFRESH_COOKIE } from "@/lib/auth/cookies";
import { NextRequest, NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{ slug: string[] }>;
};

function buildBackendAuthUrl(slug: string[], queryString: string) {
  const base = getBackendApiBaseUrl();
  const path = slug.join("/");
  return `${base}/api/auth/${path}${queryString}`;
}

function sanitizeAuthPayload(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return payload;
  }

  const clone = { ...(payload as Record<string, unknown>) };
  delete clone.accessToken;
  delete clone.refreshToken;
  return clone;
}

async function forwardAuthRequest(
  request: NextRequest,
  context: RouteContext,
  method: "GET" | "POST",
) {
  const { slug } = await context.params;
  const queryString = request.nextUrl.search || "";
  const path = slug.join("/");
  const backendUrl = buildBackendAuthUrl(slug, queryString);
  const body =
    method === "POST" ? await request.text().then((value) => value || undefined) : undefined;

  const headers = new Headers();
  if (body) {
    headers.set("Content-Type", "application/json");
  }

  const accessToken = request.cookies.get(ADMIN_ACCESS_COOKIE)?.value;
  const refreshToken = request.cookies.get(ADMIN_REFRESH_COOKIE)?.value;

  const perform = async (token?: string, refreshBody?: string) => {
    const nextHeaders = new Headers(headers);

    if (token && (path === "me" || path === "logout")) {
      nextHeaders.set("Authorization", `Bearer ${token}`);
    }

    return fetch(path === "refresh" ? `${getBackendApiBaseUrl()}/api/auth/refresh` : backendUrl, {
      method,
      headers: nextHeaders,
      body: path === "refresh" ? refreshBody : body,
      cache: "no-store",
    });
  };

  let response: Response;

  if (path === "refresh") {
    const refreshPayload =
      body ||
      (refreshToken ? JSON.stringify({ refreshToken }) : undefined);

    if (!refreshPayload) {
      const unauthorized = NextResponse.json(
        { message: "No refresh token available." },
        { status: 401 },
      );
      clearAdminAuthCookies(unauthorized);
      return unauthorized;
    }

    response = await perform(undefined, refreshPayload);
  } else {
    response = await perform(accessToken);
  }

  if (path === "me" && response.status === 401 && refreshToken) {
    const refreshedTokens = await refreshAdminSession(refreshToken);
    if (!refreshedTokens) {
      const unauthorized = NextResponse.json(
        { message: "Session expired." },
        { status: 401 },
      );
      clearAdminAuthCookies(unauthorized);
      return unauthorized;
    }

    response = await fetch(backendUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${refreshedTokens.accessToken}`,
      },
      cache: "no-store",
    });

    const payload = await parseJsonSafely(response);
    const nextResponse = NextResponse.json(payload, { status: response.status });
    setAdminAuthCookies(nextResponse, refreshedTokens);
    return nextResponse;
  }

  const payload = await parseJsonSafely(response);
  const sanitizedPayload = sanitizeAuthPayload(payload);
  const nextResponse = NextResponse.json(sanitizedPayload, { status: response.status });

  if (
    response.ok &&
    payload &&
    typeof payload === "object" &&
    "accessToken" in payload &&
    "refreshToken" in payload
  ) {
    setAdminAuthCookies(nextResponse, {
      accessToken: String((payload as Record<string, unknown>).accessToken),
      refreshToken: String((payload as Record<string, unknown>).refreshToken),
    });
  }

  if (path === "logout") {
    clearAdminAuthCookies(nextResponse);
  }

  if (!response.ok && (response.status === 401 || response.status === 403)) {
    if (path === "me" || path === "refresh" || path === "logout") {
      clearAdminAuthCookies(nextResponse);
    }
  }

  return nextResponse;
}

export async function GET(request: NextRequest, context: RouteContext) {
  return forwardAuthRequest(request, context, "GET");
}

export async function POST(request: NextRequest, context: RouteContext) {
  return forwardAuthRequest(request, context, "POST");
}
