import { EMPTY_SURVEY_STATE, SurveyAnswer, SurveyState, TOTAL_QUESTIONS } from "@/types/survey";
import { getStorage, STORAGE_KEYS } from "@/lib/storage";

/**
 * 설문 진행/저장 로직 (Sprint 1 범위: 응답 저장·진행률만 담당).
 * 축별 점수 계산과 LPT 유형 산출은 lib/survey.ts의 스코어링 함수와
 * lib/lpt.ts에서 Sprint 2에 구현한다.
 */

export function loadSurveyState(): SurveyState {
  const state = getStorage().get<SurveyState>(STORAGE_KEYS.survey);
  return state ?? { ...EMPTY_SURVEY_STATE, startedAt: new Date().toISOString() };
}

export function saveSurveyState(state: SurveyState): void {
  getStorage().set(STORAGE_KEYS.survey, state);
}

export function upsertAnswer(state: SurveyState, answer: SurveyAnswer): SurveyState {
  const existingIndex = state.answers.findIndex((a) => a.questionId === answer.questionId);
  const nextAnswers = [...state.answers];
  if (existingIndex >= 0) {
    nextAnswers[existingIndex] = answer;
  } else {
    nextAnswers.push(answer);
  }
  return { ...state, answers: nextAnswers };
}

export function getAnswerFor(state: SurveyState, questionId: number): number | null {
  return state.answers.find((a) => a.questionId === questionId)?.value ?? null;
}

export function getProgress(state: SurveyState): number {
  return Math.round((state.answers.length / TOTAL_QUESTIONS) * 100);
}

export function isSurveyComplete(state: SurveyState): boolean {
  return state.answers.length >= TOTAL_QUESTIONS;
}

export function markCompleted(state: SurveyState): SurveyState {
  return { ...state, completedAt: new Date().toISOString() };
}

export function resetSurvey(): void {
  getStorage().remove(STORAGE_KEYS.survey);
}

// ── Sprint 2: 설문 점수 계산 ──────────────────────────────────────────

import { QUESTIONS } from "@/data/questions";
import { AxisLetterMap, AxisScores, SurveyAxis } from "@/types/survey";

export type { AxisScores, AxisLetterMap };

const AXES: SurveyAxis[] = ["EI", "SN", "TF", "JP"];

/**
 * 문항별 direction을 반영해 응답을 "축의 첫 글자(E/S/T/J) 방향" 기준으로 정규화한 뒤
 * 0~100 점수로 환산한다. 축당 9문항(1~5점) → 원점수 9~45 → 0~100으로 스케일링.
 */
export function computeAxisScores(answers: SurveyAnswer[]): AxisScores {
  const scores = {} as AxisScores;

  for (const axis of AXES) {
    const axisQuestions = QUESTIONS.filter((q) => q.axis === axis);
    let sum = 0;
    let answeredCount = 0;

    for (const question of axisQuestions) {
      const answer = answers.find((a) => a.questionId === question.id);
      if (!answer) continue;
      const oriented = question.direction === 1 ? answer.value : 6 - answer.value;
      sum += oriented;
      answeredCount += 1;
    }

    if (answeredCount === 0) {
      scores[axis] = 50;
      continue;
    }

    const min = answeredCount * 1;
    const max = answeredCount * 5;
    const normalized = max === min ? 50 : ((sum - min) / (max - min)) * 100;
    scores[axis] = Math.round(normalized);
  }

  return scores;
}

/** 각 축 점수(0~100)를 대표 글자로 변환한다. 50 이상이면 축의 첫 글자. */
export function getAxisLetters(scores: AxisScores): AxisLetterMap {
  return {
    EI: scores.EI >= 50 ? "E" : "I",
    SN: scores.SN >= 50 ? "S" : "N",
    TF: scores.TF >= 50 ? "T" : "F",
    JP: scores.JP >= 50 ? "J" : "P",
  };
}

/** 내부 참고용 4글자 성향 코드 (사용자에게는 노출하지 않고 유형 산출 로직에서만 사용) */
export function getSurveyTypeCode(scores: AxisScores): string {
  const letters = getAxisLetters(scores);
  return `${letters.EI}${letters.SN}${letters.TF}${letters.JP}`;
}
