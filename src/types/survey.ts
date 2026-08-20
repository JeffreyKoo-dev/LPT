/**
 * 4개 성향 축. 공식 MBTI 문항을 그대로 쓰지 않는 자체 "16유형 성향 설문"(Life Pattern
 * Profiler) 문항 체계이며, 축 이름은 계산 로직 내부 표기로만 사용하고 사용자에게는
 * "에너지 방향/정보 인식/판단 기준/생활 방식" 같은 자체 라벨로 노출한다.
 */
export type SurveyAxis = "EI" | "SN" | "TF" | "JP";

export interface SurveyQuestion {
  id: number;
  axis: SurveyAxis;
  /** 문항 본문 (행동 패턴 시나리오 형태) */
  text: string;
  /** 5점 척도 왼쪽(전혀 그렇지 않다) 라벨 */
  leftLabel: string;
  /** 5점 척도 오른쪽(매우 그렇다) 라벨 */
  rightLabel: string;
  /**
   * value(1~5)가 높을수록 axis의 첫 글자(E/S/T/J) 방향에 가까우면 1,
   * 두 번째 글자(I/N/F/P) 방향에 가까우면 -1
   */
  direction: 1 | -1;
}

export interface SurveyAnswer {
  questionId: number;
  /** 1(전혀 그렇지 않다) ~ 5(매우 그렇다) */
  value: number;
}

export interface SurveyState {
  answers: SurveyAnswer[];
  currentIndex: number;
  startedAt: string;
  completedAt: string | null;
}

export const EMPTY_SURVEY_STATE: SurveyState = {
  answers: [],
  currentIndex: 0,
  startedAt: "",
  completedAt: null,
};

export const TOTAL_QUESTIONS = 36;

export interface AxisScores {
  EI: number; // 0~100, 높을수록 E(에너지 방향: 외부활동) 성향
  SN: number; // 높을수록 S(정보 인식: 현실/경험)
  TF: number; // 높을수록 T(판단 기준: 논리/기준)
  JP: number; // 높을수록 J(생활 방식: 계획/구조)
}

export type AxisLetterMap = {
  EI: "E" | "I";
  SN: "S" | "N";
  TF: "T" | "F";
  JP: "J" | "P";
};
