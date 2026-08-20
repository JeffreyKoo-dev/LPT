"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface TextFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string;
}

export const TextField = React.forwardRef<HTMLInputElement, TextFieldProps>(
  ({ label, hint, error, id, className, ...props }, ref) => {
    const inputId = id ?? props.name;
    return (
      <div className="w-full">
        <label htmlFor={inputId} className="mb-2 block text-sm font-medium text-foreground">
          {label}
        </label>
        <input
          ref={ref}
          id={inputId}
          className={cn(
            "h-12 w-full rounded-xl border border-border bg-surface-2 px-4 text-sm text-foreground placeholder:text-muted",
            "outline-none transition-colors focus:border-fate",
            error && "border-red-400/70",
            className
          )}
          aria-invalid={!!error}
          aria-describedby={hint ? `${inputId}-hint` : undefined}
          {...props}
        />
        {hint && !error && (
          <p id={`${inputId}-hint`} className="mt-1.5 text-xs text-muted">
            {hint}
          </p>
        )}
        {error && <p className="mt-1.5 text-xs text-red-400">{error}</p>}
      </div>
    );
  }
);
TextField.displayName = "TextField";
