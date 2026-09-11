// A read-only, calculated money figure — styled to sit beside CurrencyInput in a
// field grid without looking editable. Used for amounts the planner never types
// because they follow from another field (e.g. an annual contribution derived
// from the monthly one), and for cells that are simply not applicable.

import { formatMoney } from "@/lib/format";

interface DerivedCurrencyProps {
  label: string;
  /** The computed amount. `null` renders `emptyText` instead of a figure. */
  value: number | null;
  id?: string;
  /** Shown when `value` is null — "—" by default, "N/A" where the field can never apply. */
  emptyText?: string;
  /** Short note under the field, e.g. "12 × monthly". */
  hint?: string;
}

export function DerivedCurrency({
  label,
  value,
  id,
  emptyText = "—",
  hint,
}: DerivedCurrencyProps) {
  return (
    <div>
      <span
        id={id ? `${id}-label` : undefined}
        className="mb-1 block text-xs font-medium text-foreground/70"
      >
        {label}
      </span>
      <output
        id={id}
        aria-labelledby={id ? `${id}-label` : undefined}
        className="block rounded-lg border border-foreground/15 bg-foreground/[0.03] px-3 py-2 text-sm tabular-nums text-foreground/60"
      >
        {value == null ? (
          <span className="text-foreground/40">{emptyText}</span>
        ) : (
          formatMoney(value)
        )}
      </output>
      {hint && <p className="mt-1 text-[11px] text-foreground/45">{hint}</p>}
    </div>
  );
}
