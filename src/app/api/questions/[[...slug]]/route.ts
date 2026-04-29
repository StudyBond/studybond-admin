import {
  authorizedBackendRequest,
  clearAdminAuthCookies,
  parseJsonSafely,
  setAdminAuthCookies,
} from "@/lib/server/backend-session";
import { NextRequest, NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{ slug?: string[] }>;
};

async function readForwardBody(
  request: NextRequest,
  method: "GET" | "POST" | "PUT" | "DELETE",
) {
  if (method === "GET") {
    return undefined;
  }

  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("multipart/form-data")) {
    return request.formData();
  }

  return request.text().then((value) => value || undefined);
}

async function forwardQuestionRequest(
  request: NextRequest,
  context: RouteContext,
  method: "GET" | "POST" | "PUT" | "DELETE",
) {
  const { slug = [] } = await context.params;
  const queryString = request.nextUrl.search || "";
  const body = await readForwardBody(request, method);

  const { response, refreshedTokens } = await authorizedBackendRequest(
    request,
    `/api/questions${slug.length ? `/${slug.join("/")}` : ""}${queryString}`,
    {
      method,
      body,
    },
  );

  if (response.status === 204) {
    const nextResponse = new NextResponse(null, { status: 204 });

    if (refreshedTokens) {
      setAdminAuthCookies(nextResponse, refreshedTokens);
    }

    return nextResponse;
  }

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
  return forwardQuestionRequest(request, context, "GET");
}

export async function POST(request: NextRequest, context: RouteContext) {
  return forwardQuestionRequest(request, context, "POST");
}

export async function PUT(request: NextRequest, context: RouteContext) {
  return forwardQuestionRequest(request, context, "PUT");
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  return forwardQuestionRequest(request, context, "DELETE");
}
