import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile, UserRole } from "@/lib/types";

/**
 * Reads the signed-in user's profile, or null if nobody is signed in.
 *
 * The role lives in the database rather than the JWT, so it is always current:
 * demote an admin and the next request sees it, with no waiting for a token
 * refresh. The cost is one query per call — cheap, and it keeps the database
 * the single source of truth that RLS also enforces.
 */
export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, role, created_at")
    .eq("id", user.id)
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    email: data.email,
    role: data.role as UserRole,
    createdAt: data.created_at,
  };
}

export async function isAdmin(): Promise<boolean> {
  const profile = await getProfile();
  return profile?.role === "admin";
}

/**
 * Gate for admin-only Server Components, Route Handlers, and Server Actions.
 * Returns the profile so callers can use it without a second lookup.
 *
 * The proxy already keeps non-admins out of /admin, but that is a redirect for
 * the user's benefit, not a security boundary — middleware is easy to bypass
 * on direct API calls, and it is the wrong place to trust for authorization.
 * Every privileged entry point calls this for itself, and RLS backstops both.
 */
export async function requireAdmin(): Promise<Profile> {
  const profile = await getProfile();

  if (!profile) redirect("/login");
  if (profile.role !== "admin") redirect("/");

  return profile;
}
