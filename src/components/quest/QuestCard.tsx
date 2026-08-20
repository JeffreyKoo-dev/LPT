import Link from "next/link";
import { Quest } from "@/types/quest";
import { cn } from "@/lib/utils";

const CATEGORY_COLOR: Record<Quest["category"], string> = {
  몰입: "text-sky-400 border-sky-400/30 bg-sky-400/10",
  관계: "text-emerald-400 border-emerald-400/30 bg-emerald-400/10",
  루틴: "text-amber-400 border-amber-400/30 bg-amber-400/10",
  체력: "text-rose-400 border-rose-400/30 bg-rose-400/10",
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
