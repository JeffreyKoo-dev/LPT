import { GrowthEvent, GrowthProfile } from "@/types/growth";
import { getQuestById } from "@/data/quests";
import { getLevelProgress } from "@/lib/growth";
import { getBadgeMeta } from "@/data/badges";
import { getBadgeEarnedAt } from "@/lib/badge";

/**
 * 별도의 이력 저장소 없이, 이미 저장된 questLog(시간 포함)와 badges 획득 시각을
 * 재조합해 성장 히스토리 타임라인을 만든다. 퀘스트를 시간순으로 재생하며
 * 누적 XP가 레벨 경계를 넘는 시점에 레벨업 이벤트를 함께 삽입한다.
 */
export function buildGrowthHistory(profile: GrowthProfile): GrowthEvent[] {
  const events: GrowthEvent[] = [];

  const sortedLog = [...profile.questLog].sort(
    (a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime()
  );

  let runningXp = 0;
  let previousLevel = getLevelProgress(0).level;

  for (const entry of sortedLog) {
    const quest = getQuestById(entry.questId);
    if (!quest) continue;

    events.push({
      type: "quest",
      timestamp: entry.completedAt,
      title: quest.title,
      description: `+${quest.xpReward} XP, ${quest.focusStat} +${quest.statReward}`,
    });

    runningXp += quest.xpReward;
    const newLevel = getLevelProgress(runningXp).level;
    if (newLevel > previousLevel) {
      events.push({
        type: "levelup",
        timestamp: entry.completedAt,
        title: `레벨 업! Lv.${newLevel}`,
        description: `누적 경험치 ${runningXp} XP를 달성했어요.`,
      });
      previousLevel = newLevel;
    }
  }

  for (const badgeId of profile.badges) {
    const meta = getBadgeMeta(badgeId);
    const earnedAt = getBadgeEarnedAt(badgeId);
    if (!meta || !earnedAt) continue;
    events.push({
      type: "badge",
      timestamp: earnedAt,
      title: `뱃지 획득: ${meta.name}`,
      description: meta.description,
    });
  }

  return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}
