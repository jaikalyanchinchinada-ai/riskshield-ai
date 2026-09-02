// ============================================================================
// RiskShield AI — Route Protection Middleware
// ----------------------------------------------------------------------------
// Runs before every request. If there's no valid session cookie and the
// request isn't for a public page (landing, login, signup) or the auth API
// itself, we redirect to /login (for pages) or return 401 (for API calls).
//
// This runs on Next.js's Edge Runtime, which is why lib/auth/session.ts uses
// `jose` instead of the more common `jsonwebtoken` package — jose works on
// the Edge Runtime, jsonwebtoken does not.
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/session";

const PUBLIC_PAGES = ["/", "/login", "/signup"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublicPage = PUBLIC_PAGES.includes(pathname);
  const isAuthApi = pathname.startsWith("/api/auth");

  if (isPublicPage || isAuthApi) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = await verifySessionToken(token);

  if (!session) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Not authenticated. Please log in." }, { status: 401 });
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg).*)"],
};
