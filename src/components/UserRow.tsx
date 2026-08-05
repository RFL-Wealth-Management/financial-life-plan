"use client";

import { useState, useTransition } from "react";
import { updateUser, type UserFields } from "@/app/actions/users";
import { RoleSelect } from "@/components/RoleSelect";
import type { UserRole } from "@/lib/types";

export interface UserRowData {
  id: string;
  name: string | null;
  position: string | null;
  phone: string | null;
  email: string;
  role: UserRole;
  createdAt: string;
}

const inputClass =
  "w-full rounded-lg border border-foreground/20 bg-white px-2 py-1 text-sm text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-accent/50";

export function UserRow({
  user,
  isSelf,
}: {
  user: UserRowData;
  isSelf: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [fields, setFields] = useState<UserFields>({
    name: user.name ?? "",
    position: user.position ?? "",
    phone: user.phone ?? "",
    email: user.email,
  });
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function set<K extends keyof UserFields>(key: K, value: string) {
    setFields((prev) => ({ ...prev, [key]: value }));
  }

  function cancel() {
    setFields({
      name: user.name ?? "",
      position: user.position ?? "",
      phone: user.phone ?? "",
      email: user.email,
    });
    setError("");
    setEditing(false);
  }

  function save() {
    setError("");
    startTransition(async () => {
      const result = await updateUser(user.id, fields);
      if (result.error) {
        setError(result.error);
        return;
      }
      setEditing(false);
    });
  }

  if (editing) {
    return (
      <li className="px-4 py-3">
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs text-foreground/50">Name</span>
            <input
              className={inputClass}
              value={fields.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Full name"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-foreground/50">
              Position
            </span>
            <input
              className={inputClass}
              value={fields.position}
              onChange={(e) => set("position", e.target.value)}
              placeholder="e.g. Advisor"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-foreground/50">Phone</span>
            <input
              className={inputClass}
              type="tel"
              value={fields.phone}
              onChange={(e) => set("phone", e.target.value)}
              placeholder="Phone number"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-foreground/50">
              Email (login)
            </span>
            <input
              className={inputClass}
              type="email"
              value={fields.email}
              onChange={(e) => set("email", e.target.value)}
              placeholder="you@example.com"
            />
          </label>
        </div>

        {error && (
          <p className="mt-2 text-xs text-red-700">{error}</p>
        )}

        <div className="mt-3 flex justify-end gap-2">
          <button
            type="button"
            onClick={cancel}
            disabled={pending}
            className="rounded-lg border border-foreground/20 px-3 py-1 text-xs text-foreground hover:bg-foreground/5 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={pending}
            className="rounded-lg bg-accent px-3 py-1 text-xs font-semibold text-foreground hover:brightness-105 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
          >
            {pending ? "Saving..." : "Save"}
          </button>
        </div>
      </li>
    );
  }

  return (
    <li className="flex items-center justify-between gap-4 px-4 py-3">
      <div className="min-w-0">
        <p className="truncate text-sm text-foreground">
          {user.name || (
            <span className="text-foreground/40">No name</span>
          )}
          {user.position && (
            <span className="ml-2 text-xs text-foreground/50">
              {user.position}
            </span>
          )}
          {isSelf && <span className="ml-2 text-xs text-foreground/40">you</span>}
        </p>
        <p className="truncate text-xs text-foreground/50">
          {user.email}
          {user.phone && <span className="ml-2">· {user.phone}</span>}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <RoleSelect userId={user.id} currentRole={user.role} />
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="rounded-lg border border-foreground/20 px-3 py-1 text-xs text-foreground hover:bg-foreground/5 cursor-pointer"
        >
          Edit
        </button>
      </div>
    </li>
  );
}
