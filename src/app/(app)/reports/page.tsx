import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createEmailLookup } from "@/lib/profiles";
import { ReportList, type ReportListItem } from "@/components/ReportList";

export default async function ManageReportsPage() {
  await requireAdmin();
  const supabase = await createClient();

  // Unfiltered by design: documents_select_admin scopes this to everything
  // precisely because an admin is asking.
  const [{ data: reports }, ownerEmails] = await Promise.all([
    supabase
      .from("documents")
      .select("id, client1_name, client2_name, created_at, owner_id")
      .order("created_at", { ascending: false })
      .limit(50),
    createEmailLookup(supabase),
  ]);

  return (
    <main className="flex-1 p-6">
      <div className="mx-auto w-full max-w-3xl">
        <h1 className="mb-8 font-heading text-2xl font-bold text-foreground">
          Manage Reports
        </h1>

        <h2 className="mb-3 text-sm font-semibold text-foreground">
          All reports ({reports?.length ?? 0})
        </h2>
        <ReportList
          reports={(reports ?? []) as ReportListItem[]}
          ownerEmails={ownerEmails}
          emptyMessage="No reports generated yet."
        />
      </div>
    </main>
  );
}
