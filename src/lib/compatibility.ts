import { Element, SajuChart } from "@/types/saju";
import { BehaviorQuadrant, LptTypeId } from "@/types/lpt";
import { LPT_TYPES } from "@/data/lptTypes";
import {
  getQuadrantRelation,
  QUADRANT_RELATION_DESC,
  QuadrantRelationType,
  ALL_QUADRANTS,
} from "@/data/quadrantRelations";

/**
 * 오행 상생(생하는 관계) 순환. 상생 관계는 두 일간이 서로 힘을 보태는 쪽으로
 * 해석해 "관계 적합도"에 긍정적으로 반영한다.
 */
const GENERATES: Record<Element, Element> = {
  wood: "fire",
  fire: "earth",
  earth: "metal",
  metal: "water",
  water: "wood",
};

/** 오행 상극(억누르는 관계) 순환. 조율이 더 필요한 조합으로 해석한다. */
const CONTROLS: Record<Element, Element> = {
  wood: "earth",
  earth: "water",
  water: "fire",
  fire: "metal",
  metal: "wood",
};

export type DayMasterRelation = "상생" | "비화" | "상극";

function getDayMasterRelation(elA: Element, elB: Element): DayMasterRelation {
  if (elA === elB) return "비화";
  if (GENERATES[elA] === elB || GENERATES[elB] === elA) return "상생";
  if (CONTROLS[elA] === elB || CONTROLS[elB] === elA) return "상극";
  return "비화";
}

const DAY_MASTER_RELATION_DESC: Record<DayMasterRelation, { title: string; desc: string }> = {
  상생: {
    title: "서로 힘을 보태는 기운",
    desc: "두 사람의 타고난 기질이 서로를 자연스럽게 북돋아주는 관계일 수 있어요.",
  },
  비화: {
    title: "같은 결의 기운",
    desc: "기질의 결이 비슷해 편안하게 느껴질 수 있어요. 취향이나 속도가 잘 맞는 경우가 많아요.",
  },
  상극: {
    title: "서로 다른 방향의 기운",
    desc: "기질이 뚜렷하게 달라 처음엔 부딪히는 지점이 있을 수 있지만, 그만큼 서로에게 없는 부분을 배울 수도 있어요.",
  },
};

export interface CompatibilityResult {
  /** 0~100, 참고용 지표일 뿐 절대적인 점수가 아니다 */
  score: number;
  dayMasterRelation: DayMasterRelation;
  quadrantRelation: QuadrantRelationType | null;
  headline: string;
  description: string;
  synergyPoints: string[];
  cautionPoints: string[];
}

/**
 * 두 사람의 사주(오행)를 기반으로 관계 적합도를 계산한다.
 * 행동 스타일(quadrant)은 상대방이 LPT 설문까지 마친 경우에만 선택적으로 반영한다.
 * 표현 원칙: "궁합"이 아닌 "관계 적합도"로 지칭하고, 결과는 항상 경향·가능성으로
 * 표현한다. 점수는 참고용 지표이며 관계의 좋고 나쁨을 단정하지 않는다.
 */
