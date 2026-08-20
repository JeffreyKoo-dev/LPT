import { LptTypeId } from "@/types/lpt";

export type StatKey = "활력" | "통찰" | "조율" | "지구력";

export type GrowthStats = Record<StatKey, number>;

export interface QuestLogEntry {
  questId: string;
  completedAt: string;
}

/**
 * 사용자의 성장 프로필. XP/레벨/스탯/퀘스트 이력/획득 뱃지를 담는다.
 * LocalStorage(STORAGE_KEYS.growthProfile)에 저장된다.
 */
export interface GrowthProfile {
  typeId: LptTypeId;
  xp: number; // 누적 경험치
  stats: GrowthStats;
  questLog: QuestLogEntry[];
  badges: string[]; // 획득한 BadgeId 목록
  createdAt: string;
  updatedAt: string;
}

export const BASE_STAT_VALUE = 10;

export function createEmptyStats(): GrowthStats {
  return { 활력: BASE_STAT_VALUE, 통찰: BASE_STAT_VALUE, 조율: BASE_STAT_VALUE, 지구력: BASE_STAT_VALUE };
}

/** 성장 히스토리(타임라인)에 표시되는 이벤트 종류 */
export type GrowthEventType = "quest" | "levelup" | "badge";

export interface GrowthEvent {
  type: GrowthEventType;
  timestamp: string;
  title: string;
  description: string;
}
