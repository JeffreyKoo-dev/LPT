"use client";

import { cn } from "@/lib/utils";

interface LikertScaleProps {
  value: number | null;
  onChange: (value: number) => void;
  leftLabel: string;
  rightLabel: string;
}

const POINTS = [1, 2, 3, 4, 5];

export function LikertScale({ value, onChange, leftLabel, rightLabel }: LikertScaleProps) {
  return (
    <div>
      <div
        role="radiogroup"
        aria-label="응답 척도"
        className="flex items-center justify-between gap-2 sm:gap-3"
      >
        {POINTS.map((point) => {
          const active = value === point;
          return (
            <button
              key={point}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(point)}
              className={cn(
                "flex h-12 flex-1 items-center justify-center rounded-lg border text-base font-numeral font-medium transition-colors",
                active
                  ? "border-fate bg-fate text-white"
                  : "border-border bg-surface-2 text-muted hover:border-fate/50 hover:text-foreground"
              )}
            >
              {point}
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex justify-between text-xs text-muted">
        <span>{leftLabel}</span>
        <span>{rightLabel}</span>
      </div>
    </div>
  );
}
