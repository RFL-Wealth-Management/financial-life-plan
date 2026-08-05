import { redirect } from "next/navigation";
import { getProfile } from "@/lib/auth";
import { SessionProvider } from "@/components/SessionProvider";
import { Sidebar } from "@/components/Sidebar";
import { ViewToggle } from "@/components/ViewToggle";

/**
 * Chrome for every signed-in page: sidebar on the left, thin bar on top.
 *
 * This is the one place the profile is fetched for the client tree — everything
 * below reads it from SessionProvider rather than querying again. Server
 * Components cannot read React context, so the pages that need to *authorize*
 * (not merely draw) still call requireAdmin() for themselves.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getProfile();
  if (!profile) redirect("/login");

  return (
    <SessionProvider profile={profile}>
      <div className="flex flex-1">
        <Sidebar />

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center justify-between gap-4 border-b border-foreground/10 px-6 py-3">
            {/* "View as" previews the user sidebar — an admin-only tool. The
                empty span keeps the email pinned right when it's hidden. */}
            {profile.role === "admin" ? <ViewToggle /> : <span />}
            <span className="truncate text-xs text-foreground/50">
              {profile.email}
            </span>
          </header>

          {children}
        </div>
      </div>
    </SessionProvider>
  );
}
