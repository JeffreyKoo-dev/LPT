"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, id, className, ...props }, ref) => {
    const inputId = id ?? props.name;
    return (
      <label htmlFor={inputId} className="flex cursor-pointer items-center gap-2 text-sm text-muted">
        <input
          ref={ref}
          id={inputId}
          type="checkbox"
          className={cn(
            "h-4 w-4 rounded border-border bg-surface-2 accent-fate",
            className
          )}
          {...props}
        />
        {label}
      </label>
    );
  }
);
Checkbox.displayName = "Checkbox";
