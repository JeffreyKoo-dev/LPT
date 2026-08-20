import { FantasyClassMeta } from "@/types/lpt";

/**
 * LPT 12유형 → 판타지 클래스 매핑.
 * 캐릭터 카드(Sprint 3)와 성장 스탯(Sprint 4)에서 사용할 세계관 표현을 담당한다.
 */
export const FANTASY_CLASSES: FantasyClassMeta[] = [
  { typeId: "VANGUARD", className: "선봉 전사", role: "돌파형 전위", primaryStat: "활력", accentElement: "fire" },
  { typeId: "COMMANDER", className: "군단 지휘관", role: "통솔형 전위", primaryStat: "조율", accentElement: "fire" },
  { typeId: "STRATEGIST", className: "전략 참모", role: "판단형 서포터", primaryStat: "통찰", accentElement: "metal" },
  { typeId: "ADVENTURER", className: "길잡이 모험가", role: "정찰형 유격대", primaryStat: "활력", accentElement: "wood" },
  { typeId: "BARD", className: "여정의 음유시인", role: "지원형 서포터", primaryStat: "조율", accentElement: "wood" },
  { typeId: "SHADOW_MERCHANT", className: "그림자 상인", role: "협상형 유격대", primaryStat: "통찰", accentElement: "metal" },
  { typeId: "INVENTOR", className: "마법 공학자", role: "생산형 서포터", primaryStat: "통찰", accentElement: "fire" },
  { typeId: "ARCHITECT", className: "결계 건축가", role: "구조형 서포터", primaryStat: "지구력", accentElement: "earth" },
  { typeId: "SAGE", className: "고서의 현자", role: "통찰형 서포터", primaryStat: "통찰", accentElement: "water" },
  { typeId: "EXPLORER", className: "야생 탐험가", role: "정찰형 유격대", primaryStat: "활력", accentElement: "wood" },
  { typeId: "HEALER", className: "샘물의 치유사", role: "회복형 서포터", primaryStat: "조율", accentElement: "water" },
  { typeId: "HERMIT", className: "은둔의 학자", role: "통찰형 서포터", primaryStat: "지구력", accentElement: "water" },
];

export function getFantasyClass(typeId: string): FantasyClassMeta | undefined {
  return FANTASY_CLASSES.find((c) => c.typeId === typeId);
}
