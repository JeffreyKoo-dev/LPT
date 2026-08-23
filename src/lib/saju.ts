/**
 * 사주 계산 모듈.
 *
 * 이전 버전(MVP 초기)은 연주 경계를 입춘 근사 날짜로, 월주는 절기 없이 달력 월로,
 * 일주는 검증되지 않은 율리우스일 공식으로 계산하는 간략 구현이었다. 이 방식은
 * 실제 절입시각(절기가 바뀌는 정확한 시각)을 반영하지 못해 원광만세력 등 검증된
 * 만세력과 다른 결과가 나올 수 있었다.
 *
 * 현재는 한국천문연구원(KASI) 음력 데이터와 절입시각(분 단위) 기반으로 계산하는
 * "ssaju" 라이브러리(MIT, 의존성 0개)로 대체해 연/월/일주 경계를 정확히 계산한다.
 * 다음 두 가지 보정도 추가로 반영한다.
 *
 *   1. 대한민국 표준시 변경 이력 보정 — 아래 두 기간은 현재의 동경 135도(UTC+9) 대신
 *      동경 127도30분(UTC+8:30)을 표준시로 사용했다. ssaju는 입력된 시/분을 그대로
 *      UTC+9 기준으로 해석하므로, 이 기간에 해당하면 +30분을 보정해 UTC+9 기준
 *      시각으로 환산한 뒤 계산한다.
 *        - 1908-04-01 ~ 1911-12-31
 *        - 1954-03-21 ~ 1961-08-09
 *   2. 진태양시(실제 태양 위치 기준 시간) 보정 — 사용자가 선택한 경우에만 적용한다
 *      (BasicInfo.applyLocalMeanTime). 대한민국 대표 경도(서울, 126.9784)를 기준으로
 *      ssaju의 applyLocalMeanTime 옵션에 위임한다. 출생지별 정확한 경도까지는
 *      반영하지 않는 근사치다.
 *
 * 남아있는 한계:
 *   - 1948~1988년 사이 간헐적으로 시행된 서머타임(일광절약시간)은 반영하지 않음
 *   - 진태양시 보정은 서울 경도 기준 근사치이며, 출생지별 정확한 경도는 반영하지 않음
 *   - 음력 입력 시 윤달 여부는 항상 평달로 간주 (윤달 입력 UI 미제공)
 */

import { calculateSaju as ssajuCalculateSaju, lunarToSolar } from "ssaju";
import { BasicInfo } from "@/types/user";
import { Element, EarthlyBranch, HeavenlyStem, Pillar, SajuChart, TenGod } from "@/types/saju";

const SEOUL_LONGITUDE = 126.9784;

/** 대한민국이 동경 127도30분(UTC+8:30)을 표준시로 사용했던 기간의 시작/끝 (양력, 포함) */
const HISTORICAL_OFFSET_RANGES: { start: [number, number, number]; end: [number, number, number] }[] = [
  { start: [1908, 4, 1], end: [1911, 12, 31] },
  { start: [1954, 3, 21], end: [1961, 8, 9] },
];

function isWithinRange(y: number, m: number, d: number, start: [number, number, number], end: [number, number, number]): boolean {
  const t = Date.UTC(y, m - 1, d);
  const s = Date.UTC(start[0], start[1] - 1, start[2]);
  const e = Date.UTC(end[0], end[1] - 1, end[2]);
  return t >= s && t <= e;
}

/** 해당 양력 날짜가 UTC+8:30 표준시 기간에 속하면 보정에 필요한 분(+30)을 반환한다 */
function getHistoricalOffsetMinutes(solarYear: number, solarMonth: number, solarDay: number): number {
  const inHistoricalRange = HISTORICAL_OFFSET_RANGES.some((range) =>
    isWithinRange(solarYear, solarMonth, solarDay, range.start, range.end)
  );
  return inHistoricalRange ? 30 : 0;
}

interface CivilDateTime {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

/** 분 단위 보정을 적용하고 자정을 넘는 경우 날짜까지 함께 이월한다 */
function addMinutes(dt: CivilDateTime, minutes: number): CivilDateTime {
  if (minutes === 0) return dt;
  const base = new Date(Date.UTC(dt.year, dt.month - 1, dt.day, dt.hour, dt.minute));
  base.setUTCMinutes(base.getUTCMinutes() + minutes);
  return {
    year: base.getUTCFullYear(),
    month: base.getUTCMonth() + 1,
    day: base.getUTCDate(),
    hour: base.getUTCHours(),
    minute: base.getUTCMinutes(),
  };
}

const ELEMENT_KO_TO_EN: Record<string, Element> = {
  목: "wood",
  화: "fire",
  토: "earth",
  금: "metal",
  수: "water",
};

const YINYANG_KO_TO_EN: Record<string, "yin" | "yang"> = {
  양: "yang",
  음: "yin",
};

interface SsajuPillarDetail {
  stem: string;
  branch: string;
  stemKo: string;
  branchKo: string;
  stemIdx: number;
  branchIdx: number;
  element: { stem: string; branch: string };
  yinYang: { stem: string; branch: string };
}

function toHeavenlyStem(detail: SsajuPillarDetail): HeavenlyStem {
  return {
    index: detail.stemIdx,
    char: detail.stem,
    hangul: detail.stemKo,
    element: ELEMENT_KO_TO_EN[detail.element.stem],
    yinYang: YINYANG_KO_TO_EN[detail.yinYang.stem],
  };
}

function toEarthlyBranch(detail: SsajuPillarDetail): EarthlyBranch {
  return {
    index: detail.branchIdx,
    char: detail.branch,
    hangul: detail.branchKo,
    element: ELEMENT_KO_TO_EN[detail.element.branch],
    yinYang: YINYANG_KO_TO_EN[detail.yinYang.branch],
  };
}

function toPillar(detail: SsajuPillarDetail): Pillar {
  return { stem: toHeavenlyStem(detail), branch: toEarthlyBranch(detail) };
}

/**
 * 기본 정보(BasicInfo)로부터 사주 챠트를 계산한다.
 * 음력 입력은 먼저 양력으로 변환한 뒤(역사적 표준시 보정 판단을 위해), 보정된
 * 시각을 ssaju에 전달한다.
 */
export function calculateSaju(basicInfo: BasicInfo): SajuChart {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(basicInfo.birthDate)) {
    throw new Error(`calculateSaju: 올바르지 않은 생년월일 형식입니다 (${basicInfo.birthDate})`);
  }

