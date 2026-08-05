import { NextRequest, NextResponse } from "next/server";
import { generateIflpBuffer } from "@/lib/docx-service";
import { buildIflpDocPayload, type IflpFormState } from "@/lib/iflp-form";
import { savePlan, updatePlan } from "@/lib/iflp-persist";
import { loadAdvisorInfo } from "@/lib/profiles";
import { createClient } from "@/lib/supabase/server";

/**
 * Persist an IFLP submission to the plans tables, then generate the document
 * and stream it back for download. This is the wizard's final-step action:
 * one click saves the whole form and hands back the .docx. The plan's id is
 * returned in the `X-Plan-Id` response header.
 *
 * With `?planId=<uuid>` the submission updates that existing plan in place
 * (the Edit flow); without it, a new plan is created.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let state: IflpFormState;
  try {
    state = (await request.json()) as IflpFormState;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  // A document needs at least one client — Client 1 must have a name.
  const hasClient = Boolean(
    state?.client1?.firstName?.trim() || state?.client1?.lastName?.trim()
  );
  if (!hasClient) {
    return NextResponse.json(
      { error: "Add Client 1’s name before generating the document." },
      { status: 400 }
    );
  }

  // Target independence age is mandatory.
  if (state?.targetIndependenceAge == null) {
    return NextResponse.json(
      { error: "Add the target independence age before generating the document." },
      { status: 400 }
    );
  }

  // Persist first: a failure here means the data wasn't saved, so we surface it
  // rather than silently handing back a document the user thinks was stored.
  const editingPlanId = request.nextUrl.searchParams.get("planId");
  let planId: string;
  try {
    ({ id: planId } = editingPlanId
      ? await updatePlan(supabase, state, editingPlanId)
      : await savePlan(supabase, state));
  } catch (error) {
    console.error("IFLP save failed:", error);
    return NextResponse.json(
      { error: "Failed to save the plan. Please try again." },
      { status: 500 }
    );
  }

  // The document's planner block is stamped with whoever generated it.
  const advisor = await loadAdvisorInfo(supabase, user.id);

  let buffer: Buffer;
  try {
    buffer = generateIflpBuffer(buildIflpDocPayload(state, advisor));
  } catch (error) {
    console.error("IFLP generation failed:", error);
    return NextResponse.json(
      { error: "Failed to generate document" },
      { status: 500 }
    );
  }

  const lastName = state?.client1?.lastName?.trim() || "draft";
  const filename = `IFLP-${lastName}.docx`;

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
