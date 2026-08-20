import { BehaviorQuadrant } from "@/types/lpt";
import { DAILY_TIPS, getDayOfYear } from "@/data/dailyTips";

export interface DailyCard {
  dateLabel: string; // "8월 19일"
  message: string;
}

/**
 * 행동 스타일(quadrant)과 오늘 날짜를 시드로 팁 문구를 하나 결정론적으로 뽑는다.
 * 같은 날 다시 방문해도 같은 문구가 노출된다.
 */
export function getDailyCard(quadrant: BehaviorQuadrant, date: Date = new Date()): DailyCard {
  const pool = DAILY_TIPS[quadrant];
  const dayOfYear = getDayOfYear(date);
  const index = dayOfYear % pool.length;

  return {
    dateLabel: `${date.getMonth() + 1}월 ${date.getDate()}일`,
    message: pool[index],
  };
}
