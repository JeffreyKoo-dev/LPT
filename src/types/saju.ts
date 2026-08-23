/**
 * 사주팔자(四柱八字) 관련 타입.
 */

export type Element = "wood" | "fire" | "earth" | "metal" | "water";
export type YinYang = "yin" | "yang";

export interface HeavenlyStem {
  index: number; // 0~9 (갑=0 ... 계=9)
  char: string; // 한자
  hangul: string; // 한글 표기
  element: Element;
  yinYang: YinYang;
}

export interface EarthlyBranch {
  index: number; // 0~11 (자=0 ... 해=11)
  char: string;
  hangul: string;
  element: Element;
  yinYang: YinYang;
}

export interface Pillar {
  stem: HeavenlyStem;
  branch: EarthlyBranch;
}

/**
 * 십성(十星). 일간(日干)을 기준으로 다른 간지와의 오행 생극 관계를 나타낸다.
 * 천간(天干)과 지지(地支) 모두에 대해 계산한다 — 실제 사주 해석에서는 지지 십성도
 * 천간 십성만큼 비중 있게 다뤄지므로 함께 제공한다.
 */
export type TenGod =
  | "비견"
  | "겁재"
  | "식신"
  | "상관"
  | "편재"
  | "정재"
  | "편관"
  | "정관"
  | "편인"
  | "정인";

/** 한 기둥(주)의 천간·지지 십성. 일주(日柱)는 천간이 일간 자신이라 지지만 갖는다. */
export interface PillarTenGods {
  stem: TenGod;
  branch: TenGod;
}

export interface SajuChart {
  year: Pillar;
  month: Pillar;
  day: Pillar;
  /** 출생시간을 모르는 경우 null */
  hour: Pillar | null;
  /** 일간(日干) = 본인의 타고난 기질을 대표하는 천간 */
  dayMaster: HeavenlyStem;
  /** 8글자(시주 모를 경우 6글자) 기준 오행 분포 */
  elementCounts: Record<Element, number>;
  /** 오행 중 가장 비중이 높은 원소 */
  dominantElement: Element;
  tenGods: {
    year: PillarTenGods;
    month: PillarTenGods;
    /** 일지(日支) — 일간 본인은 십성이 없으므로 지지만 갖는다 */
    day: { branch: TenGod };
    hour: PillarTenGods | null;
  };
}
