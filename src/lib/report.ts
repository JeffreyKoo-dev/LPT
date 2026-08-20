import { BasicInfo } from "@/types/user";
import { AnalysisReport } from "@/types/report";
import { getStorage, STORAGE_KEYS } from "@/lib/storage";
import { calculateSaju } from "@/lib/saju";
import { computeAxisScores, loadSurveyState } from "@/lib/survey";
import { deriveLptType } from "@/lib/lpt";

/**
 * 기본 정보 + 설문 응답을 기반으로 전체 분석(사주 → 설문 점수 → LPT 유형)을
 * 실행하고 결과를 LocalStorage(STORAGE_KEYS.analysis)에 저장한다.
 * /result(Sprint 3), 성장 대시보드(Sprint 4)에서 이 저장된 리포트를 읽어 사용한다.
 */
export function generateAndSaveAnalysisReport(basicInfo: BasicInfo): AnalysisReport {
  const surveyState = loadSurveyState();
  const surveyScores = computeAxisScores(surveyState.answers);
  const sajuChart = calculateSaju(basicInfo);
  const lptType = deriveLptType(sajuChart, surveyScores);

  const report: AnalysisReport = {
    sajuChart,
    surveyScores,
    lptType,
    computedAt: new Date().toISOString(),
  };

  getStorage().set(STORAGE_KEYS.analysis, report);
  return report;
}

export function loadAnalysisReport(): AnalysisReport | null {
  return getStorage().get<AnalysisReport>(STORAGE_KEYS.analysis);
}
