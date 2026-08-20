"use client";

import { cn } from "@/lib/utils";

interface Option<T extends string> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  label: string;
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
}

export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  return (
    <div className="w-full">
      <span className="mb-2 block text-sm font-medium text-foreground">{label}</span>
      <div
        role="radiogroup"
        aria-label={label}
        className="grid grid-cols-2 gap-2 rounded-xl border border-border bg-surface-2 p-1 sm:inline-flex"
      >
        {options.map((option) => {
          const active = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(option.value)}
              className={cn(
                "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                active ? "bg-fate text-white" : "text-muted hover:text-foreground"
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
