import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase client authenticated with the SERVICE-ROLE key.
 *
 * This key bypasses Row Level Security and can reach the Auth Admin API
 * (create users, change login emails, etc.). It must never reach the browser.
 * It is read from a non-`NEXT_PUBLIC_` env var, so Next never inlines it into a
 * client bundle, and this module is imported only by Server Actions. The guard
 * below is a belt-and-suspenders trip-wire if that ever changes.
 *
 * Use this ONLY inside Server Actions / Route Handlers, and only after the
 * caller has already been authorized (e.g. requireAdmin()) — the service role
 * does no authorization of its own.
 */
export function createAdminClient() {
  if (typeof window !== "undefined") {
    throw new Error("createAdminClient() must never run in the browser.");
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Admin actions need SUPABASE_SERVICE_ROLE_KEY set in the environment. " +
        "Copy it from Supabase → Project Settings → API → service_role."
    );
  }

  return createSupabaseClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
