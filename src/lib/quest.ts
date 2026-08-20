import { QUESTS, getQuestById } from "@/data/quests";
import { Quest } from "@/types/quest";
import { GrowthProfile } from "@/types/growth";
import { FantasyClassMeta } from "@/types/lpt";
import { applyReward, saveGrowthProfile } from "@/lib/growth";
import { checkAndAwardBadges, NewlyEarnedBadge } from "@/lib/badge";

export function isQuestCompleted(profile: GrowthProfile, questId: string): boolean {
  return profile.questLog.some((entry) => entry.questId === questId);
}

/**
 * 캐릭터의 대표 스탯(primaryStat)과 focusStat이 일치하는 퀘스트를 우선 추천하고,
 * 그 다음으로 universal 퀘스트, 나머지 순으로 정렬한다. 이미 완료한 퀘스트는 뒤로 보낸다.
 */
export function getRecommendedQuests(
  fantasyClass: FantasyClassMeta,
  profile: GrowthProfile
): Quest[] {
  const score = (quest: Quest) => {
    let s = 0;
    if (quest.focusStat === fantasyClass.primaryStat) s += 2;
    if (quest.universal) s += 1;
    if (isQuestCompleted(profile, quest.id)) s -= 10;
    return s;
  };

  return [...QUESTS].sort((a, b) => score(b) - score(a));
}

export interface CompleteQuestResult {
  profile: GrowthProfile;
  quest: Quest;
  leveledUp: boolean;
  newLevel: number;
  newBadges: NewlyEarnedBadge[];
}

/**
 * 퀘스트 완료 처리: XP/스탯 보상 적용 → 퀘스트 로그 기록 → 뱃지 조건 확인 →
 * 최종 프로필을 LocalStorage에 저장한다.
 */
export function completeQuest(profile: GrowthProfile, questId: string): CompleteQuestResult | null {
  const quest = getQuestById(questId);
  if (!quest) return null;
  if (isQuestCompleted(profile, questId)) return null;

  const { profile: rewarded, leveledUp, newLevel } = applyReward(
    profile,
    quest.xpReward,
    quest.focusStat,
    quest.statReward
  );

  const withLog: GrowthProfile = {
    ...rewarded,
    questLog: [...rewarded.questLog, { questId, completedAt: new Date().toISOString() }],
  };

  const { profile: finalProfile, newBadges } = checkAndAwardBadges(withLog);

  saveGrowthProfile(finalProfile);

  return { profile: finalProfile, quest, leveledUp, newLevel, newBadges };
}
