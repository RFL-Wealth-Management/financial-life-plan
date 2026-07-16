import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { generateDocx } from "@/lib/docx-service";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const { client1FirstName, client1LastName, client2FirstName, client2LastName } = body;

  if (!client1FirstName?.trim() || !client1LastName?.trim()) {
    return NextResponse.json(
      { error: "Client 1 first and last name are required" },
      { status: 400 }
    );
  }

  const id = randomUUID();
  const client1Name = `${client1FirstName.trim()} ${client1LastName.trim()}`;
  const client2Name =
    client2FirstName?.trim() && client2LastName?.trim()
      ? `${client2FirstName.trim()} ${client2LastName.trim()}`
      : null;

  try {
    generateDocx(
      {
        client1FirstName: client1FirstName.trim(),
        client1LastName: client1LastName.trim(),
        client2FirstName: client2FirstName?.trim() || undefined,
        client2LastName: client2LastName?.trim() || undefined,
      },
      id
    );
  } catch (error) {
    console.error("Document generation failed:", error);
    return NextResponse.json(
      { error: "Failed to generate document" },
      { status: 500 }
    );
  }

  // Claim the file before returning the id. If this insert fails the file
  // exists on disk with no owner row, which the download route treats as
  // inaccessible — a plan nobody can reach beats a plan anybody can reach.
  const { error: insertError } = await supabase.from("documents").insert({
    id,
    owner_id: user.id,
    client1_name: client1Name,
    client2_name: client2Name,
  });

  if (insertError) {
    console.error("Failed to record document ownership:", insertError);
    return NextResponse.json(
      { error: "Failed to generate document" },
      { status: 500 }
    );
  }

  return NextResponse.json({ id });
}
