"use client";

import { useSession } from "@/components/SessionProvider";
import type { UserRole } from "@/lib/types";

const ROLES: UserRole[] = ["admin", "user"];

/**
 * Temporary segmented control for previewing either sidebar.
 *
 * Moves context state only — no cookie, no request. The switch is instant
 * because every consumer already has the data it needs, and a reload resets to
 * the real role.
 */
export function ViewToggle() {
  const { viewRole, setViewRole } = useSession();

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-foreground/50">View as</span>
      <div
        role="group"
        aria-label="View as role"
        className="inline-flex rounded-lg border border-foreground/15 p-0.5"
      >
        {ROLES.map((role) => (
          <button
            key={role}
            type="button"
            onClick={() => setViewRole(role)}
            aria-pressed={role === viewRole}
            className={`cursor-pointer rounded-md px-3 py-1 text-xs capitalize transition-colors ${
              role === viewRole
                ? "bg-accent font-semibold text-foreground"
                : "text-foreground/60 hover:text-foreground"
            }`}
          >
            {role}
          </button>
        ))}
      </div>
    </div>
  );
}
