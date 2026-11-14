import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  decodeJwtPayload,
  getEffectiveRole,
  isOperatorSession,
  resolveHomeRoute,
} from "@/services/auth";

// Routes that don't require authentication
const publicRoutes = ["/", "/mobile/carteira"];

function redirectWithClearedCookie(url: URL) {
  const response = NextResponse.redirect(url);
  response.cookies.delete("access_token");
  return response;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Next.js serves static files and _next folder. We shouldn't intercept those.
  if (
    pathname.startsWith("/_next") ||
    pathname.includes("/favicon.ico") ||
    pathname.startsWith("/api") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // The backend (FastAPI) sets an HttpOnly cookie named "access_token" on login.
  const token = request.cookies.get("access_token")?.value;
  const isPublicRoute = publicRoutes.includes(pathname);

  if (!token) {
    if (!isPublicRoute) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  const payload = decodeJwtPayload(token);
  const homeRoute = payload
    ? resolveHomeRoute(payload.account_type, getEffectiveRole(payload))
    : null;

  if (!payload || !homeRoute) {
    if (!isPublicRoute) {
      return redirectWithClearedCookie(new URL("/", request.url));
    }
    const response = NextResponse.next();
    response.cookies.delete("access_token");
    return response;
  }

  // If already authenticated and trying to access the login page → redirect to role home
  if (pathname === "/") {
    return NextResponse.redirect(new URL(homeRoute, request.url));
  }

  const role = getEffectiveRole(payload)?.toUpperCase();
  const isOperator = isOperatorSession(payload);

  if (pathname.startsWith("/admin") && !(isOperator && role === "ADMIN")) {
    return NextResponse.redirect(new URL(homeRoute, request.url));
  }

  if (pathname.startsWith("/mobile/leitor") && !isOperator) {
    return NextResponse.redirect(new URL(homeRoute, request.url));
  }

  if (
    pathname.startsWith("/mobile/aluno") &&
    payload.account_type !== "pessoa"
  ) {
    return NextResponse.redirect(new URL(homeRoute, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
