"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * A sidebar link that knows whether it is the current page.
 *
 * Client-side only because it needs usePathname(); the surrounding Sidebar
 * stays a Server Component so the role never reaches the browser as state.
 */
export function NavLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`block rounded-lg px-3 py-2 text-sm transition-colors ${
        active
          ? "bg-accent/20 font-semibold text-foreground"
          : "text-foreground/70 hover:bg-foreground/5 hover:text-foreground"
      }`}
    >
      {label}
    </Link>
  );
}