  const [yStr, mStr, dStr] = basicInfo.birthDate.split("-");
  const inputYear = Number(yStr);
  const inputMonth = Number(mStr);
  const inputDay = Number(dStr);

  if (inputMonth < 1 || inputMonth > 12 || inputDay < 1 || inputDay > 31) {
    throw new Error(`calculateSaju: 유효 범위를 벗어난 날짜입니다 (${basicInfo.birthDate})`);
  }

  const hasTime = !basicInfo.birthTimeUnknown && !!basicInfo.birthTime;
  let hour = 12;
  let minute = 0;
  if (hasTime) {
    const [hh, mm] = basicInfo.birthTime!.split(":");
    hour = Number(hh);
    minute = Number(mm);
  }

  // 1) 입력이 음력이면 먼저 양력으로 변환 (역사적 표준시 보정 판단에 실제 양력 날짜가 필요)
  const solar =
    basicInfo.calendarType === "lunar"
      ? lunarToSolar(inputYear, inputMonth, inputDay, false)
      : { year: inputYear, month: inputMonth, day: inputDay };

  // 2) 역사적 표준시(UTC+8:30) 기간이면 +30분 보정
  const historicalOffset = getHistoricalOffsetMinutes(solar.year, solar.month, solar.day);
  const corrected = addMinutes(
    { year: solar.year, month: solar.month, day: solar.day, hour, minute },
    historicalOffset
  );

  const result = ssajuCalculateSaju({
    year: corrected.year,
    month: corrected.month,
    day: corrected.day,
    hour: corrected.hour,
    minute: corrected.minute,
    gender: basicInfo.gender === "male" ? "남" : "여",
    calendar: "solar", // 이미 양력으로 변환·보정했으므로 항상 solar로 전달
    timezone: "Asia/Seoul",
    applyLocalMeanTime: basicInfo.applyLocalMeanTime,
    longitude: basicInfo.applyLocalMeanTime ? SEOUL_LONGITUDE : undefined,
  });

  const yearPillar = toPillar(result.pillarDetails.year);
  const monthPillar = toPillar(result.pillarDetails.month);
  const dayPillar = toPillar(result.pillarDetails.day);
  const hourPillar = hasTime ? toPillar(result.pillarDetails.hour) : null;

  const elementCounts: Record<Element, number> = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 };
  for (const [ko, count] of Object.entries(result.fiveElements)) {
    const en = ELEMENT_KO_TO_EN[ko];
    if (en) elementCounts[en] = count;
  }

  // 출생시간을 모르는 경우, ssaju는 정오(12시) 기준 시주까지 포함해 오행을 집계하므로
  // 실제로는 존재하지 않는 시주의 오행 성분을 제외해 6글자(년+월+일) 기준으로 맞춘다.
  if (!hasTime) {
    const hourDetail = result.pillarDetails.hour;
    const stemEl = ELEMENT_KO_TO_EN[hourDetail.element.stem];
    const branchEl = ELEMENT_KO_TO_EN[hourDetail.element.branch];
    elementCounts[stemEl] -= 1;
    elementCounts[branchEl] -= 1;
  }

  const dominantElement = (Object.entries(elementCounts) as [Element, number][]).sort(
    (a, b) => b[1] - a[1]
  )[0][0];

  return {
    year: yearPillar,
    month: monthPillar,
    day: dayPillar,
    hour: hourPillar,
    dayMaster: dayPillar.stem,
    elementCounts,
    dominantElement,
    tenGods: {
      year: { stem: result.tenGods.year.stem as TenGod, branch: result.tenGods.year.branch as TenGod },
      month: { stem: result.tenGods.month.stem as TenGod, branch: result.tenGods.month.branch as TenGod },
      day: { branch: result.tenGods.day.branch as TenGod },
      hour: hasTime
        ? { stem: result.tenGods.hour.stem as TenGod, branch: result.tenGods.hour.branch as TenGod }
        : null,
    },
  };
}
