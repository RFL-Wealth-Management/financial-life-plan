import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * Runs on every matched request BEFORE the page/API loads.
 * Delegates to updateSession(), which refreshes the Supabase session
 * cookie and redirects to /login if there's no authenticated user.
 *
 * Must live at src/proxy.ts: Next resolves this convention relative to
 * the app directory's parent, which is src/ in this project.
 */
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

/**
 * Match everything EXCEPT:
 * - /_next (Next.js internals, static assets)
 * - static files (images, fonts, etc.)
 * - /favicon.ico
 *
 * Public routes (login, password recovery) are still matched so the
 * session gets refreshed there too — updateSession() itself decides
 * whether to redirect.
 */
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
