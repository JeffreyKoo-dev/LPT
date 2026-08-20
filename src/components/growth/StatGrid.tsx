import { cn } from "@/lib/utils";
import { GrowthStats, StatKey } from "@/types/growth";

const STAT_ORDER: StatKey[] = ["활력", "통찰", "조율", "지구력"];

interface StatGridProps {
  stats: GrowthStats;
  highlightStat?: StatKey;
}

export function StatGrid({ stats, highlightStat }: StatGridProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {STAT_ORDER.map((key) => {
        const highlighted = highlightStat === key;
        return (
          <div
            key={key}
            className={cn(
              "rounded-lg border px-4 py-3 text-center",
              highlighted ? "border-growth/50 bg-growth-soft" : "border-border bg-surface-2"
            )}
          >
            <p className={cn("text-xs", highlighted ? "text-growth" : "text-muted")}>{key}</p>
            <p
              className={cn(
                "mt-1 font-numeral text-2xl font-semibold",
                highlighted ? "text-growth" : "text-foreground"
              )}
            >
              {stats[key]}
            </p>
          </div>
        );
      })}
    </div>
  );
}
