/**
 * 라이프스타일 인디케이터: 사주 오행 성향 + 설문 축점수를 결합해
 * "일, 관계, 생활 리듬, 성장 방향" 4가지 생활 방식을 0~100 점수로 시각화한다.
 */
export interface LifestyleIndicator {
  workStyle: number; // 높을수록 체계적·목표지향적 업무 방식
  relationshipStyle: number; // 높을수록 관계지향적·외향적 소통 방식
  lifeRhythm: number; // 높을수록 활동적·확장적인 생활 리듬
  growthDirection: number; // 높을수록 새로운 가능성을 탐색하는 성장 방향
}

export const INDICATOR_LABELS: Record<keyof LifestyleIndicator, string> = {
  workStyle: "일하는 방식",
  relationshipStyle: "관계 방식",
  lifeRhythm: "생활 리듬",
  growthDirection: "성장 방향",
};
