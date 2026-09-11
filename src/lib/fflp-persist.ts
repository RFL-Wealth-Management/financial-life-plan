// Persist the FFLP extras for a plan.
//
// FFLP-only data is stored as a single JSONB blob (plan_fflp.data), so saving is
// just handing the whole FflpFormState to the save_fflp() RPC. It upserts (create
// or edit in one call), runs as the caller so RLS stops writing FFLP data to a
// plan you don't own, and returns the plan id. `supabase` must carry the session.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { FflpFormState } from "@/lib/fflp-form";

export async function saveFflp(
  supabase: SupabaseClient,
  state: FflpFormState,
  planId: string
): Promise<{ id: string }> {
  const { data, error } = await supabase.rpc("save_fflp", {
    p_plan_id: planId,
    payload: state,
  });

  if (error) {
    throw new Error(`Failed to save FFLP: ${error.message}`);
  }

  return { id: data as string };
}
