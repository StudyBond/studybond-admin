import {
  authorizedBackendRequest,
  clearAdminAuthCookies,
  parseJsonSafely,
  setAdminAuthCookies,
} from "@/lib/server/backend-session";
import { NextRequest, NextResponse } from "next/server";

type RouteContext = {
  params: Promise<unknown>;
};

async function forwardAdminReportRequest(
  request: NextRequest,
  context: RouteContext,
  method: "GET" | "PATCH" | "DELETE",
) {
  const params = (await context.params) as { slug?: string[] };
  const slug = params.slug ?? [];
  const queryString = request.nextUrl.search || "";
  const body = method === "GET" ? undefined : await request.text().then((value) => value || undefined);

  const { response, refreshedTokens } = await authorizedBackendRequest(
    request,
    `/api/admin/reports/${slug.join("/")}${queryString}`,
    {
      method,
      body,
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

export async function GET(request: NextRequest, context: RouteContext) {
  return forwardAdminReportRequest(request, context, "GET");
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  return forwardAdminReportRequest(request, context, "PATCH");
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  return forwardAdminReportRequest(request, context, "DELETE");
}
