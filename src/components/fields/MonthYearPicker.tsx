"use client";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

interface MonthYearPickerProps {
  month: string;
  year: number;
  onMonthChange: (month: string) => void;
  onYearChange: (year: number) => void;
  id: string;
  label?: string;
}

export function MonthYearPicker({
  month,
  year,
  onMonthChange,
  onYearChange,
  id,
  label = "Date",
}: MonthYearPickerProps) {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear + i);

  return (
    <div>
      <span className="block text-xs font-medium text-foreground/70 mb-1">
        {label}
      </span>
      <div className="grid grid-cols-2 gap-2">
        <select
          id={`${id}-month`}
          value={month}
          onChange={(e) => onMonthChange(e.target.value)}
          className="rounded-lg border border-foreground/20 bg-white px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
        >
          {MONTHS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <select
          id={`${id}-year`}
          value={year}
          onChange={(e) => onYearChange(Number(e.target.value))}
          className="rounded-lg border border-foreground/20 bg-white px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
