"use client";

import { useEffect, useState, useTransition } from "react";
import { Plus, UserPlus, X } from "lucide-react";
import { createUser, type UserFields } from "@/app/actions/users";

const inputClass =
  "w-full rounded-lg border border-foreground/20 bg-white px-3 py-2 text-sm text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-accent/50";

const labelClass = "mb-1 block text-xs font-medium text-foreground/70";

const emptyFields: UserFields = { name: "", position: "", phone: "", email: "" };

export function CreateUserForm() {
  const [open, setOpen] = useState(false);
  const [fields, setFields] = useState<UserFields>(emptyFields);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  const [pending, startTransition] = useTransition();

  // Close the drawer on Escape while it's open.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function set<K extends keyof UserFields>(key: K, value: string) {
    setFields((prev) => ({ ...prev, [key]: value }));
  }

  function openDrawer() {
    setError("");
    setDone("");
    setOpen(true);
  }

  function close() {
    setOpen(false);
    setFields(emptyFields);
    setPassword("");
    setError("");
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setDone("");
    startTransition(async () => {
      const result = await createUser(fields, password);
      if (result.error) {
        setError(result.error);
        return;
      }
      setDone(`Created ${fields.email}. Share the temporary password securely.`);
      setFields(emptyFields);
      setPassword("");
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={openDrawer}
        className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-foreground hover:brightness-105 cursor-pointer"
      >
        <Plus size={14} aria-hidden />
        Add user
      </button>

      {/* Backdrop — click to dismiss. */}
      <div
        onClick={close}
        aria-hidden
        className={`fixed inset-0 z-40 bg-foreground/30 transition-opacity duration-200 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      {/* Right-hand drawer. Always mounted so it can slide; translated off-screen
          when closed. */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Add user"
        className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-background shadow-2xl transition-transform duration-200 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <header className="flex items-center justify-between border-b border-foreground/10 px-5 py-4">
          <h2 className="font-heading text-lg font-bold text-foreground">
            Add user
          </h2>
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="rounded-lg p-1 text-foreground/50 hover:bg-foreground/5 hover:text-foreground cursor-pointer"
          >
            <X size={18} aria-hidden />
          </button>
        </header>

        <form
          onSubmit={submit}
          className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 py-4"
        >
          <div className="space-y-3">
            <div>
              <label htmlFor="new-name" className={labelClass}>
                Name
              </label>
              <input
                id="new-name"
                className={inputClass}
                value={fields.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="Full name"
              />
            </div>
            <div>
              <label htmlFor="new-position" className={labelClass}>
                Position
              </label>
              <input
                id="new-position"
                className={inputClass}
                value={fields.position}
                onChange={(e) => set("position", e.target.value)}
                placeholder="e.g. Advisor"
              />
            </div>
            <div>
              <label htmlFor="new-phone" className={labelClass}>
                Phone
              </label>
              <input
                id="new-phone"
                type="tel"
                className={inputClass}
                value={fields.phone}
                onChange={(e) => set("phone", e.target.value)}
                placeholder="Phone number"
              />
            </div>
            <div>
              <label htmlFor="new-email" className={labelClass}>
                Email (login) <span className="text-red-600">*</span>
              </label>
              <input
                id="new-email"
                type="email"
                required
                className={inputClass}
                value={fields.email}
                onChange={(e) => set("email", e.target.value)}
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label htmlFor="new-password" className={labelClass}>
                Temporary password <span className="text-red-600">*</span>
              </label>
              <input
                id="new-password"
                type="text"
                required
                autoComplete="off"
                className={inputClass}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="The user changes this on first sign-in"
              />
            </div>
          </div>

          {error && <p className="mt-3 text-xs text-red-700">{error}</p>}
          {done && <p className="mt-3 text-xs text-green-700">{done}</p>}

          <div className="mt-auto flex justify-end gap-2 pt-5">
            <button
              type="button"
              onClick={close}
              disabled={pending}
              className="inline-flex items-center gap-1.5 rounded-lg border border-foreground/20 px-3 py-1.5 text-xs text-foreground hover:bg-foreground/5 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
            >
              <X size={14} aria-hidden />
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-foreground hover:brightness-105 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
            >
              <UserPlus size={14} aria-hidden />
              {pending ? "Creating..." : "Create user"}
            </button>
          </div>
        </form>
      </aside>
    </>
  );
}
