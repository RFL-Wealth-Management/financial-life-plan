"use client";

import { NavLink } from "@/components/NavLink";
import { useSession } from "@/components/SessionProvider";
import { LogoutButton } from "@/components/LogoutButton";
import type { UserRole } from "@/lib/types";

interface MenuItem {
  href: string;
  label: string;
}

/**
 * The menu each role sees. Admins get the management surfaces; users get only
 * their dashboard, and reach report creation from the button on it rather than
 * from a nav item.
 *
 * Adding a link here grants nothing on its own — the target page authorizes
 * itself. See SessionProvider.
 */
function menuForRole(role: UserRole): MenuItem[] {
  if (role === "admin") {
    return [
      { href: "/dashboard", label: "Dashboard" },
      { href: "/reports", label: "Manage Reports" },
      { href: "/users", label: "Manage Users" },
    ];
  }

  return [{ href: "/dashboard", label: "Dashboard" }];
}

export function Sidebar() {
  const { viewRole } = useSession();

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-foreground/10 bg-foreground/[0.02] p-4">
      <div className="mb-6 px-3 pt-2">
        <p className="font-heading text-base font-bold leading-tight text-foreground">
          Financial Life Plan
        </p>
        <p className="mt-0.5 text-xs capitalize text-foreground/50">
          {viewRole}
        </p>
      </div>

      <nav aria-label="Main">
        <ul className="space-y-1">
          {menuForRole(viewRole).map((item) => (
            <li key={item.href}>
              <NavLink href={item.href} label={item.label} />
            </li>
          ))}
        </ul>
      </nav>

      {/* mt-auto pins this to the bottom however short the menu is. */}
      <div className="mt-auto border-t border-foreground/10 px-3 pt-4">
        <LogoutButton />
      </div>
    </aside>
  );
}
