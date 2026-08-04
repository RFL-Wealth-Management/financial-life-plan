"use client";

import { useState, type ReactNode } from "react";

interface CollapsibleSectionProps {
  title: string;
  /** Optional short hint shown under the title when expanded. */
  hint?: string;
  /** Start expanded (default) or collapsed. */
  defaultOpen?: boolean;
  children: ReactNode;
}

/**
 * A collapsible card built on native <details>/<summary> — keyboard accessible
 * and no external state needed. `open` is tracked so parent re-renders (e.g. the
 * wizard re-rendering as fields change) don't reset the user's expand/collapse.
 */
export function CollapsibleSection({
  title,
  hint,
  defaultOpen = true,
  children,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <details
      open={open}
      onToggle={(e) => setOpen(e.currentTarget.open)}
      className="rounded-xl border border-foreground/10 bg-foreground/[0.015]"
    >
      <summary className="flex cursor-pointer select-none list-none items-center justify-between gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
        <span className="text-sm font-semibold text-foreground">{title}</span>
        <svg
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
          className={`h-4 w-4 shrink-0 text-foreground/40 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.17l3.71-3.94a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z"
            clipRule="evenodd"
          />
        </svg>
      </summary>
      <div className="space-y-4 px-4 pb-4 pt-1">
        {hint && <p className="text-xs text-foreground/50">{hint}</p>}
        {children}
      </div>
    </details>
  );
}
