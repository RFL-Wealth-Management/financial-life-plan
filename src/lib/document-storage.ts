// Persist a delivered plan document into the private 'plan-documents' bucket and
// record it in the append-only plan_documents log.
//
// This is the ONLY place the app writes a document to durable storage; every
// other DOCX/PDF path regenerates on the fly and streams without persisting.
// It runs server-side only (it uses the service-role client to upload).
//
// Flow, and why in this order:
//   1. Build the object key (buildObjectPath — see below; that's your call).
//   2. Upload the bytes with the service-role client. The bucket has no
//      permissive RLS, so only this key can write to it.
//   3. Record the row via the caller's session-scoped client, so RLS enforces
//      that they own the plan (or are admin) and finalized_by = auth.uid().
//
// Upload happens BEFORE the DB insert on purpose: if step 3 fails we leak an
// unreferenced object (harmless, GC-able), whereas the reverse would leave a
// log row pointing at a file that isn't there — a broken audit trail is worse
// than an orphan blob.

import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET = "plan-documents";

export type DocumentFormat = "docx" | "pdf";

const CONTENT_TYPE: Record<DocumentFormat, string> = {
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  pdf: "application/pdf",
};

const EXTENSION: Record<DocumentFormat, string> = {
  docx: "docx",
  pdf: "pdf",
};

/** A recorded delivery, as returned by the record_plan_document() RPC. */
export interface PlanDocumentRow {
  id: string;
  plan_id: string;
  format: DocumentFormat;
  version: number;
  storage_path: string;
  file_size: number | null;
  finalized_by: string;
  created_at: string;
}

export interface StoreDocumentInput {
  planId: string;
  format: DocumentFormat;
  buffer: Buffer;
  /** Client 1's last name, for a human-readable object key. May be empty. */
  clientLastName: string;
}

// ---------------------------------------------------------------------------
// YOUR CONTRIBUTION
//
// buildObjectPath decides how files are laid out inside the bucket. There is no
// single right answer, and the trade-offs are real — this is why it's yours to
// write rather than mine to assume.
//
// Hard requirement:
//   • The key MUST be unique on every call. We keep every version, so the same
//     plan + format gets uploaded repeatedly; a colliding key would silently
//     overwrite a previously delivered file and destroy the audit trail. Reach
//     for a timestamp and/or a random token — NOT the version number, which
//     doesn't exist yet at this point (the DB assigns it in step 3).
//
// Worth considering:
//   • Organization — grouping by planId as the FIRST path segment keeps the
//     door open to path-based storage RLS later (the migration's closing note
//     sketches "first folder = plan_id"). Format could be a second segment.
//   • Readability — an advisor browsing the bucket in the dashboard will thank
//     you for a client name + date in the key. But last names contain spaces,
//     accents, apostrophes (e.g. "O'Brien") — slugify before trusting them in
//     an object key.
//   • Safety — stick to [a-z0-9/_-]; avoid leading slashes and '..'.
//
// Example shape (yours to change): plans/<planId>/<format>/<ts>-<slug>.<ext>
//
// Signature and return contract:
//   in:  planId, format, a slug-ready last name (may be ""), and the extension
//   out: a bucket-relative object key (no leading slash)
// ---------------------------------------------------------------------------
function buildObjectPath(
  planId: string,
  format: DocumentFormat,
  clientLastName: string,
  extension: string
): string {
  // TODO(you): implement per the notes above and delete this throw.
  throw new Error("buildObjectPath is not implemented yet — see src/lib/document-storage.ts");
}

/**
 * Upload a generated document to the private bucket and log the delivery.
 *
 * `supabase` must be the request-scoped client carrying the caller's session —
 * it's what makes record_plan_document() run under their RLS. The upload itself
 * uses the service-role client internally. Returns the recorded row (including
 * the DB-assigned version). Throws on any failure.
 */
export async function storePlanDocument(
  supabase: SupabaseClient,
  { planId, format, buffer, clientLastName }: StoreDocumentInput
): Promise<PlanDocumentRow> {
  const path = buildObjectPath(planId, format, clientLastName, EXTENSION[format]);

  // 1 + 2: upload the bytes with the RLS-bypassing service-role client.
  const admin = createAdminClient();
  const { error: uploadError } = await admin.storage
    .from(BUCKET)
    .upload(path, buffer, {
      contentType: CONTENT_TYPE[format],
      upsert: false, // unique keys only; never clobber a delivered file
    });

  if (uploadError) {
    throw new Error(`Failed to upload document: ${uploadError.message}`);
  }

  // 3: record the delivery under the caller's session, so RLS + finalized_by
  // are enforced by the database, not trusted from here.
  const { data, error: recordError } = await supabase.rpc("record_plan_document", {
    p_plan_id: planId,
    p_format: format,
    p_storage_path: path,
    p_file_size: buffer.length,
  });

  if (recordError) {
    // Best-effort cleanup of the just-uploaded orphan; ignore its result since
    // the delivery already failed and we're surfacing that.
    await admin.storage.from(BUCKET).remove([path]);
    throw new Error(`Failed to record document delivery: ${recordError.message}`);
  }

  return data as PlanDocumentRow;
}
