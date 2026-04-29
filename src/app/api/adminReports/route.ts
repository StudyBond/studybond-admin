import {
  authorizedBackendRequest,
  clearAdminAuthCookies,
  parseJsonSafely,
  setAdminAuthCookies,
} from "@/lib/server/backend-session";
import { NextRequest, NextResponse } from "next/server";

async function forwardAdminReportsIndex(request: NextRequest) {
  const queryString = request.nextUrl.search || "";
  const { response, refreshedTokens } = await authorizedBackendRequest(
    request,
    `/api/admin/reports${queryString}`,
    {
      method: "GET",
    },
  );

  const payload = await parseJsonSafely(response);
  const nextResponse = NextResponse.json(payload, { status: response.status });

  if (refreshedTokens) {
    setAdminAuthCookies(nextResponse, refreshedTokens);
  }

  if (response.status === 401) {
    clearAdminAuthCookies(nextResponse);
  }

  return nextResponse;
}

export async function GET(request: NextRequest) {
  return forwardAdminReportsIndex(request);
}
