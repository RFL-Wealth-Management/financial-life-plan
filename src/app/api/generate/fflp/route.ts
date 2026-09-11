import { NextRequest, NextResponse } from "next/server";
import { generateFflpBuffer } from "@/lib/docx-service";
import { buildFflpDocPayload, type FflpFormState } from "@/lib/fflp-form";
import { saveFflp } from "@/lib/fflp-persist";
import { loadPlanState } from "@/lib/iflp-load";
import { loadAdvisorInfo } from "@/lib/profiles";
import { createClient } from "@/lib/supabase/server";

/**
 * Persist the FFLP extras for a plan, then generate the FFLP document and stream
 * it back for download. This is the FFLP wizard's final-step action.
 *
 * The FFLP always extends an existing plan, so `?planId=<uuid>` is required. The
 * base IFLP state is loaded to build the shared parts of the document (client
 * names, dates, buckets); the posted body carries only the FFLP-only fields.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const planId = request.nextUrl.searchParams.get("planId");
  if (!planId) {
    return NextResponse.json(
      { error: "Missing planId — an FFLP extends an existing plan." },
      { status: 400 }
    );
  }

  let fflpState: FflpFormState;
  try {
    fflpState = (await request.json()) as FflpFormState;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  // The base plan must exist and be visible to the caller (RLS). This is also
  // what supplies the shared document content.
  const base = await loadPlanState(supabase, planId);
  if (!base) {
    return NextResponse.json(
      { error: "Plan not found or not permitted." },
      { status: 404 }
    );
  }

  // Persist first: a failure here means the FFLP data wasn't saved, so we surface
  // it rather than handing back a document the user thinks was stored.
  try {
    await saveFflp(supabase, fflpState, planId);
  } catch (error) {
    console.error("FFLP save failed:", error);
    return NextResponse.json(
      { error: "Failed to save the FFLP. Please try again." },
      { status: 500 }
    );
  }

  // The document's planner block is stamped with whoever generated it.
  const advisor = await loadAdvisorInfo(supabase, user.id);

  let buffer: Buffer;
  try {
    buffer = generateFflpBuffer(buildFflpDocPayload(base, fflpState, advisor));
  } catch (error) {
    console.error("FFLP generation failed:", error);
    return NextResponse.json(
      { error: "Failed to generate document" },
      { status: 500 }
    );
  }

  const lastName = base.client1.lastName.trim() || "draft";
  const filename = `FFLP-${lastName}.docx`;

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "X-Plan-Id": planId,
    },
  });
}
