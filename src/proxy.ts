import { ADMIN_ACCESS_COOKIE, ADMIN_REFRESH_COOKIE } from "@/lib/auth/cookies";
import { NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasAccessToken = request.cookies.has(ADMIN_ACCESS_COOKIE);
  const hasRefreshToken = request.cookies.has(ADMIN_REFRESH_COOKIE);
  const hasSession = hasAccessToken || hasRefreshToken;
  const isLoginRoute = pathname === "/login" || pathname.startsWith("/login/");
  const isStepUpRoute = pathname === "/step-up" || pathname.startsWith("/step-up/");

  if (isLoginRoute && hasSession) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (isStepUpRoute && !hasSession) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (!isLoginRoute && !isStepUpRoute && !pathname.startsWith("/api") && !hasSession) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
