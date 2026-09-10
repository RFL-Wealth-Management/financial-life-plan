// Presentation helpers shared by the wizard, the document payload, and the field
// components.
//
// Deliberately domain-free: this module imports nothing from the IFLP form, so
// `src/components/fields/*` can use it without a component -> domain dependency.
// Domain calculations belong in `iflp-derive.ts`, not here.
//
// The empty-value split is the point of having two wrappers per formatter:
//
//   moneyOrBlank  -> ""   the DOCUMENT must never print a dash into a table cell
//   moneyOrDash   -> "—"  the WIZARD must never render an empty box
//
// Keep both. Collapsing them is how "—" ends up in a client-facing plan.

const CURRENCY_LOCALE = "en-CA";
const CURRENCY = "CAD";

/** "$285,000" from 285000. Whole dollars — these figures never carry cents. */
export function formatMoney(n: number): string {
  return n.toLocaleString(CURRENCY_LOCALE, {
    style: "currency",
    currency: CURRENCY,
    maximumFractionDigits: 0,
  });
}

/** Document-facing: an absent figure leaves the cell empty. */
export function moneyOrBlank(n: number | null): string {
  return n == null || Number.isNaN(n) ? "" : formatMoney(n);
}

/** Wizard-facing: an absent figure shows a dash so the field reads as "not yet set". */
export function moneyOrDash(n: number | null): string {
  return n == null || Number.isNaN(n) ? "—" : formatMoney(n);
}

/** "$285,000/year" for the Retirement Buckets "What It Delivers" column. */
export function perYearOrBlank(n: number | null): string {
  const money = moneyOrBlank(n);
  return money ? `${money}/year` : "";
}

/** "12 Years" from 12, "1 Year" from 1. Null -> "". */
export function formatYears(n: number | null): string {
  return n == null ? "" : `${n} Year${n === 1 ? "" : "s"}`;
}

/**
 * Sum, treating null as absent — returns null when EVERY value is null, so a
 * blank table renders "" / "—" rather than a misleading "$0". A single entered
 * zero still yields 0, which is a real answer.
 */
export function sumOrNull(values: (number | null)[]): number | null {
  const nums = values.filter((v): v is number => v != null);
  return nums.length ? nums.reduce((a, b) => a + b, 0) : null;
}
