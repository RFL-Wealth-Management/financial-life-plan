"use client";

interface NumberInputProps {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  id: string;
  required?: boolean;
  placeholder?: string;
  min?: number;
  max?: number;
  suffix?: string;
}

export function NumberInput({
  label,
  value,
  onChange,
  id,
  required,
  placeholder = "0",
  min,
  max,
  suffix,
}: NumberInputProps) {
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-xs font-medium text-foreground/70 mb-1"
      >
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <div className="relative">
        <input
          id={id}
          type="number"
          required={required}
          value={value ?? ""}
          onChange={(e) =>
            onChange(e.target.value === "" ? null : Number(e.target.value))
          }
          placeholder={placeholder}
          min={min}
          max={max}
          className="w-full rounded-lg border border-foreground/20 bg-white px-3 py-2 text-sm text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-accent/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-foreground/40 pointer-events-none">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}
