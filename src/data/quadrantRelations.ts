import { BehaviorQuadrant } from "@/types/lpt";

/**
 * 행동 스타일 4분면(EI × JP) 사이의 관계.
 * 같은 축(E 또는 I, J 또는 P)을 하나 공유하면 "보완형"(서로 다르지만 통하는 지점이
 * 있음), 두 축이 모두 다르면 "대각형"(가장 다른 조합이라 매력적일 수도, 마찰이
 * 있을 수도 있음), 같은 분면이면 "동형"(편하지만 비슷한 성향이 겹칠 수 있음)으로
 * 분류한다. 궁합의 좋고 나쁨을 판정하는 게 아니라 "관계의 결이 어떻게 다른지"를
 * 설명하는 참고 정보로만 사용한다.
 */
export type QuadrantRelationType = "동형" | "보완형" | "대각형";

const ADJACENT_PAIRS: [BehaviorQuadrant, BehaviorQuadrant][] = [
  ["추진형", "확장형"], // E 공유
  ["추진형", "설계형"], // J 공유
  ["확장형", "탐색형"], // P 공유
  ["설계형", "탐색형"], // I 공유
];

const DIAGONAL_PAIRS: [BehaviorQuadrant, BehaviorQuadrant][] = [
  ["추진형", "탐색형"],
  ["확장형", "설계형"],
];

export function getQuadrantRelation(a: BehaviorQuadrant, b: BehaviorQuadrant): QuadrantRelationType {
  if (a === b) return "동형";
  const isAdjacent = ADJACENT_PAIRS.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
  if (isAdjacent) return "보완형";
  const isDiagonal = DIAGONAL_PAIRS.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
  if (isDiagonal) return "대각형";
  return "동형";
}

export const QUADRANT_RELATION_DESC: Record<QuadrantRelationType, { title: string; desc: string }> = {
  동형: {
    title: "비슷한 리듬",
    desc: "행동 방식이 비슷해서 편하게 느껴질 수 있어요. 다만 같은 지점에서 함께 막힐 수도 있어요.",
  },
  보완형: {
    title: "서로 채워주는 조합",
    desc: "다른 듯하면서도 통하는 부분이 있어, 서로의 빈틈을 자연스럽게 채워줄 수 있는 조합이에요.",
  },
  대각형: {
    title: "가장 다른 방식",
    desc: "행동 방식이 크게 달라 신선하게 느껴질 수 있지만, 서로를 이해하는 데 시간이 조금 더 필요할 수 있어요.",
  },
};

/** 4분면 사이의 인접 관계 목록 (탐색형↔모든 유형 등, UI에서 순회용) */
export const ALL_QUADRANTS: BehaviorQuadrant[] = ["추진형", "확장형", "설계형", "탐색형"];
