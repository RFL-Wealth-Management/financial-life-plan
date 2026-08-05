import { NextRequest, NextResponse } from "next/server";
import { generateIflpBuffer } from "@/lib/docx-service";
import { buildIflpDocPayload } from "@/lib/iflp-form";
import { loadPlanState } from "@/lib/iflp-load";
import { createClient } from "@/lib/supabase/server";

/**
 * Regenerate a saved plan's IFLP document and stream it back for download.
 *
 * Stateless: the .docx is rebuilt on the fly from the persisted rows, so there
 * is no file on disk to serve. loadPlanState() runs under the caller's session,
 * so RLS decides visibility — an unreadable/absent plan comes back null -> 404
 * (which also avoids confirming a plan exists to someone who can't see it).
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const state = await loadPlanState(supabase, id);
  if (!state) {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  }

  let buffer: Buffer;
  try {
    buffer = generateIflpBuffer(buildIflpDocPayload(state));
  } catch (error) {
    console.error("IFLP regeneration failed:", error);
    return NextResponse.json(
      { error: "Failed to generate document" },
      { status: 500 }
    );
  }

  const lastName = state.client1.lastName.trim() || "draft";
  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="IFLP-${lastName}.docx"`,
    },
  });
}
