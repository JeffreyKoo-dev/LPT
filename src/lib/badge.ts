import { BADGES, getBadgeMeta } from "@/data/badges";
import { GrowthProfile } from "@/types/growth";
import { getStorage, STORAGE_KEYS } from "@/lib/storage";

export interface NewlyEarnedBadge {
  id: string;
  name: string;
  description: string;
}

type BadgeEarnedAtMap = Record<string, string>;

function loadBadgeEarnedAtMap(): BadgeEarnedAtMap {
  return getStorage().get<BadgeEarnedAtMap>(STORAGE_KEYS.badges) ?? {};
}

function saveBadgeEarnedAtMap(map: BadgeEarnedAtMap): void {
  getStorage().set(STORAGE_KEYS.badges, map);
}

/**
 * 아직 획득하지 않은 뱃지 중 조건을 만족하는 것을 찾아 프로필에 반영하고,
 * 획득 시각을 별도 LocalStorage 맵(STORAGE_KEYS.badges)에도 기록한다.
 */
export function checkAndAwardBadges(profile: GrowthProfile): {
  profile: GrowthProfile;
  newBadges: NewlyEarnedBadge[];
} {
  const newlyEarned: NewlyEarnedBadge[] = [];
  const earnedAtMap = loadBadgeEarnedAtMap();

  for (const badge of BADGES) {
    const alreadyHas = profile.badges.includes(badge.id);
    if (!alreadyHas && badge.condition(profile)) {
      newlyEarned.push({ id: badge.id, name: badge.name, description: badge.description });
      earnedAtMap[badge.id] = new Date().toISOString();
    }
  }

  if (newlyEarned.length === 0) {
    return { profile, newBadges: [] };
  }

  saveBadgeEarnedAtMap(earnedAtMap);

  const updatedProfile: GrowthProfile = {
    ...profile,
    badges: [...profile.badges, ...newlyEarned.map((b) => b.id)],
  };

  return { profile: updatedProfile, newBadges: newlyEarned };
}

export function getBadgeEarnedAt(badgeId: string): string | null {
  const map = loadBadgeEarnedAtMap();
  return map[badgeId] ?? null;
}

export { getBadgeMeta, BADGES };
