import { BasicInfo } from "@/types/user";
import { AnalysisReport, ANALYSIS_SCHEMA_VERSION } from "@/types/report";
import { getStorage, STORAGE_KEYS } from "@/lib/storage";
import { calculateSaju } from "@/lib/saju";
import { computeAxisScores, loadSurveyState } from "@/lib/survey";
import { deriveLptType } from "@/lib/lpt";
import { pushAnonymousBirthStats } from "@/lib/supabase/sync";

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
    schemaVersion: ANALYSIS_SCHEMA_VERSION,
    sajuChart,
    surveyScores,
    lptType,
    computedAt: new Date().toISOString(),
  };

  getStorage().set(STORAGE_KEYS.analysis, report);
  // 동의한 경우에만, 계정과 무관하게 익명 통계 저장소로 결과를 보낸다.
  // 이 함수가 여러 번 호출될 수 있어 드물게 중복 행이 생길 수 있지만, 집계
  // 통계 용도라 큰 영향은 없다.
  pushAnonymousBirthStats(basicInfo, lptType.typeId);
  return report;
}

/**
 * 저장된 리포트를 불러온다. 배포 전 저장된 예전 버전 데이터(schemaVersion 불일치
 * 또는 누락)는 새 코드의 타입과 형태가 다를 수 있어 렌더링 중 예외를 일으킬 수
 * 있으므로, 여기서 걸러내고 무효(null) 처리한다 — 이 경우 호출부는 "리포트 없음"
 * 상태로 처리해 자동으로 재계산을 시도하거나 안내 화면으로 유도한다.
 */
export function loadAnalysisReport(): AnalysisReport | null {
  const report = getStorage().get<AnalysisReport>(STORAGE_KEYS.analysis);
  if (!report || report.schemaVersion !== ANALYSIS_SCHEMA_VERSION) {
    if (report) getStorage().remove(STORAGE_KEYS.analysis);
    return null;
  }
  return report;
}
