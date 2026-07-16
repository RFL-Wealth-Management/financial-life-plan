import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { RoleSelect } from "@/components/RoleSelect";
import type { UserRole } from "@/lib/types";

export default async function ManageUsersPage() {
  const admin = await requireAdmin();
  const supabase = await createClient();

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, email, role, created_at")
    .order("created_at", { ascending: true });

  return (
    <main className="flex-1 p-6">
      <div className="mx-auto w-full max-w-3xl">
        <h1 className="mb-8 font-heading text-2xl font-bold text-foreground">
          Manage Users
        </h1>

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
      </div>
    </main>
  );
}
