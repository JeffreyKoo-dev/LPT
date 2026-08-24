import { LEVEL_THRESHOLDS, MAX_LEVEL } from "@/data/levels";
import { createEmptyStats, GrowthProfile, StatKey } from "@/types/growth";
import { LptTypeId } from "@/types/lpt";
import { getStorage, STORAGE_KEYS } from "@/lib/storage";
import { pushGrowthProfileToCloud } from "@/lib/supabase/sync";

export interface LevelProgress {
  level: number;
  xp: number;
  currentLevelBaseXp: number;
  xpForNextLevel: number | null; // null이면 만렙
  progressPercent: number; // 현재 레벨 안에서의 진행률 (0~100)
  isMaxLevel: boolean;
}

/** 누적 경험치로부터 현재 레벨과 다음 레벨까지의 진행률을 계산한다. */
export function getLevelProgress(xp: number): LevelProgress {
  let level = 1;
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i]) {
      level = i + 1;
      break;
    }
  }

  const isMaxLevel = level >= MAX_LEVEL;
  const currentLevelBaseXp = LEVEL_THRESHOLDS[level - 1];
  const xpForNextLevel = isMaxLevel ? null : LEVEL_THRESHOLDS[level];

  const progressPercent = isMaxLevel
    ? 100
    : Math.round(
        ((xp - currentLevelBaseXp) / (xpForNextLevel! - currentLevelBaseXp)) * 100
      );

  return { level, xp, currentLevelBaseXp, xpForNextLevel, progressPercent, isMaxLevel };
}

export function createInitialGrowthProfile(typeId: LptTypeId): GrowthProfile {
  const now = new Date().toISOString();
  return {
    typeId,
    xp: 0,
    stats: createEmptyStats(),
    questLog: [],
    badges: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function loadGrowthProfile(typeId: LptTypeId): GrowthProfile {
  const existing = getStorage().get<GrowthProfile>(STORAGE_KEYS.growthProfile);
  if (existing) return existing;
  const created = createInitialGrowthProfile(typeId);
  saveGrowthProfile(created);
  return created;
}

export function saveGrowthProfile(profile: GrowthProfile): void {
  const updated = { ...profile, updatedAt: new Date().toISOString() };
  getStorage().set(STORAGE_KEYS.growthProfile, updated);
  pushGrowthProfileToCloud(updated); // 로그인 상태가 아니면 내부에서 조용히 무시됨
}

export interface ApplyRewardResult {
  profile: GrowthProfile;
  leveledUp: boolean;
  previousLevel: number;
  newLevel: number;
}

/** XP와 스탯 보상을 프로필에 적용하고, 레벨업 여부를 함께 반환한다. */
export function applyReward(
  profile: GrowthProfile,
  xpReward: number,
  statKey: StatKey,
  statReward: number
): ApplyRewardResult {
  const previousLevel = getLevelProgress(profile.xp).level;
  const nextXp = profile.xp + xpReward;
  const newLevel = getLevelProgress(nextXp).level;

  const updated: GrowthProfile = {
    ...profile,
    xp: nextXp,
    stats: { ...profile.stats, [statKey]: profile.stats[statKey] + statReward },
  };

  return {
    profile: updated,
    leveledUp: newLevel > previousLevel,
    previousLevel,
    newLevel,
  };
}
