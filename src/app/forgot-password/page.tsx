"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/confirm?next=/reset-password`,
    });

    setLoading(false);

    if (error) {
      setError("Something went wrong. Please try again.");
      return;
    }

    setSent(true);
  }

  return (
    <main className="flex-1 flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-heading font-bold text-foreground">
            Reset your password
          </h1>
          <p className="mt-2 text-sm text-foreground/60">
            {sent
              ? "Check your inbox for a reset link."
              : "Enter your email and we'll send you a reset link."}
          </p>
        </div>

        {sent ? (
          <p className="text-sm text-foreground/70 bg-foreground/5 rounded-lg px-3 py-2 text-center">
            If an account exists for {email}, a password reset email is on
            its way.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-medium text-foreground/70 mb-1"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                autoFocus
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-foreground/20 bg-white px-3 py-2 text-sm text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-accent/50"
                placeholder="you@example.com"
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
              className="w-full rounded-lg bg-accent text-foreground py-2.5 text-sm font-semibold hover:brightness-105 disabled:opacity-50 transition cursor-pointer disabled:cursor-not-allowed"
            >
              {loading ? "Sending..." : "Send reset link"}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-xs text-foreground/50">
          <Link href="/login" className="hover:text-foreground/80 transition-colors">
            Back to sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
