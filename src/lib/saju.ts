// MVP NOTICE:
// This saju calculation is a simplified implementation.
// Solar term timestamps and day-pillar offset must be validated
// against an authoritative Korean manse calendar before production use.
//
// 아래 구현은 다음과 같은 근사치를 사용한다.
//   - 연주(年柱) 경계: data/solarTerms.ts의 입춘 근사 날짜(양력 2/4)만 사용
//   - 월주(月柱) 지지: 절기 대신 달력상 월(1~12월)을 그대로 인월(1월)부터 순환 배정
//   - 일주(日柱): 그레고리력 → 율리우스일(JDN) 변환 후 60갑자 순환식 적용
//   - 십성: 지지·지장간은 생략하고 천간(년/월/시)만 계산
// 정식 서비스 전환 전 검증된 만세력 데이터로 교체해야 한다.

import { BasicInfo } from "@/types/user";
import { Element, EarthlyBranch, HeavenlyStem, Pillar, SajuChart, TenGod } from "@/types/saju";
import { IPCHUN_APPROX } from "@/data/solarTerms";

const STEMS: Omit<HeavenlyStem, "index">[] = [
  { char: "甲", hangul: "갑", element: "wood", yinYang: "yang" },
  { char: "乙", hangul: "을", element: "wood", yinYang: "yin" },
  { char: "丙", hangul: "병", element: "fire", yinYang: "yang" },
  { char: "丁", hangul: "정", element: "fire", yinYang: "yin" },
  { char: "戊", hangul: "무", element: "earth", yinYang: "yang" },
  { char: "己", hangul: "기", element: "earth", yinYang: "yin" },
  { char: "庚", hangul: "경", element: "metal", yinYang: "yang" },
  { char: "辛", hangul: "신", element: "metal", yinYang: "yin" },
  { char: "壬", hangul: "임", element: "water", yinYang: "yang" },
  { char: "癸", hangul: "계", element: "water", yinYang: "yin" },
];

const BRANCHES: Omit<EarthlyBranch, "index">[] = [
  { char: "子", hangul: "자", element: "water", yinYang: "yang" },
  { char: "丑", hangul: "축", element: "earth", yinYang: "yin" },
  { char: "寅", hangul: "인", element: "wood", yinYang: "yang" },
  { char: "卯", hangul: "묘", element: "wood", yinYang: "yin" },
  { char: "辰", hangul: "진", element: "earth", yinYang: "yang" },
  { char: "巳", hangul: "사", element: "fire", yinYang: "yin" },
  { char: "午", hangul: "오", element: "fire", yinYang: "yang" },
  { char: "未", hangul: "미", element: "earth", yinYang: "yin" },
  { char: "申", hangul: "신", element: "metal", yinYang: "yang" },
  { char: "酉", hangul: "유", element: "metal", yinYang: "yin" },
  { char: "戌", hangul: "술", element: "earth", yinYang: "yang" },
  { char: "亥", hangul: "해", element: "water", yinYang: "yin" },
];

function stemAt(index: number): HeavenlyStem {
  const i = ((index % 10) + 10) % 10;
  return { index: i, ...STEMS[i] };
}

function branchAt(index: number): EarthlyBranch {
  const i = ((index % 12) + 12) % 12;
  return { index: i, ...BRANCHES[i] };
}

/** 그레고리력 날짜 → 율리우스일(JDN), 정오 기준 표준 변환 공식 */
function toJulianDayNumber(year: number, month: number, day: number): number {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return (
    day +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045
  );
}

/** "입춘(2/4)" 이전 출생이면 사주상 전년도로 취급 (근사치) */
function getSajuYear(dateStr: string): number {
  const [yStr, mStr, dStr] = dateStr.split("-");
  const year = Number(yStr);
  const mmdd = `${mStr}-${dStr}`;
  return mmdd < IPCHUN_APPROX ? year - 1 : year;
}

function getYearPillar(sajuYear: number): Pillar {
  // 서기 4년(4 AD) = 갑자(甲子)년이라는 통용 근사식을 사용
  const stemIndex = (sajuYear - 4) % 10;
  const branchIndex = (sajuYear - 4) % 12;
  return { stem: stemAt(stemIndex), branch: branchAt(branchIndex) };
}

// 오호둔(五虎遁): 연간(年干)에 따라 인월(寅月)의 월간이 결정된다.
const WOHODUN_START_STEM: Record<number, number> = {
  0: 2, // 갑 → 병인월
  5: 2, // 기 → 병인월
  1: 4, // 을 → 무인월
  6: 4, // 경 → 무인월
  2: 6, // 병 → 경인월
  7: 6, // 신 → 경인월
  3: 8, // 정 → 임인월
  8: 8, // 임 → 임인월
  4: 0, // 무 → 갑인월
  9: 0, // 계 → 갑인월
};

function getMonthPillar(sajuYearStemIndex: number, calendarMonth: number): Pillar {
  // 인월(寅, branch index 2)을 1월로 보고 달력 월을 그대로 순환 배정 (절기 미반영 근사)
  const monthOrder = (calendarMonth - 1 + 12) % 12; // 0 = 인월
  const branchIndex = (2 + monthOrder) % 12;
  const startStem = WOHODUN_START_STEM[sajuYearStemIndex];
  const stemIndex = (startStem + monthOrder) % 10;
  return { stem: stemAt(stemIndex), branch: branchAt(branchIndex) };
}

