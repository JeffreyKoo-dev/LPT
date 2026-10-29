// 웹 푸시 캠페인 정의. 발송 대상 판정에 필요한 값(상품·기간·중복 방지 키·문구)을 한곳에 모은다.
// 크론 라우트(api/cron/monthly-reminder)가 `?campaign=<id>`로 이 정의를 불러 쓴다.
// 순수 함수라 날짜를 바꿔 가며 단위 테스트하기 쉽다.

import { getFortuneYear, getFortuneYearWindow, getKstDate, getKstMonthStart } from "@/lib/kst";

export type PushCampaignId = "monthly_fortune" | "newyear_open" | "newyear_prep" | "newyear_day";

export const PUSH_CAMPAIGN_IDS: PushCampaignId[] = ["monthly_fortune", "newyear_open", "newyear_prep", "newyear_day"];

export interface PushCampaign {
  id: PushCampaignId;
  /** "이미 구매했는지"를 판단하는 상품 코드 */
  productCode: "monthly_fortune" | "yearly_fortune";
  /** 이 시각 이후(포함)의 결제만 구매로 인정 */
  purchasedSince: Date;
  /** 이 시각 이전(미포함)의 결제만 구매로 인정. 없으면 제한 없음 */
  purchasedBefore?: Date;
  /** push_reminder_log.reminder_type. 신년 캠페인은 연도를 붙여 해마다 한 번씩 발송된다 */
  logType: string;
  /** 중복 발송 확인 시작 시각. 없으면 전체 기간(한 번만 발송하는 캠페인) */
  dedupeSince?: Date;
  payload: { title: string; body: string; url: string };
}

interface NewYearSpec {
  /** 발송을 허용하는 KST 월/일 범위 — 잘못된 날 크론이 돌아도 보내지 않기 위한 안전장치 */
  month: number;
  dayFrom: number;
  dayTo: number;
  title: string;
  body: (year: number) => string;
}

const NEWYEAR_SPECS: Record<Exclude<PushCampaignId, "monthly_fortune">, NewYearSpec> = {
  newyear_open: {
    month: 12,
    dayFrom: 1,
    dayTo: 7,
    title: "신년운세가 열렸어요",
    body: (y) => `${y}년의 흐름을 총운, 상·하반기, 월별로 풀어드려요. 새해를 앞두고 미리 살펴보세요.`,
  },
  newyear_prep: {
    month: 12,
    dayFrom: 28,
    dayTo: 31,
    title: "새해 맞이, 신년운세 챙겨보셨나요?",
    body: (y) => `${y}년 한 해를 어디에 마음 쓰면 좋을지 참고해 볼 수 있어요.`,
  },
  newyear_day: {
    month: 1,
    dayFrom: 1,
    dayTo: 3,
    title: "새해 복 많이 받으세요",
    body: (y) => `${y}년의 첫 흐름을 신년운세로 가볍게 열어보세요.`,
  },
};

/** 지금(KST) 보낼 수 있는 캠페인이면 정의를, 아니면(날짜 범위 밖) null을 돌려준다. */
export function getPushCampaign(id: PushCampaignId, now: Date = new Date()): PushCampaign | null {
  if (id === "monthly_fortune") {
    return {
      id,
      productCode: "monthly_fortune",
      purchasedSince: getKstMonthStart(now),
      logType: "monthly_fortune",
      dedupeSince: getKstMonthStart(now),
      payload: {
        title: "이번 달 운세, 아직 안 보셨네요",
        body: "매달 새로 바뀌는 흐름이라, 지난달과는 또 다른 이야기가 기다리고 있을 수 있어요.",
        url: "/result",
      },
    };
  }

  const spec = NEWYEAR_SPECS[id];
  if (!spec) return null;
  const { month, day } = getKstDate(now);
  if (month !== spec.month || day < spec.dayFrom || day > spec.dayTo) return null;

  const year = getFortuneYear(now);
  const { start, end } = getFortuneYearWindow(year);
  return {
    id,
    productCode: "yearly_fortune",
    purchasedSince: start,
    purchasedBefore: end,
    logType: `${id}_${year}`,
    payload: { title: spec.title, body: spec.body(year), url: "/result" },
  };
}

export function isPushCampaignId(value: string | null): value is PushCampaignId {
  return value !== null && (PUSH_CAMPAIGN_IDS as string[]).includes(value);
}
