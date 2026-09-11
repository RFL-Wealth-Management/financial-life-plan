import { notFound, redirect } from "next/navigation";
import { FflpWizard } from "@/components/FflpWizard";
import { getProfile } from "@/lib/auth";
import { loadPlanState } from "@/lib/iflp-load";
import { loadFflpState } from "@/lib/fflp-load";
import { createClient } from "@/lib/supabase/server";

/**
 * The FFLP form for a plan. The FFLP extends a saved IFLP, so this always loads
 * an existing plan: the base IFLP state (to 404 a plan the viewer can't see, and
 * to name the download) plus any FFLP extras already saved (blank the first
 * time). Saving upserts the FFLP via /api/generate/fflp?planId=<id>.
 */
export default async function FflpReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const profile = await getProfile();
  if (!profile) redirect("/login");

  const supabase = await createClient();
  const base = await loadPlanState(supabase, id);
  if (!base) notFound();

  const fflp = await loadFflpState(supabase, id);

  return (
    <FflpWizard
      planId={id}
      initialState={fflp}
      clientLastName={base.client1.lastName}
    />
  );
}
