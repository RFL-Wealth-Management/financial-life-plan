import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { generateDocx } from "@/lib/docx-service";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { client1FirstName, client1LastName, client2FirstName, client2LastName } = body;

  if (!client1FirstName?.trim() || !client1LastName?.trim()) {
    return NextResponse.json(
      { error: "Client 1 first and last name are required" },
      { status: 400 }
    );
  }

  const id = randomUUID();

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
    return NextResponse.json({ id });
  } catch (error) {
    console.error("Document generation failed:", error);
    return NextResponse.json(
      { error: "Failed to generate document" },
      { status: 500 }
    );
  }
}
