"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";
import type { ActionResult } from "@/app/actions/roles";

/** The four fields the Manage Users screen edits. */
export interface UserFields {
  name: string;
  position: string;
  phone: string;
  email: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Decides whether `password` is acceptable as an admin-set temporary password.
 * Returns an error message to reject it, or null to allow it.
 *
 * Supabase enforces a hard floor of its own (6 characters by default), so this
 * only ever ADDS strictness on top — it can reject, never loosen.
 *
 * TODO(daniel): implement the policy you want. Things to weigh:
 *   - Minimum length (8+ is the common baseline; longer matters more than
 *     character classes).
 *   - Whether to require a mix of character types, or deliberately not — since
 *     this is a throwaway password the user will change on first login, a
 *     length floor may be all that's worth enforcing.
 *   - Whether to block obvious values ("password", "123456", the user's email).
 * Return a short, user-facing sentence on rejection.
 */
function validateTempPassword(_password: string): string | null {
  return null;
}

/** Trim, and lowercase the email so it matches how Supabase stores it. */
function normalize(fields: UserFields): UserFields {
  return {
    name: fields.name.trim(),
    position: fields.position.trim(),
    phone: fields.phone.trim(),
    email: fields.email.trim().toLowerCase(),
  };
}

function validateFields(fields: UserFields): string | null {
  if (!fields.email) return "Email is required.";
  if (!EMAIL_RE.test(fields.email)) return "That email address looks invalid.";
  return null;
}

/**
 * Updates a user's contact fields, and — if the email changed — their login
 * identity in Supabase Auth.
 *
 * Email is the login identity, which lives in auth.users, not profiles. So a
 * change there goes through the Admin API first; only if that succeeds do we
 * update the profiles mirror, keeping the two from drifting apart. The other
 * three fields live only on profiles and go through the ordinary RLS-guarded
 * client.
 */
export async function updateUser(
  targetId: string,
  rawFields: UserFields
): Promise<ActionResult> {
  await requireAdmin();
  const fields = normalize(rawFields);

  const invalid = validateFields(fields);
  if (invalid) return { error: invalid };

  const supabase = await createClient();

  const { data: current, error: currentError } = await supabase
    .from("profiles")
    .select("email")
    .eq("id", targetId)
    .single();

  if (currentError || !current) {
    return { error: "That user no longer exists." };
  }

  if (fields.email !== current.email) {
    const admin = createAdminClient();
    const { error: authError } = await admin.auth.admin.updateUserById(
      targetId,
      { email: fields.email, email_confirm: true }
    );

    if (authError) {
      console.error("Auth email change failed:", authError);
      // The most common cause is the address already belonging to someone else.
      return { error: "Could not change the email — it may already be in use." };
    }
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      name: fields.name || null,
      position: fields.position || null,
      phone: fields.phone || null,
      email: fields.email,
    })
    .eq("id", targetId);

  if (error) {
    console.error("Profile update failed:", error);
    return { error: "Could not save those changes." };
  }

  revalidatePath("/users");
  return {};
}

/**
 * Creates a new user with an admin-chosen temporary password. The password is
 * auto-confirmed so the user can sign in immediately and change it themselves
 * from the reset-password flow.
 *
 * Inserting into auth.users fires the handle_new_user trigger, which seeds a
 * profiles row (id + email, role 'user'). We then fill in the contact fields.
 */
export async function createUser(
  rawFields: UserFields,
  tempPassword: string
): Promise<ActionResult> {
  await requireAdmin();
  const fields = normalize(rawFields);

  const invalid = validateFields(fields);
  if (invalid) return { error: invalid };

  const weakPassword = validateTempPassword(tempPassword);
  if (weakPassword) return { error: weakPassword };

  const admin = createAdminClient();

  const { data, error: createError } = await admin.auth.admin.createUser({
    email: fields.email,
    password: tempPassword,
    email_confirm: true,
  });

  if (createError || !data.user) {
    console.error("User creation failed:", createError);
    return { error: "Could not create that user — the email may already exist." };
  }

  // The trigger has already created the profile row; fill in the rest. Upsert
  // rather than update so a slow trigger can't drop the contact fields.
  const { error: profileError } = await admin.from("profiles").upsert({
    id: data.user.id,
    email: fields.email,
    name: fields.name || null,
    position: fields.position || null,
    phone: fields.phone || null,
  });

  if (profileError) {
    console.error("Profile fill-in failed:", profileError);
    return { error: "User was created, but their details could not be saved." };
  }

  revalidatePath("/users");
  return {};
}
