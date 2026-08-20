import { Element, SajuChart } from "@/types/saju";
import { BehaviorQuadrant, LptTypeId, LptTypeResult, SajuEnergyGroup } from "@/types/lpt";
import { AxisScores } from "@/types/survey";
import { getAxisLetters, getSurveyTypeCode } from "@/lib/survey";

/**
 * 사주 오행 분포를 3가지 에너지 그룹으로 단순화한다.
 *   - 목/화(木火): 확장·활동 에너지 → "성장기"
 *   - 토(土): 중심·조율 에너지 → "균형기"
 *   - 금/수(金水): 수렴·내실 에너지 → "수렴기"
 */
function getSajuEnergyGroup(dominantElement: Element): SajuEnergyGroup {
  if (dominantElement === "wood" || dominantElement === "fire") return "성장기";
  if (dominantElement === "earth") return "균형기";
  return "수렴기"; // metal | water
}

/**
 * 설문의 에너지 방향(EI) × 생활 방식(JP) 두 축을 결합해 4가지 행동 스타일을 산출한다.
 * (SN/TF 두 축은 보조 지표로 리포트에 함께 노출된다 — Sprint 3)
 */
function getBehaviorQuadrant(scores: AxisScores): BehaviorQuadrant {
  const letters = getAxisLetters(scores);
  if (letters.EI === "E" && letters.JP === "J") return "추진형";
  if (letters.EI === "E" && letters.JP === "P") return "확장형";
  if (letters.EI === "I" && letters.JP === "J") return "설계형";
  return "탐색형"; // I + P
}

const TYPE_MATRIX: Record<BehaviorQuadrant, Record<SajuEnergyGroup, LptTypeId>> = {
  추진형: { 성장기: "VANGUARD", 균형기: "COMMANDER", 수렴기: "STRATEGIST" },
  확장형: { 성장기: "ADVENTURER", 균형기: "BARD", 수렴기: "SHADOW_MERCHANT" },
  설계형: { 성장기: "INVENTOR", 균형기: "ARCHITECT", 수렴기: "SAGE" },
  탐색형: { 성장기: "EXPLORER", 균형기: "HEALER", 수렴기: "HERMIT" },
};

/**
 * 사주 챠트 + 설문 축점수를 결합해 LPT 12유형 중 하나를 산출한다.
 */
export function deriveLptType(sajuChart: SajuChart, surveyScores: AxisScores): LptTypeResult {
  const energyGroup = getSajuEnergyGroup(sajuChart.dominantElement);
  const quadrant = getBehaviorQuadrant(surveyScores);
  const typeId = TYPE_MATRIX[quadrant][energyGroup];

  return {
    typeId,
    quadrant,
    energyGroup,
    dominantElement: sajuChart.dominantElement,
    surveyTypeCode: getSurveyTypeCode(surveyScores),
  };
}
