import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { UserRow, type UserRowData } from "@/components/UserRow";
import { CreateUserForm } from "@/components/CreateUserForm";
import type { UserRole } from "@/lib/types";

export default async function ManageUsersPage() {
  const admin = await requireAdmin();
  const supabase = await createClient();

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, email, role, created_at, name, position, phone")
    .order("created_at", { ascending: true });

  const users: UserRowData[] = (profiles ?? []).map((p) => ({
    id: p.id,
    email: p.email,
    role: p.role as UserRole,
    createdAt: p.created_at,
    name: p.name,
    position: p.position,
    phone: p.phone,
  }));

  return (
    <main className="flex-1 p-6">
      <div className="mx-auto w-full max-w-3xl">
        <div className="mb-8 flex items-center justify-between gap-4">
          <h1 className="font-heading text-2xl font-bold text-foreground">
            Manage Users
          </h1>
          <CreateUserForm />
        </div>

        <h2 className="mb-3 text-sm font-semibold text-foreground">
          Users ({users.length})
        </h2>
        <ul className="divide-y divide-foreground/10 rounded-lg border border-foreground/10">
          {users.map((user) => (
            <UserRow key={user.id} user={user} isSelf={user.id === admin.id} />
          ))}
        </ul>
      </div>
    </main>
  );
}
