import { AxisScores } from "@/types/survey";
import { LifestyleIndicator } from "@/types/indicator";
import { SajuEnergyGroup } from "@/types/lpt";

/**
 * 사주 에너지 그룹 + 설문 축점수를 결합해 라이프스타일 인디케이터를 산출한다.
 * 모든 점수는 0~100이며 "경향"을 나타내는 참고 지표다.
 */
export function computeLifestyleIndicator(
  scores: AxisScores,
  energyGroup: SajuEnergyGroup
): LifestyleIndicator {
  const energyBoost: Record<SajuEnergyGroup, number> = {
    성장기: 15,
    균형기: 0,
    수렴기: -10,
  };
  const boost = energyBoost[energyGroup];

  const clamp = (n: number) => Math.min(100, Math.max(0, Math.round(n)));

  // 일하는 방식: 계획성(JP)과 논리적 실행(TF)을 결합
  const workStyle = clamp(scores.JP * 0.6 + scores.TF * 0.4);

  // 관계 방식: 외향성(EI)과 공감 지향(TF의 F 방향, 즉 100-TF)을 결합
  const relationshipStyle = clamp(scores.EI * 0.5 + (100 - scores.TF) * 0.5);

  // 생활 리듬: 외향성(EI)에 사주 에너지 그룹의 활동성 보정을 더함
  const lifeRhythm = clamp(scores.EI * 0.5 + (100 - scores.JP) * 0.2 + 50 * 0.3 + boost);

  // 성장 방향: 가능성 탐색 성향(SN의 N 방향)에 에너지 그룹 보정을 더함
  const growthDirection = clamp((100 - scores.SN) * 0.7 + 30 + boost * 0.5);

  return { workStyle, relationshipStyle, lifeRhythm, growthDirection };
}
