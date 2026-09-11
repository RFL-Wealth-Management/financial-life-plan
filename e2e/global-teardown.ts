import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

const CREATED_PLANS_FILE = "e2e/.artifacts/created-plans.txt";

/**
 * Delete every plan the run created (ids collected by trackCreatedPlans). The
 * `plans` foreign keys cascade, so this also removes the plan's parties, child
 * rows, and plan_fflp. Uses the service-role key (RLS-exempt) from .env.local.
 * If that key isn't present, it warns and leaves the rows for manual cleanup.
 */
export default async function globalTeardown(): Promise<void> {
  if (!fs.existsSync(CREATED_PLANS_FILE)) return;

  const ids = [
    ...new Set(
      fs
        .readFileSync(CREATED_PLANS_FILE, "utf8")
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean)
    ),
  ];
  if (ids.length === 0) return;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.warn(
      `[e2e cleanup] SUPABASE_SERVICE_ROLE_KEY not set — leaving ${ids.length} test plan(s) in the DB.`
    );
    return;
  }

  const admin = createClient(url, key, { auth: { persistSession: false } });
  let removed = 0;
  for (const id of ids) {
    const { error } = await admin.from("plans").delete().eq("id", id);
    if (error) console.warn(`[e2e cleanup] failed to delete ${id}: ${error.message}`);
    else removed += 1;
  }

  fs.rmSync(CREATED_PLANS_FILE, { force: true });
  console.log(`[e2e cleanup] removed ${removed}/${ids.length} test plan(s).`);
}
