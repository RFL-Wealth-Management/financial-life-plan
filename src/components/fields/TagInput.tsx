"use client";

interface TagOption {
  label: string;
  value: string;
}

interface TagInputProps {
  label: string;
  value: string[];
  onChange: (value: string[]) => void;
  id: string;
  options: TagOption[];
  required?: boolean;
  placeholder?: string;
}

export function TagInput({
  label,
  value,
  onChange,
  id,
  options,
  required,
  placeholder,
}: TagInputProps) {
  const labelFor = (v: string) =>
    options.find((opt) => opt.value === v)?.label ?? v;

  function removeTag(tag: string) {
    onChange(value.filter((v) => v !== tag));
  }

  // TODO: decide what clicking an option does. See the notes in the PR/chat —
  // this shapes ordering in the generated document, so it is not just UI.
  //
  //   - Already-selected option clicked again: toggle it off, or ignore?
  //   - Order of `value`: click order, or canonical `options` order?
  //   - Guard against duplicates.
  //
  // Called by the option buttons below. Must call onChange with the next array.
  function addTag(tag: string) {
    throw new Error("addTag not implemented");
  }

  return (
    <div>
      <label
        htmlFor={id}
        className="block text-xs font-medium text-foreground/70 mb-1"
      >
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>

      {/* Main field — holds the chosen tags */}
      <div
        id={id}
        className="w-full min-h-[42px] rounded-lg border border-foreground/20 bg-white px-2 py-1.5 text-sm focus-within:ring-2 focus-within:ring-accent/50"
      >
        {value.length === 0 ? (
          <span className="px-1 text-sm text-foreground/40 leading-7">
            {placeholder}
          </span>
        ) : (
          <ul className="flex flex-wrap gap-1.5">
            {value.map((tag) => (
              <li key={tag}>
                <span className="inline-flex items-center gap-1 rounded-md bg-accent/10 px-2 py-1 text-xs font-medium text-foreground">
                  {labelFor(tag)}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    aria-label={`Remove ${labelFor(tag)}`}
                    className="text-foreground/40 hover:text-foreground"
                  >
                    &times;
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Options — click to add to the field above */}
      <ul className="mt-2 flex flex-wrap gap-1.5">
        {options.map((opt) => {
          const isSelected = value.includes(opt.value);
          return (
            <li key={opt.value}>
              <button
                type="button"
                onClick={() => addTag(opt.value)}
                aria-pressed={isSelected}
                className={`rounded-md border px-2 py-1 text-xs transition-colors ${
                  isSelected
                    ? "border-accent/30 bg-accent/10 text-foreground/40"
                    : "border-foreground/20 text-foreground/70 hover:border-accent/50 hover:text-foreground"
                }`}
              >
                {opt.label}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
