import type { SupabaseClient } from "@supabase/supabase-js";
import type { AdvisorInfo } from "@/lib/iflp-form";

/**
 * owner_id -> email, for labelling reports with who generated them.
 *
 * A plain record rather than a Map so it can be handed straight to a Client
 * Component. Returns only what RLS allows the caller to read, which in practice
 * means admins get everyone and everyone else gets themselves.
 */
export async function createEmailLookup(
  supabase: SupabaseClient
): Promise<Record<string, string>> {
  const { data } = await supabase.from("profiles").select("id, email");

  return Object.fromEntries((data ?? []).map((row) => [row.id, row.email]));
}

/**
 * The contact fields for one user, for the document's final-page planner block.
 *
 * Read under the caller's own session, so RLS applies: a user can always read
 * their OWN profile row (profiles_select_own), which is exactly this case since
 * the document is stamped with whoever is generating it. Missing row/fields come
 * back as nulls and render as empty lines rather than failing the download.
 */
export async function loadAdvisorInfo(
  supabase: SupabaseClient,
  userId: string
): Promise<AdvisorInfo> {
  const { data } = await supabase
    .from("profiles")
    .select("name, position, phone, email")
    .eq("id", userId)
    .single();

  return {
    name: data?.name ?? null,
    position: data?.position ?? null,
    phone: data?.phone ?? null,
    email: data?.email ?? null,
  };
}
