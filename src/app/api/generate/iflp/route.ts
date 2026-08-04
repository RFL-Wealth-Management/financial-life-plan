import { NextRequest, NextResponse } from "next/server";
import { generateIflpBuffer } from "@/lib/docx-service";
import { buildIflpDocPayload, type IflpFormState } from "@/lib/iflp-form";
import { createClient } from "@/lib/supabase/server";

/**
 * Generate an IFLP document from the current wizard state and stream it back
 * for download. No persistence and no documents row — this is the "generate at
 * any time to check placement" flow; saving to the plans tables comes later.
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

  let buffer: Buffer;
  try {
    buffer = generateIflpBuffer(buildIflpDocPayload(state));
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
    },
  });
}
