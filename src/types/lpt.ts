import { Element } from "@/types/saju";

/**
 * 설문 2개 축(에너지 방향 EI × 생활 방식 JP)을 결합한 4가지 행동 스타일.
 * 나머지 두 축(SN, TF)은 결과 리포트의 보조 지표로 사용한다 (Sprint 3).
 */
export type BehaviorQuadrant = "추진형" | "확장형" | "설계형" | "탐색형";

/** 사주 오행 분포를 3그룹으로 묶은 에너지 성향 */
export type SajuEnergyGroup = "성장기" | "균형기" | "수렴기";

/** LPT 12유형 식별자 */
export type LptTypeId =
  | "VANGUARD" // 추진형 x 성장기
  | "COMMANDER" // 추진형 x 균형기
  | "STRATEGIST" // 추진형 x 수렴기
  | "ADVENTURER" // 확장형 x 성장기
  | "BARD" // 확장형 x 균형기
  | "SHADOW_MERCHANT" // 확장형 x 수렴기
  | "INVENTOR" // 설계형 x 성장기
  | "ARCHITECT" // 설계형 x 균형기
  | "SAGE" // 설계형 x 수렴기
  | "EXPLORER" // 탐색형 x 성장기
  | "HEALER" // 탐색형 x 균형기
  | "HERMIT"; // 탐색형 x 수렴기

export interface LptTypeMeta {
  id: LptTypeId;
  name: string; // 판타지 게임/웹툰 스타일 명칭
  quadrant: BehaviorQuadrant;
  energyGroup: SajuEnergyGroup;
  tagline: string; // 한 줄 요약 (경향/가능성 톤)
  description: string; // 상세 설명 (경향/가능성 톤)
  strengths: string[];
  growthPoints: string[]; // "약점"이 아닌 "성장 포인트"로 표현
}

export interface FantasyClassMeta {
  typeId: LptTypeId;
  className: string; // 판타지 클래스명
  role: string; // 역할군 (예: 근접 딜러, 서포터 등 세계관 표현)
  primaryStat: "활력" | "통찰" | "조율" | "지구력"; // 캐릭터 카드 대표 스탯
  accentElement: Element;
}

export interface LptTypeResult {
  typeId: LptTypeId;
  quadrant: BehaviorQuadrant;
  energyGroup: SajuEnergyGroup;
  dominantElement: Element;
  surveyTypeCode: string; // 내부 참고용 (EI/SN/TF/JP 4글자)
}
