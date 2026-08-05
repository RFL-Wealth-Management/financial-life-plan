"use client";

import Link from "next/link";
import { useSession } from "@/components/SessionProvider";
import { PlanList, type PlanListItem } from "@/components/PlanList";

const VISIBLE_LIMIT = 10;

/**
 * One dashboard, two shapes: admins see the latest plans across every user,
 * users see only their own plus a way to make another.
 *
 * `plans` arrives already scoped by RLS, so a real user is only ever handed
 * their own rows and the owner filter below is a no-op for them. It earns its
 * keep for an admin previewing the user view — they are still an admin to the
 * database, so plans_select hands back everyone's rows and the preview would
 * otherwise lie.
 */
export function DashboardContent({
  plans,
  ownerEmails,
}: {
  plans: PlanListItem[];
  ownerEmails: Record<string, string>;
}) {
  const { profile, viewRole } = useSession();
  const isAdminView = viewRole === "admin";

  const visible = (
    isAdminView ? plans : plans.filter((plan) => plan.ownerId === profile.id)
  ).slice(0, VISIBLE_LIMIT);

  return (
    <main className="flex-1 p-6">
      <div className="mx-auto w-full max-w-3xl">
        <div className="mb-8 flex items-baseline justify-between gap-4">
          <h1 className="font-heading text-2xl font-bold text-foreground">
            Dashboard
          </h1>
          {!isAdminView && (
            <Link
              href="/reports/new"
              className="shrink-0 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-foreground transition hover:brightness-105"
            >
              New report
            </Link>
          )}
        </div>

        <section>
          <h2 className="mb-3 text-sm font-semibold text-foreground">
            {isAdminView ? "Latest reports" : "My latest reports"}
          </h2>
          <PlanList
            plans={visible}
            ownerEmails={isAdminView ? ownerEmails : undefined}
            emptyMessage={
              isAdminView
                ? "No reports generated yet."
                : "You have not generated any reports yet."
            }
          />
        </section>
      </div>
    </main>
  );
}
