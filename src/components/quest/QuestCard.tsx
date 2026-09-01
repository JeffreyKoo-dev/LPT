import Link from "next/link";
import { Quest } from "@/types/quest";
import { cn } from "@/lib/utils";

const CATEGORY_COLOR: Record<Quest["category"], string> = {
  몰입: "text-sky-700 border-sky-600/30 bg-sky-500/10",
  관계: "text-emerald-700 border-emerald-600/30 bg-emerald-500/10",
  루틴: "text-amber-700 border-amber-600/30 bg-amber-500/10",
  체력: "text-rose-700 border-rose-600/30 bg-rose-500/10",
};

interface QuestCardProps {
  quest: Quest;
  completed: boolean;
  recommended?: boolean;
}

export function QuestCard({ quest, completed, recommended }: QuestCardProps) {
  return (
    <Link
      href={`/quests/${quest.id}`}
      className={cn(
        "block rounded-2xl border bg-surface/80 p-5 transition-colors",
        completed ? "border-border/60 opacity-60" : "border-border hover:border-fate/50"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className={cn("rounded-full border px-2.5 py-0.5 text-xs", CATEGORY_COLOR[quest.category])}>
          {quest.category}
        </span>
        {completed ? (
          <span className="text-xs text-muted">완료됨</span>
        ) : recommended ? (
          <span className="text-xs text-growth">추천</span>
        ) : null}
      </div>
      <h3 className="mt-3 font-display text-base font-semibold tracking-tight text-foreground">{quest.title}</h3>
      <p className="mt-1.5 text-sm text-muted">{quest.description}</p>
      <div className="mt-3 flex gap-3 text-xs text-muted">
        <span className="font-numeral text-growth">+{quest.xpReward} XP</span>
        <span>
          +{quest.statReward} {quest.focusStat}
        </span>
      </div>
    </Link>
  );
}
