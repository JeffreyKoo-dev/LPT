import { cn } from "@/lib/utils";

interface ProgressBarProps {
  value: number; // 0~100
  className?: string;
  label?: string;
  colorClassName?: string;
}

export function ProgressBar({
  value,
  className,
  label,
  colorClassName = "bg-fate",
}: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div className={cn("w-full", className)}>
      {label && (
        <div className="mb-1.5 flex items-center justify-between text-xs text-muted">
          <span>{label}</span>
          <span className="font-numeral text-foreground">{Math.round(clamped)}%</span>
        </div>
      )}
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-surface-2"
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={cn("h-full rounded-full transition-all duration-500 ease-out", colorClassName)}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
