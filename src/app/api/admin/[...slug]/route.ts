import {
  authorizedBackendRequest,
  clearAdminAuthCookies,
  parseJsonSafely,
  setAdminAuthCookies,
} from "@/lib/server/backend-session";
import { NextRequest, NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{ slug: string[] }>;
};

async function forwardAdminRequest(
  request: NextRequest,
  context: RouteContext,
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
) {
  const { slug } = await context.params;
  const queryString = request.nextUrl.search || "";
  const body =
    method === "GET" ? undefined : await request.text().then((value) => value || undefined);

  const { response, refreshedTokens } = await authorizedBackendRequest(
    request,
    `/api/admin/${slug.join("/")}${queryString}`,
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
  return forwardAdminRequest(request, context, "GET");
}

export async function POST(request: NextRequest, context: RouteContext) {
  return forwardAdminRequest(request, context, "POST");
}

export async function PUT(request: NextRequest, context: RouteContext) {
  return forwardAdminRequest(request, context, "PUT");
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  return forwardAdminRequest(request, context, "PATCH");
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  return forwardAdminRequest(request, context, "DELETE");
}
