import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; type: string }> }
) {
  const { id, type } = await params;

  if (type !== "docx") {
    return NextResponse.json(
      { error: "Only docx downloads are available" },
      { status: 400 }
    );
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // No explicit owner-vs-admin branch here on purpose: the RLS policies on
  // `documents` already scope this select to rows the caller may see, so an
  // owner and an admin both get a row and everyone else gets nothing. The
  // lookup IS the authorization check.
  //
  // It also anchors the filesystem read below. `id` only reaches path.join()
  // after matching a uuid primary key, so it cannot smuggle in traversal.
  const { data: document } = await supabase
    .from("documents")
    .select("id")
    .eq("id", id)
    .maybeSingle();

  // 404 rather than 403 for the forbidden case: telling a stranger that a
  // document exists but isn't theirs leaks that it exists at all.
  if (!document) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const filePath = path.join(process.cwd(), "output", `${document.id}.docx`);

  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const fileBuffer = fs.readFileSync(filePath);

  return new NextResponse(new Uint8Array(fileBuffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="Financial-Life-Plan.docx"`,
    },
  });
}
