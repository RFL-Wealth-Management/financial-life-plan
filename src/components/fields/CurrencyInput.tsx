"use client";

import { useState, useCallback } from "react";

interface CurrencyInputProps {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  id: string;
  required?: boolean;
  placeholder?: string;
  /**
   * When set (e.g. "$"), the symbol renders as a segmented addon box on the left
   * and the number itself shows grouped digits only. When omitted, the symbol is
   * baked into the formatted value (the original behavior) — some fields want the
   * addon, others don't, so it's opt-in per field.
   */
  prefix?: string;
}

// Grouped digits without a currency symbol: "1,200,000". For the prefix variant,
// where the symbol lives in the addon box.
function formatGrouped(n: number): string {
  return n.toLocaleString("en-CA", { maximumFractionDigits: 0 });
}

// Symbol baked in: "$1,200,000". The default (no-addon) look.
function formatWithSymbol(n: number): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

function parseRawToNumber(raw: string): number | null {
  const digits = raw.replace(/[^0-9]/g, "");
  if (!digits) return null;
  return parseInt(digits, 10);
}

export function CurrencyInput({
  label,
  value,
  onChange,
  id,
  required,
  placeholder = "$0",
  prefix,
}: CurrencyInputProps) {
  const format = prefix ? formatGrouped : formatWithSymbol;

  const [displayValue, setDisplayValue] = useState(
    value != null ? format(value) : ""
  );
  const [isFocused, setIsFocused] = useState(false);

  const handleFocus = useCallback(() => {
    setIsFocused(true);
    setDisplayValue(value != null ? value.toString() : "");
  }, [value]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    const parsed = parseRawToNumber(displayValue);
    onChange(parsed);
    setDisplayValue(parsed != null ? format(parsed) : "");
  }, [displayValue, onChange, format]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      if (isFocused) {
        const digitsOnly = raw.replace(/[^0-9]/g, "");
        setDisplayValue(digitsOnly);
        onChange(parseRawToNumber(digitsOnly));
      }
    },
    [isFocused, onChange]
  );

  const inputProps = {
    id,
    type: "text" as const,
    inputMode: "numeric" as const,
    required,
    value: displayValue,
    onChange: handleChange,
    onFocus: handleFocus,
    onBlur: handleBlur,
    placeholder,
  };

  return (
    <div>
      <label
        htmlFor={id}
        className="block text-xs font-medium text-foreground/70 mb-1"
      >
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {prefix ? (
        <div className="flex items-stretch overflow-hidden rounded-lg border border-foreground/20 bg-white focus-within:ring-2 focus-within:ring-accent/50">
          <span className="flex select-none items-center border-r border-foreground/20 bg-foreground/[0.06] px-3 text-sm text-foreground/60">
            {prefix}
          </span>
          <input
            {...inputProps}
            className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm text-foreground placeholder:text-foreground/40 focus:outline-none"
          />
        </div>
      ) : (
        <input
          {...inputProps}
          className="w-full rounded-lg border border-foreground/20 bg-white px-3 py-2 text-sm text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-accent/50"
        />
      )}
    </div>
  );
}
