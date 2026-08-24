import { SajuChart } from "@/types/saju";
import { LptTypeResult } from "@/types/lpt";
import { AxisScores } from "@/types/survey";

/**
 * 저장된 분석 리포트의 데이터 구조 버전.
 * sajuChart, lptType 등 하위 타입의 "형태"가 바뀔 때마다 올린다 (필드 추가가 아니라
 * 기존 필드의 타입/구조가 바뀌는 경우 — 예: tenGods가 문자열에서 객체 구조로 변경).
 * 배포 후 예전 버전 데이터가 새 코드와 만나 렌더링 중 예외를 일으키는 것을 막기 위해
 * loadAnalysisReport()가 이 값을 확인해서 버전이 다르면 무효 처리한다.
 */
export const ANALYSIS_SCHEMA_VERSION = 2;

/**
 * 사주 계산 + 설문 점수 + LPT 유형 산출 결과를 하나로 묶은 분석 리포트.
 * LocalStorage(STORAGE_KEYS.analysis)에 저장되며, /result(Sprint 3)와
 * 성장 대시보드(Sprint 4)에서 함께 사용한다.
 */
export interface AnalysisReport {
  schemaVersion: number;
  sajuChart: SajuChart;
  surveyScores: AxisScores;
  lptType: LptTypeResult;
  computedAt: string; // ISO timestamp
}
