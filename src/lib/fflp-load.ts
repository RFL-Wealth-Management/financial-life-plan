// Reconstruct an FflpFormState from the persisted plan_fflp.data JSONB blob.
// Returns the default (empty) state when no FFLP row exists yet, and merges over
// the defaults so fields added after a plan was saved come back as null rather
// than undefined. RLS scopes the read to plans the caller may see.

import { initialFflpFormState, type FflpFormState } from "@/lib/fflp-form";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function loadFflpState(
  supabase: SupabaseClient,
  planId: string
): Promise<FflpFormState> {
  const { data } = await supabase
    .from("plan_fflp")
    .select("data")
    .eq("plan_id", planId)
    .maybeSingle();

  const stored = (data?.data ?? {}) as Partial<FflpFormState>;
  return { ...initialFflpFormState, ...stored };
}

/**
 * True when the plan already has an FFLP (a plan_fflp row exists). Used by the
 * dashboard to label the entry-point button "Create FFLP" vs "Edit FFLP".
 */
export async function fflpExists(
  supabase: SupabaseClient,
  planId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("plan_fflp")
    .select("plan_id")
    .eq("plan_id", planId)
    .maybeSingle();
  return Boolean(data);
}
