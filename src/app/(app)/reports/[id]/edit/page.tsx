import { notFound, redirect } from "next/navigation";
import { IflpWizard } from "@/components/IflpWizard";
import { getProfile } from "@/lib/auth";
import { loadPlanState } from "@/lib/iflp-load";
import { createClient } from "@/lib/supabase/server";

/**
 * Edit a saved plan: load its rows back into the wizard. The same RLS-scoped
 * loader the regenerate route uses returns null for a plan the viewer can't
 * see, which becomes a 404. Saving from here updates the plan in place (the
 * wizard posts with ?planId).
 */
export default async function EditReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const profile = await getProfile();
  if (!profile) redirect("/login");

  const supabase = await createClient();
  const state = await loadPlanState(supabase, id);
  if (!state) notFound();

  return <IflpWizard initialState={state} planId={id} />;
}