function getDayPillar(year: number, month: number, day: number): Pillar {
  const jdn = toJulianDayNumber(year, month, day);
  // 60갑자 순환 공식 (근사치, MVP NOTICE 참고)
  const stemIndex = (jdn + 9) % 10;
  const branchIndex = (jdn + 1) % 12;
  return { stem: stemAt(stemIndex), branch: branchAt(branchIndex) };
}

// 오자둔(五子遁): 일간(日干)에 따라 자시(子時)의 시간이 결정된다.
const OJADUN_START_STEM: Record<number, number> = {
  0: 0, // 갑일 → 갑자시
  5: 0, // 기일 → 갑자시
  1: 2, // 을일 → 병자시
  6: 2, // 경일 → 병자시
  2: 4, // 병일 → 무자시
  7: 4, // 신일 → 무자시
  3: 6, // 정일 → 경자시
  8: 6, // 임일 → 경자시
  4: 8, // 무일 → 임자시
  9: 8, // 계일 → 임자시
};

function getHourBranchIndex(hh: number, mm: number): number {
  const minutesTotal = hh * 60 + mm;
  // 23:00~00:59 = 자시(0), 이후 2시간 단위
  const shifted = (minutesTotal + 60) % (24 * 60); // 23:00을 0분 기준으로 이동
  return Math.floor(shifted / 120) % 12;
}

function getHourPillar(dayStemIndex: number, time: string): Pillar {
  const [hhStr, mmStr] = time.split(":");
  const hh = Number(hhStr);
  const mm = Number(mmStr);
  const branchIndex = getHourBranchIndex(hh, mm);
  const startStem = OJADUN_START_STEM[dayStemIndex];
  const stemIndex = (startStem + branchIndex) % 10;
  return { stem: stemAt(stemIndex), branch: branchAt(branchIndex) };
}

function countElements(pillars: Pillar[]): Record<Element, number> {
  const counts: Record<Element, number> = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 };
  for (const pillar of pillars) {
    counts[pillar.stem.element] += 1;
    counts[pillar.branch.element] += 1;
  }
  return counts;
}

function getDominantElement(counts: Record<Element, number>): Element {
  return (Object.entries(counts) as [Element, number][]).sort((a, b) => b[1] - a[1])[0][0];
}

// 오행 상생(generates) / 상극(controls) 순환
const GENERATES: Record<Element, Element> = {
  wood: "fire",
  fire: "earth",
  earth: "metal",
  metal: "water",
  water: "wood",
};
const CONTROLS: Record<Element, Element> = {
  wood: "earth",
  fire: "metal",
  earth: "water",
  metal: "wood",
  water: "fire",
};

function getTenGod(dayMaster: HeavenlyStem, target: HeavenlyStem): TenGod {
  const sameYinYang = dayMaster.yinYang === target.yinYang;

  if (target.element === dayMaster.element) {
    return sameYinYang ? "비견" : "겁재";
  }
  if (GENERATES[dayMaster.element] === target.element) {
    return sameYinYang ? "식신" : "상관";
  }
  if (CONTROLS[dayMaster.element] === target.element) {
    return sameYinYang ? "편재" : "정재";
  }
  if (CONTROLS[target.element] === dayMaster.element) {
    return sameYinYang ? "편관" : "정관";
  }
  // GENERATES[target.element] === dayMaster.element
  return sameYinYang ? "편인" : "정인";
}

/**
 * 기본 정보(BasicInfo)로부터 간략 사주 챠트를 계산한다.
 * 음력 입력은 아직 변환 테이블이 없어 양력으로 간주해 계산한다 (MVP 한계).
 */
export function calculateSaju(basicInfo: BasicInfo): SajuChart {
  const [yStr, mStr, dStr] = basicInfo.birthDate.split("-");
  const year = Number(yStr);
  const month = Number(mStr);
  const day = Number(dStr);

  const sajuYear = getSajuYear(basicInfo.birthDate);
  const yearPillar = getYearPillar(sajuYear);
  const monthPillar = getMonthPillar(yearPillar.stem.index, month);
  const dayPillar = getDayPillar(year, month, day);
  const hourPillar =
    !basicInfo.birthTimeUnknown && basicInfo.birthTime
      ? getHourPillar(dayPillar.stem.index, basicInfo.birthTime)
      : null;

  const pillars = [yearPillar, monthPillar, dayPillar, ...(hourPillar ? [hourPillar] : [])];
  const elementCounts = countElements(pillars);
  const dominantElement = getDominantElement(elementCounts);

  return {
    year: yearPillar,
    month: monthPillar,
    day: dayPillar,
    hour: hourPillar,
    dayMaster: dayPillar.stem,
    elementCounts,
    dominantElement,
    tenGods: {
      year: getTenGod(dayPillar.stem, yearPillar.stem),
      month: getTenGod(dayPillar.stem, monthPillar.stem),
      hour: hourPillar ? getTenGod(dayPillar.stem, hourPillar.stem) : null,
    },
  };
}