export function computeCompatibility(
  chartA: SajuChart,
  chartB: SajuChart,
  quadrantA?: BehaviorQuadrant,
  quadrantB?: BehaviorQuadrant
): CompatibilityResult {
  const dayMasterRelation = getDayMasterRelation(chartA.dayMaster.element, chartB.dayMaster.element);

  // 오행 보완: 한쪽에 없는 오행을 상대가 채워주는 정도
  const elements: Element[] = ["wood", "fire", "earth", "metal", "water"];
  let complementBonus = 0;
  for (const el of elements) {
    const aHas = chartA.elementCounts[el] > 0;
    const bHas = chartB.elementCounts[el] > 0;
    if (!aHas && bHas) complementBonus += 3;
    if (!bHas && aHas) complementBonus += 3;
  }
  complementBonus = Math.min(complementBonus, 15);

  const baseScore: Record<DayMasterRelation, number> = { 상생: 78, 비화: 68, 상극: 58 };
  let score = baseScore[dayMasterRelation] + complementBonus;

  const quadrantRelation =
    quadrantA && quadrantB ? getQuadrantRelation(quadrantA, quadrantB) : null;
  if (quadrantRelation) {
    const quadrantBonus: Record<QuadrantRelationType, number> = { 보완형: 8, 동형: 3, 대각형: 0 };
    score += quadrantBonus[quadrantRelation];
  }
  score = Math.min(96, Math.max(40, Math.round(score)));

  const dmDesc = DAY_MASTER_RELATION_DESC[dayMasterRelation];
  const synergyPoints: string[] = [];
  const cautionPoints: string[] = [];

  if (dayMasterRelation === "상생") {
    synergyPoints.push("서로의 기운을 자연스럽게 북돋아주는 관계일 수 있어요");
  } else if (dayMasterRelation === "비화") {
    synergyPoints.push("취향이나 생활 속도가 비슷해 편안하게 느껴질 수 있어요");
    cautionPoints.push("같은 지점에서 함께 지칠 수 있으니 가끔은 다른 방식도 시도해보세요");
  } else {
    cautionPoints.push("기질이 달라 서로의 방식을 이해하는 데 시간이 필요할 수 있어요");
  }

  if (complementBonus > 0) {
    synergyPoints.push("서로에게 없는 기운을 채워주는 조합이라, 함께 있을 때 균형이 맞을 수 있어요");
  }

  if (quadrantRelation) {
    const qDesc = QUADRANT_RELATION_DESC[quadrantRelation];
    if (quadrantRelation === "보완형") synergyPoints.push(qDesc.desc);
    else if (quadrantRelation === "대각형") cautionPoints.push(qDesc.desc);
  }

  // 어떤 조합이든 최소 하나의 긍정적 포인트는 남긴다 (단정적으로 "안 맞음"만
  // 전달하지 않는다는 표현 원칙)
  if (synergyPoints.length === 0) {
    synergyPoints.push("다른 점이 많은 만큼, 서로에게 없는 새로운 자극과 배움을 주고받을 수 있어요");
  }

  return {
    score,
    dayMasterRelation,
    quadrantRelation,
    headline: dmDesc.title,
    description: dmDesc.desc,
    synergyPoints,
    cautionPoints,
  };
}

export interface RelatedTypeGroup {
  relation: QuadrantRelationType;
  quadrant: BehaviorQuadrant;
  typeNames: string[];
}

/**
 * 특정 행동 스타일과 "보완형"·"대각형" 관계에 있는 LPT 유형 이름들을 모아,
 * /result 페이지에서 지인 없이도 참고할 수 있는 정적 유형 궁합 안내에 사용한다.
 */
export function getRelatedTypes(quadrant: BehaviorQuadrant): RelatedTypeGroup[] {
  return ALL_QUADRANTS.filter((q) => q !== quadrant).map((q) => {
    const relation = getQuadrantRelation(quadrant, q);
    const typeNames = LPT_TYPES.filter((t) => t.quadrant === q).map((t) => t.name);
    return { relation, quadrant: q, typeNames };
  });
}

export function getTypeIdList(): LptTypeId[] {
  return LPT_TYPES.map((t) => t.id);
}

/**
 * 유형 ID만으로(원본 사주 없이) 계산하는 간이 관계 적합도.
 * 서버에는 사주 원본이 아니라 계산된 LPT 유형만 저장되므로(개인정보 정책),
 * 친구 목록에서의 궁합은 두 사람의 행동 스타일(quadrant)·에너지 그룹만으로
 * 계산한다. `/compatibility`의 오행 기반 정밀 계산보다는 근사치다.
 */
export interface TypeCompatibilityResult {
  score: number;
  quadrantRelation: QuadrantRelationType;
  sameEnergyGroup: boolean;
  headline: string;
  description: string;
}

export function computeTypeCompatibility(
  typeIdA: LptTypeId,
  typeIdB: LptTypeId
): TypeCompatibilityResult | null {
  const metaA = LPT_TYPES.find((t) => t.id === typeIdA);
  const metaB = LPT_TYPES.find((t) => t.id === typeIdB);
  if (!metaA || !metaB) return null;

  const quadrantRelation = getQuadrantRelation(metaA.quadrant, metaB.quadrant);
  const sameEnergyGroup = metaA.energyGroup === metaB.energyGroup;

  const quadrantScore: Record<QuadrantRelationType, number> = { 보완형: 80, 동형: 68, 대각형: 60 };
  const score = Math.min(96, quadrantScore[quadrantRelation] + (sameEnergyGroup ? 0 : 8));

  const qDesc = QUADRANT_RELATION_DESC[quadrantRelation];

  return {
    score,
    quadrantRelation,
    sameEnergyGroup,
    headline: qDesc.title,
    description: sameEnergyGroup
      ? `${qDesc.desc} 에너지 결도 비슷해 생활 리듬이 잘 맞을 수 있어요.`
      : `${qDesc.desc} 에너지 결이 달라 서로 다른 자극을 줄 수 있어요.`,
  };
}
