export type CalendarType = "solar" | "lunar";
export type Gender = "male" | "female";

/**
 * /start 페이지에서 수집하는 기본 정보.
 * 사주 계산(lib/saju.ts, Sprint2)의 입력값으로 사용된다.
 */
export interface BasicInfo {
  nickname: string;
  birthDate: string; // "YYYY-MM-DD"
  birthTime: string | null; // "HH:mm", 모를 경우 null
  birthTimeUnknown: boolean;
  calendarType: CalendarType;
  gender: Gender;
  /**
   * 진태양시(true solar time) 보정 적용 여부. 기본값 true(적용).
   * 표준 경도(동경 135도)와 실제 출생지 경도의 차이만큼(대한민국 기준 최대 약 -32분)
   * 시간을 보정한다. 원광만세력 등 주요 만세력과 대조 검증한 결과 이 보정을 적용해야
   * 일치하는 것을 확인해 기본값을 켜진 상태로 변경했다 (원치 않는 사용자는 끌 수 있음).
   */
  applyLocalMeanTime: boolean;
  /**
   * 익명 통계 저장 동의 여부. 기본값 false(미동의, 옵트인 방식).
   * 동의한 경우에만 계정과 전혀 연결되지 않는 별도 테이블(birth_stats)에
   * 생년월일시·성별·계산된 유형만 저장한다 — docs/PHASE2_ROADMAP.md 3절 참고.
   */
  consentToAnonymousStats: boolean;
  createdAt: string; // ISO timestamp
}

export const EMPTY_BASIC_INFO: BasicInfo = {
  nickname: "",
  birthDate: "",
  birthTime: null,
  birthTimeUnknown: false,
  calendarType: "solar",
  gender: "male",
  applyLocalMeanTime: true,
  consentToAnonymousStats: false,
  createdAt: "",
};
