export interface ReportListItem {
  id: string;
  client1_name: string;
  client2_name: string | null;
  created_at: string;
  owner_id: string;
}

/**
 * Presentational list of generated plans, shared by the dashboard and Manage
 * Reports. Pass ownerEmails to show who generated each one; omit it on a
 * user's own list, where the answer is always "you".
 *
 * ownerEmails is a plain record rather than a Map so it crosses the server/
 * client boundary as-is.
 */
export function ReportList({
  reports,
  ownerEmails,
  emptyMessage,
}: {
  reports: ReportListItem[];
  ownerEmails?: Record<string, string>;
  emptyMessage: string;
}) {
  if (!reports.length) {
    return (
      <p className="rounded-lg border border-foreground/10 px-4 py-6 text-center text-sm text-foreground/50">
        {emptyMessage}
      </p>
    );
  }

  return (
    <ul className="divide-y divide-foreground/10 rounded-lg border border-foreground/10">
      {reports.map((report) => (
        <li
          key={report.id}
          className="flex items-center justify-between gap-4 px-4 py-3"
        >
          <div className="min-w-0">
            <p className="truncate text-sm text-foreground">
              {report.client1_name}
              {report.client2_name && ` & ${report.client2_name}`}
            </p>
            <p className="text-xs text-foreground/50">
              {ownerEmails
                ? `${ownerEmails[report.owner_id] ?? "unknown"} · `
                : ""}
              {new Date(report.created_at).toLocaleDateString()}
            </p>
          </div>
          <a
            href={`/api/download/${report.id}/docx`}
            className="shrink-0 text-xs text-foreground/50 transition-colors hover:text-foreground/80"
          >
            Download
          </a>
        </li>
      ))}
    </ul>
  );
}
