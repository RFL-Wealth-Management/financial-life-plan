"use client";

// A Yes/No choice, rendered as a two-option segmented control.
//
// Takes a real boolean rather than a SelectInput with "yes"/"no" string values:
// these flags travel through form state, the plans.options jsonb column, and the
// document payload's docxtemplater section tags ({#includeTfsa}), and every one
// of those layers wants a boolean. Coercing strings at each boundary is four
// chances to get it wrong.
//
// Both options are always visible — with a plan section at stake, "which one is
// selected" should be readable at a glance rather than inferred from a switch
// position.

interface ToggleInputProps {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  /** Base id; the two radios derive their own ids from it. */
  id: string;
  /** Short note under the control, e.g. what excluding this removes. */
  hint?: string;
  yesLabel?: string;
  noLabel?: string;
  /** Visually hide the label (kept for screen readers). */
  hideLabel?: boolean;
}

export function ToggleInput({
  label,
  value,
  onChange,
  id,
  hint,
  yesLabel = "Yes",
  noLabel = "No",
  hideLabel,
}: ToggleInputProps) {
  const options: { label: string; selected: boolean; next: boolean }[] = [
    { label: yesLabel, selected: value, next: true },
    { label: noLabel, selected: !value, next: false },
  ];

  return (
    <div>
      <span
        id={`${id}-label`}
        className={`mb-1 block text-xs font-medium text-foreground/70 ${
          hideLabel ? "sr-only" : ""
        }`}
      >
        {label}
      </span>
      <div
        role="radiogroup"
        aria-labelledby={`${id}-label`}
        className="inline-flex overflow-hidden rounded-lg border border-foreground/20 bg-white"
      >
        {options.map((opt, i) => (
          <button
            key={opt.label}
            type="button"
            role="radio"
            id={`${id}-${opt.next ? "yes" : "no"}`}
            aria-checked={opt.selected}
            onClick={() => onChange(opt.next)}
            className={`px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 ${
              i > 0 ? "border-l border-foreground/20" : ""
            } ${
              opt.selected
                ? "bg-accent/15 text-foreground"
                : "text-foreground/50 hover:bg-foreground/5"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
      {hint && <p className="mt-1 text-[11px] text-foreground/45">{hint}</p>}
    </div>
  );
}
