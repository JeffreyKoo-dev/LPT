import { BadgeMeta } from "@/types/badge";
import { getLevelProgress } from "@/lib/growth";

/**
 * 뱃지 획득 조건 목록. 퀘스트 완료 시(lib/quest.ts) 매번 전체 목록을 검사해
 * 아직 획득하지 않은 뱃지 중 조건을 만족하는 것을 자동으로 지급한다.
 */
export const BADGES: BadgeMeta[] = [
  {
    id: "first-quest",
    name: "첫 발걸음",
    description: "첫 번째 성장 퀘스트를 완료했어요.",
    condition: (profile) => profile.questLog.length >= 1,
  },
  {
    id: "quest-5",
    name: "꾸준한 모험가",
    description: "성장 퀘스트를 5개 완료했어요.",
    condition: (profile) => profile.questLog.length >= 5,
  },
  {
    id: "quest-10",
    name: "퀘스트 마스터",
    description: "성장 퀘스트를 10개 완료했어요.",
    condition: (profile) => profile.questLog.length >= 10,
  },
  {
    id: "level-3",
    name: "성장의 시작",
    description: "캐릭터 레벨 3에 도달했어요.",
    condition: (profile) => getLevelProgress(profile.xp).level >= 3,
  },
  {
    id: "level-5",
    name: "안정 궤도",
    description: "캐릭터 레벨 5에 도달했어요.",
    condition: (profile) => getLevelProgress(profile.xp).level >= 5,
  },
  {
    id: "level-max",
    name: "정점의 캐릭터",
    description: "현재 만렙(레벨 10)에 도달했어요.",
    condition: (profile) => getLevelProgress(profile.xp).isMaxLevel,
  },
  {
    id: "balanced-stats",
    name: "균형 잡힌 성장",
    description: "4개 스탯이 모두 20 이상으로 고르게 성장했어요.",
    condition: (profile) => Object.values(profile.stats).every((v) => v >= 20),
  },
  {
    id: "specialist-stat",
    name: "특화된 강점",
    description: "한 가지 스탯이 40 이상으로 크게 성장했어요.",
    condition: (profile) => Object.values(profile.stats).some((v) => v >= 40),
  },
];

export function getBadgeMeta(id: string): BadgeMeta | undefined {
  return BADGES.find((b) => b.id === id);
}
