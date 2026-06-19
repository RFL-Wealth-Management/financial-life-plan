"use client";

import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <button
      onClick={handleLogout}
      className="text-xs text-foreground/50 hover:text-foreground/80 transition-colors cursor-pointer"
    >
      Sign out
    </button>
  );
}
