import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { RoleSelect } from "./RoleSelect";
import type { UserRole } from "@/lib/types";

export default async function AdminPage() {
  const admin = await requireAdmin();
  const supabase = await createClient();

  // Both selects come back fully scoped by RLS. They return every row here
  // only because an admin is asking.
  const [{ data: profiles }, { data: documents }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, email, role, created_at")
      .order("created_at", { ascending: true }),
    supabase
      .from("documents")
      .select("id, client1_name, client2_name, created_at, owner_id")
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const emailByUserId = new Map((profiles ?? []).map((p) => [p.id, p.email]));

  return (
    <main className="flex-1 p-6">
      <div className="mx-auto w-full max-w-3xl">
        <div className="mb-8 flex items-baseline justify-between">
          <div>
            <h1 className="text-2xl font-heading font-bold text-foreground">
              Admin
            </h1>
            <p className="mt-1 text-sm text-foreground/60">
              Signed in as {admin.email}
            </p>
          </div>
          <Link
            href="/"
            className="text-xs text-foreground/50 hover:text-foreground/80 transition-colors"
          >
            Back to generator
          </Link>
        </div>

        <section className="mb-10">
          <h2 className="mb-3 text-sm font-semibold text-foreground">
            Users ({profiles?.length ?? 0})
          </h2>
          <ul className="divide-y divide-foreground/10 rounded-lg border border-foreground/10">
            {(profiles ?? []).map((profile) => (
              <li
                key={profile.id}
                className="flex items-center justify-between gap-4 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm text-foreground">
                    {profile.email}
                    {profile.id === admin.id && (
                      <span className="ml-2 text-xs text-foreground/40">you</span>
                    )}
                  </p>
                  <p className="text-xs text-foreground/50">
                    Joined {new Date(profile.created_at).toLocaleDateString()}
                  </p>
                </div>
                <RoleSelect
                  userId={profile.id}
                  currentRole={profile.role as UserRole}
                />
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold text-foreground">
            Recent plans
          </h2>
          {documents?.length ? (
            <ul className="divide-y divide-foreground/10 rounded-lg border border-foreground/10">
              {documents.map((doc) => (
                <li
                  key={doc.id}
                  className="flex items-center justify-between gap-4 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm text-foreground">
                      {doc.client1_name}
                      {doc.client2_name && ` & ${doc.client2_name}`}
                    </p>
                    <p className="text-xs text-foreground/50">
                      {emailByUserId.get(doc.owner_id) ?? "unknown"} ·{" "}
                      {new Date(doc.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <a
                    href={`/api/download/${doc.id}/docx`}
                    className="shrink-0 text-xs text-foreground/50 hover:text-foreground/80 transition-colors"
                  >
                    Download
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-lg border border-foreground/10 px-4 py-6 text-center text-sm text-foreground/50">
              No plans generated yet.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
