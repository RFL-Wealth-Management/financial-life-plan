import type { SupabaseClient } from "@supabase/supabase-js";

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
