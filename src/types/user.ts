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
  createdAt: string; // ISO timestamp
}

export const EMPTY_BASIC_INFO: BasicInfo = {
  nickname: "",
  birthDate: "",
  birthTime: null,
  birthTimeUnknown: false,
  calendarType: "solar",
  gender: "male",
  createdAt: "",
};
