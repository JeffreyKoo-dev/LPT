/**
 * 한국 표준시(KST, UTC+9) 기준 날짜 헬퍼.
 *
 * 연·월 단위 상품(이번 달 운세, 신년운세)의 "이번 기간" 판정은 서버(Edge Function,
 * UTC)와 브라우저가 똑같이 해야 한다. 둘이 다른 시간대로 계산하면 1/1 0~9시(KST) 같은
 * 경계 시간에 서버는 아직 작년으로 판단해 결제 내역을 못 찾는 오류가 난다.
 *
 * 같은 로직이 supabase/functions/generate-premium-content/index.ts에도 있다.
 * 한쪽을 고치면 반드시 다른 쪽도 같이 고칠 것.
 */

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

export interface KstDate {
  year: number;
  month: number; // 1~12
  day: number;
}

export function getKstDate(now: Date = new Date()): KstDate {
  const k = new Date(now.getTime() + KST_OFFSET_MS);
  return { year: k.getUTCFullYear(), month: k.getUTCMonth() + 1, day: k.getUTCDate() };
}

/** KST 기준 "YYYY-MM" (이번 달 운세 콘텐츠의 유효 기간 키) */
export function getKstYearMonth(now: Date = new Date()): string {
  const { year, month } = getKstDate(now);
  return `${year}-${String(month).padStart(2, "0")}`;
}

/** KST 기준 이번 달 1일 00:00의 UTC 시각 */
export function getKstMonthStart(now: Date = new Date()): Date {
  const { year, month } = getKstDate(now);
  return new Date(Date.UTC(year, month - 1, 1) - KST_OFFSET_MS);
}

/**
 * 신년운세가 가리키는 대상 연도. 12월부터는 다음 해 운세를 판다(신년 시즌).
 * 예) 2026-11-30 → 2026, 2026-12-01 → 2027, 2027-06-15 → 2027
 */
export function getFortuneYear(now: Date = new Date()): number {
  const { year, month } = getKstDate(now);
  return month === 12 ? year + 1 : year;
}

/**
 * 대상 연도 Y의 구매가 인정되는 기간 [시작, 끝): (Y-1)년 12/1 00:00 KST ~ Y년 12/1 00:00 KST.
 * 이 기간에 결제한 신년운세는 Y년 운세 구매로 본다.
 */
export function getFortuneYearWindow(targetYear: number): { start: Date; end: Date } {
  return {
    start: new Date(Date.UTC(targetYear - 1, 11, 1) - KST_OFFSET_MS),
    end: new Date(Date.UTC(targetYear, 11, 1) - KST_OFFSET_MS),
  };
}
