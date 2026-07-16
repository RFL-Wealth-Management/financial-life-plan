"use client";

import { useState, useTransition } from "react";
import { changeRole } from "@/app/actions/roles";
import type { UserRole } from "@/lib/types";

export function RoleSelect({
  userId,
  currentRole,
}: {
  userId: string;
  currentRole: UserRole;
}) {
  const [role, setRole] = useState<UserRole>(currentRole);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function handleChange(nextRole: UserRole) {
    const previous = role;
    setRole(nextRole);
    setError("");

    startTransition(async () => {
      const result = await changeRole(userId, nextRole);
      if (result.error) {
        setRole(previous);
        setError(result.error);
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <select
        value={role}
        disabled={pending}
        onChange={(e) => handleChange(e.target.value as UserRole)}
        className="rounded-lg border border-foreground/20 bg-white px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
      >
        <option value="user">User</option>
        <option value="admin">Admin</option>
      </select>
      {error && <p className="text-xs text-red-700 max-w-[16rem] text-right">{error}</p>}
    </div>
  );
}
