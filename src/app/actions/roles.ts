"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import type { UserRole } from "@/lib/types";

export interface ActionResult {
  error?: string;
}

/**
 * Decides whether `actor` is allowed to set `target`'s role to `nextRole`.
 * Returns an error message to block the change, or null to allow it.
 *
 * Called by changeRole() below, after admin-ness is already established — so
 * this is not "may they touch roles at all", it is "is this specific change
 * one we permit an admin to make".
 *
 * TODO(daniel): implement. See the notes in chat for the trade-offs.
 */
function validateRoleChange(_params: {
  actorId: string;
  targetId: string;
  targetCurrentRole: UserRole;
  nextRole: UserRole;
  adminCount: number;
}): string | null {
  return null;
}

export async function changeRole(
  targetId: string,
  nextRole: UserRole
): Promise<ActionResult> {
  const actor = await requireAdmin();
  const supabase = await createClient();

  const { data: target, error: targetError } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", targetId)
    .single();

  if (targetError || !target) {
    return { error: "That user no longer exists." };
  }

  const { count } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", "admin");

  const rejection = validateRoleChange({
    actorId: actor.id,
    targetId: target.id,
    targetCurrentRole: target.role as UserRole,
    nextRole,
    adminCount: count ?? 0,
  });

  if (rejection) return { error: rejection };

  const { error } = await supabase
    .from("profiles")
    .update({ role: nextRole })
    .eq("id", targetId);

  if (error) {
    console.error("Role change failed:", error);
    return { error: "Could not update that user's role." };
  }

  revalidatePath("/users");
  return {};
}
