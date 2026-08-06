import Link from "next/link";
import { Pencil, RefreshCw } from "lucide-react";

// Format a timestamp identically on the server and the client. Bare
// toLocaleDateString() uses the runtime's locale + timezone, which differ
// between Node (SSR) and the browser and cause a hydration mismatch — so pin
// both. UTC keeps the calendar date stable regardless of the viewer's zone.
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    timeZone: "UTC",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  });
}

export interface PlanListItem {
  id: string;
  client1Name: string;
  client2Name: string | null;
  createdAt: string;
  ownerId: string;
}

/**
 * List of saved IFLP plans for the dashboard. Each row links to Edit (loads the
 * plan back into the wizard) and Regenerate (streams a fresh .docx built from
 * the saved data via /api/plans/[id]/document). Pass ownerEmails on an admin
 * list to name the author; omit it on a user's own list.
 */
export function PlanList({
  plans,
  ownerEmails,
  emptyMessage,
}: {
  plans: PlanListItem[];
  ownerEmails?: Record<string, string>;
  emptyMessage: string;
}) {
  if (!plans.length) {
    return (
      <p className="rounded-lg border border-foreground/10 px-4 py-6 text-center text-sm text-foreground/50">
        {emptyMessage}
      </p>
    );
  }

  return (
    <ul className="divide-y divide-foreground/10 rounded-lg border border-foreground/10">
      {plans.map((plan) => (
        <li
          key={plan.id}
          className="flex items-center justify-between gap-4 px-4 py-3"
        >
          <div className="min-w-0">
            <p className="truncate text-sm text-foreground">
              {plan.client1Name}
              {plan.client2Name && ` & ${plan.client2Name}`}
            </p>
            <p className="text-xs text-foreground/50">
              {ownerEmails ? `${ownerEmails[plan.ownerId] ?? "unknown"} · ` : ""}
              {formatDate(plan.createdAt)}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3 text-xs">
            <Link
              href={`/reports/${plan.id}/edit`}
              className="inline-flex items-center gap-1.5 text-foreground/50 transition-colors hover:text-foreground/80"
            >
              <Pencil size={13} aria-hidden />
              Edit
            </Link>
            <a
              href={`/api/plans/${plan.id}/document`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-accent/40 px-3 py-1.5 font-medium text-foreground transition hover:bg-accent/10"
            >
              <RefreshCw size={13} aria-hidden />
              Regenerate
            </a>
          </div>
        </li>
      ))}
    </ul>
  );
}
