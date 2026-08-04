"use client";

interface TextInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  id: string;
  required?: boolean;
  placeholder?: string;
}

export function TextInput({
  label,
  value,
  onChange,
  id,
  required,
  placeholder,
}: TextInputProps) {
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
        required={required}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-foreground/20 bg-white px-3 py-2 text-sm text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-accent/50"
      />
    </div>
  );
}
