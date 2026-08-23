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
   * 진태양시(true solar time) 보정 적용 여부. 기본값 false(미적용).
   * 표준 경도(동경 135도)와 실제 출생지 경도의 차이만큼(대한민국 기준 최대 약 -32분)
   * 시간을 보정한다. 전통 만세력 다수가 기본적으로 적용하지 않는 방식과 동일하게
   * 기본은 꺼둔 채로, 원하는 사용자만 켤 수 있는 옵션으로 제공한다.
   */
  applyLocalMeanTime: boolean;
  createdAt: string; // ISO timestamp
}

export const EMPTY_BASIC_INFO: BasicInfo = {
  nickname: "",
  birthDate: "",
  birthTime: null,
  birthTimeUnknown: false,
  calendarType: "solar",
  gender: "male",
  applyLocalMeanTime: false,
  createdAt: "",
};
