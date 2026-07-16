import { redirect } from "next/navigation";
import { getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createEmailLookup } from "@/lib/profiles";
import { DashboardContent } from "./DashboardContent";
import type { ReportListItem } from "@/components/ReportList";

/**
 * Fetches once for whichever role the viewer really has; DashboardContent then
 * decides what to show from the view role in context. Both shapes come out of
 * this single RLS-scoped query, so flipping the toggle costs no round-trip.
 *
 * The over-fetch to FETCH_LIMIT gives the client enough rows to still fill a
 * user-view list after filtering out other people's reports.
 */
const FETCH_LIMIT = 50;

export default async function DashboardPage() {
  const profile = await getProfile();
  if (!profile) redirect("/login");

  const supabase = await createClient();

  const { data: reports } = await supabase
    .from("documents")
    .select("id, client1_name, client2_name, created_at, owner_id")
    .order("created_at", { ascending: false })
    .limit(FETCH_LIMIT);

  // Only an admin's list names the author, and only an admin may read every
  // profile row, so skip the lookup entirely for everyone else.
  const ownerEmails =
    profile.role === "admin" ? await createEmailLookup(supabase) : {};

  return (
    <DashboardContent
      reports={(reports ?? []) as ReportListItem[]}
      ownerEmails={ownerEmails}
    />
  );
}
