"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

/**
 * Validates a new password before it's sent to Supabase.
 *
 * TODO(daniel): This is a security/UX trade-off worth making deliberately
 * rather than copying a default. Supabase's own server-side minimum is
 * 6 characters, but that's a floor, not a recommendation.
 *
 * Return `null` if the password is acceptable, or a user-facing error
 * string explaining why it was rejected.
 *
 * Things to weigh:
 * - Minimum length (NIST guidance leans toward length over complexity —
 *   e.g. 12+ chars beats 8 chars + symbols)
 * - Whether to require a mix of character classes (uppercase/digit/symbol)
 * - Whether to reject common/weak passwords outright
 * - This app's users are RFL staff, not the general public — does that
 *   change how strict you want to be?
 */
function validateNewPassword(password: string): string | null {
  // TODO: implement validation rules
  return null;
}

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    const validationError = validateNewPassword(password);
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      setError("Something went wrong. Please request a new reset link.");
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <main className="flex-1 flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-heading font-bold text-foreground">
            Set a new password
          </h1>
          <p className="mt-2 text-sm text-foreground/60">
            Choose a new password for your account.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="password"
              className="block text-xs font-medium text-foreground/70 mb-1"
            >
              New password
            </label>
            <input
              id="password"
              type="password"
              required
              autoFocus
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-foreground/20 bg-white px-3 py-2 text-sm text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-accent/50"
              placeholder="Enter new password"
            />
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-xs font-medium text-foreground/70 mb-1"
            >
              Confirm password
            </label>
            <input
              id="confirmPassword"
              type="password"
              required
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-lg border border-foreground/20 bg-white px-3 py-2 text-sm text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-accent/50"
              placeholder="Re-enter new password"
            />
          </div>

          {error && (
            <p className="text-sm text-red-700 bg-red-50 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-accent text-foreground py-2.5 text-sm font-semibold hover:brightness-105 disabled:opacity-50 transition cursor-pointer disabled:cursor-not-allowed"
          >
            <Check size={16} aria-hidden />
            {loading ? "Updating..." : "Update password"}
          </button>
        </form>
      </div>
    </main>
  );
}
