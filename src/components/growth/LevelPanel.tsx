import { ProgressBar } from "@/components/common/ProgressBar";
import { LevelProgress } from "@/lib/growth";

interface LevelPanelProps {
  levelProgress: LevelProgress;
}

export function LevelPanel({ levelProgress }: LevelPanelProps) {
  return (
    <div className="flex items-center gap-4">
      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-growth/40 bg-growth-soft">
        <span className="font-numeral text-xl text-growth">Lv.{levelProgress.level}</span>
      </div>
      <div className="flex-1">
        <ProgressBar
          value={levelProgress.progressPercent}
          colorClassName="bg-growth"
          label={
            levelProgress.isMaxLevel
              ? "현재 만렙"
              : `다음 레벨까지 ${levelProgress.xpForNextLevel! - levelProgress.xp} XP`
          }
        />
      </div>
    </div>
  );
}
