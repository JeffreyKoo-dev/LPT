import { SajuChart } from "@/types/saju";
import { LptTypeResult } from "@/types/lpt";
import { AxisScores } from "@/types/survey";

/**
 * 사주 계산 + 설문 점수 + LPT 유형 산출 결과를 하나로 묶은 분석 리포트.
 * LocalStorage(STORAGE_KEYS.analysis)에 저장되며, /result(Sprint 3)와
 * 성장 대시보드(Sprint 4)에서 함께 사용한다.
 */
export interface AnalysisReport {
  sajuChart: SajuChart;
  surveyScores: AxisScores;
  lptType: LptTypeResult;
  computedAt: string; // ISO timestamp
}
