import { Element } from "@/types/saju";
import { LptTypeId } from "@/types/lpt";
import { Quest } from "@/types/quest";
import { DAILY_LUNCH } from "@/data/dailyLunch";
import { SHOPPING_ITEMS, ShoppingItem } from "@/data/shoppingItems";
import { getDayOfYear } from "@/data/dailyTips";
import { GrowthProfile } from "@/types/growth";
import { isQuestCompleted, getRecommendedQuests } from "@/lib/quest";
import { computeTypeCompatibility } from "@/lib/compatibility";
import { Friend } from "@/lib/friends";
import { FantasyClassMeta } from "@/types/lpt";

/** 오늘 날짜 + 오행을 시드로 오늘의 점심 문구를 결정론적으로 고른다 */
export function getDailyLunch(element: Element, date: Date = new Date()): string {
  const pool = DAILY_LUNCH[element];
  return pool[getDayOfYear(date) % pool.length];
}

/** 오늘 날짜 + 오행을 시드로 오늘의 추천 아이템을 결정론적으로 고른다 */
export function getDailyShoppingItem(element: Element, date: Date = new Date()): ShoppingItem {
  const pool = SHOPPING_ITEMS.filter((item) => item.element === element);
  const fallback = SHOPPING_ITEMS;
  const list = pool.length > 0 ? pool : fallback;
  return list[getDayOfYear(date) % list.length];
}

/**
 * 아직 완료하지 않은 퀘스트 중, 캐릭터의 대표 스탯과 맞는 것을 우선으로
 * 오늘의 추천 퀘스트 하나를 결정론적으로 고른다. 전부 완료했다면 null.
 */
export function getDailyQuest(
  fantasyClass: FantasyClassMeta,
  profile: GrowthProfile,
  date: Date = new Date()
): Quest | null {
  const candidates = getRecommendedQuests(fantasyClass, profile).filter(
    (q) => !isQuestCompleted(profile, q.id)
  );
  if (candidates.length === 0) return null;
  return candidates[getDayOfYear(date) % candidates.length];
}

export interface DailyFriendSuggestion {
  friend: Friend;
  headline: string;
}

/**
 * 친구 목록 중 관계 적합도가 가장 높은 사람을 "오늘 만나면 좋을 사람"으로
 * 추천한다. 동점이면 날짜를 시드로 순환시켜 매번 같은 사람만 나오지 않게 한다.
 */
export function getDailyFriendSuggestion(
  friends: Friend[],
  myTypeId: LptTypeId,
  date: Date = new Date()
): DailyFriendSuggestion | null {
  const withScores = friends
    .filter((f) => !!f.lptTypeId)
    .map((f) => ({
      friend: f,
      compat: computeTypeCompatibility(myTypeId, f.lptTypeId as LptTypeId),
    }))
    .filter((entry): entry is { friend: Friend; compat: NonNullable<typeof entry.compat> } => !!entry.compat)
    .sort((a, b) => b.compat.score - a.compat.score);

  if (withScores.length === 0) return null;

  const topScore = withScores[0].compat.score;
  const topTier = withScores.filter((e) => e.compat.score === topScore);
  const picked = topTier[getDayOfYear(date) % topTier.length];

  return { friend: picked.friend, headline: picked.compat.headline };
}
