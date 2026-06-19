"use client";

interface SelectInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  id: string;
  options: { label: string; value: string }[];
  required?: boolean;
  placeholder?: string;
}

export function SelectInput({
  label,
  value,
  onChange,
  id,
  options,
  required,
  placeholder,
}: SelectInputProps) {
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-xs font-medium text-foreground/70 mb-1"
      >
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full rounded-lg border border-foreground/20 bg-white px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
