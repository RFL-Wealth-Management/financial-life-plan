"use client";

import { useState, useCallback } from "react";

interface CurrencyInputProps {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  id: string;
  required?: boolean;
  placeholder?: string;
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents);
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
}: CurrencyInputProps) {
  const [displayValue, setDisplayValue] = useState(
    value != null ? formatCurrency(value) : ""
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
    setDisplayValue(parsed != null ? formatCurrency(parsed) : "");
  }, [displayValue, onChange]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      if (isFocused) {
        setDisplayValue(raw.replace(/[^0-9]/g, ""));
      }
    },
    [isFocused]
  );

  return (
    <div>
      <label
        htmlFor={id}
        className="block text-xs font-medium text-foreground/70 mb-1"
      >
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        required={required}
        value={displayValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        className="w-full rounded-lg border border-foreground/20 bg-white px-3 py-2 text-sm text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-accent/50"
      />
    </div>
  );
}
