import { redirect } from "next/navigation";
import { getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createEmailLookup } from "@/lib/profiles";
import { DashboardContent } from "./DashboardContent";
import type { PlanListItem } from "@/components/PlanList";

/**
 * Fetches once for whichever role the viewer really has; DashboardContent then
 * decides what to show from the view role in context. Both shapes come out of
 * this single RLS-scoped query, so flipping the toggle costs no round-trip.
 *
 * The over-fetch to FETCH_LIMIT gives the client enough rows to still fill a
 * user-view list after filtering out other people's plans.
 */
const FETCH_LIMIT = 50;

interface PartyRow {
  display_name: string;
  party_type: string;
  sort_order: number;
}

export default async function DashboardPage() {
  const profile = await getProfile();
  if (!profile) redirect("/login");

  const supabase = await createClient();

  // Names live in plan_parties, so pull each plan's parties inline and derive
  // the client name(s) for the list. RLS scopes both the plans and the embed.
  const { data: plans } = await supabase
    .from("plans")
    .select("id, created_at, owner_id, plan_parties(display_name, party_type, sort_order)")
    .order("created_at", { ascending: false })
    .limit(FETCH_LIMIT);

  const items: PlanListItem[] = (plans ?? []).map((plan) => {
    const clients = ((plan.plan_parties as PartyRow[]) ?? [])
      .filter((p) => p.party_type === "client")
      .sort((a, b) => a.sort_order - b.sort_order);
    return {
      id: plan.id as string,
      client1Name: clients[0]?.display_name ?? "Untitled plan",
      client2Name: clients[1]?.display_name ?? null,
      createdAt: plan.created_at as string,
      ownerId: plan.owner_id as string,
    };
  });

  // Only an admin's list names the author, and only an admin may read every
  // profile row, so skip the lookup entirely for everyone else.
  const ownerEmails =
    profile.role === "admin" ? await createEmailLookup(supabase) : {};

  return <DashboardContent plans={items} ownerEmails={ownerEmails} />;
}
