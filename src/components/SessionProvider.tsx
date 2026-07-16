"use client";

import { createContext, useContext, useMemo, useState } from "react";
import type { Profile, UserRole } from "@/lib/types";

interface SessionValue {
  /** The signed-in identity, resolved server-side once per navigation. */
  profile: Profile;
  /** The role the UI is currently drawn as — presentation only. */
  viewRole: UserRole;
  setViewRole: (role: UserRole) => void;
}

const SessionContext = createContext<SessionValue | null>(null);

/**
 * Holds the signed-in profile for the client tree.
 *
 * Populated by (app)/layout.tsx, which resolves the profile server-side from
 * the database. Client components read it from here instead of each one
 * re-querying, and the role never round-trips through the browser as something
 * the browser gets to assert.
 *
 * This context is a CACHE FOR RENDERING, never an authorization boundary. Any
 * client can edit its own memory, so anything that actually matters is decided
 * on the server: requireAdmin() gates the privileged pages and RLS scopes every
 * query. Treat `role` here as "what to draw", never "what is allowed".
 */
export function SessionProvider({
  profile,
  children,
}: {
  profile: Profile;
  children: React.ReactNode;
}) {
  // Seeded from the real role; the toggle moves it for previewing only, and a
  // reload puts it back — deliberate, since the override is not persisted.
  const [viewRole, setViewRole] = useState<UserRole>(profile.role);

  const value = useMemo(
    () => ({ profile, viewRole, setViewRole }),
    [profile, viewRole]
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession(): SessionValue {
  const context = useContext(SessionContext);

  if (!context) {
    throw new Error("useSession must be called inside <SessionProvider>");
  }

  return context;
}
