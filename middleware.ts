import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME, verifySessionToken } from "@/lib/auth";

/**
 * Middleware runs on every matched request BEFORE the page/API loads.
 * If no valid session cookie → redirect to /login.
 *
 * This is the single enforcement point. When upgrading to OAuth,
 * only this file and lib/auth.ts need to change.
 */
export async function middleware(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;

  if (!token || !(await verifySessionToken(token))) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

/**
 * Match everything EXCEPT:
 * - /login (the login page itself)
 * - /api/auth (login/logout endpoints)
 * - /_next (Next.js internals, static assets)
 * - /favicon.ico
 */
export const config = {
  matcher: [
    "/((?!login|api/auth|_next|favicon\\.ico).*)",
  ],
};
