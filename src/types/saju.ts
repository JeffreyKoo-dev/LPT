/**
 * 사주팔자(四柱八字) 관련 타입.
 * MVP NOTICE: 아래 타입을 채우는 실제 계산 로직(lib/saju.ts)은 간략 구현이며,
 * 정식 서비스 전환 전 검증된 만세력 데이터로 교체가 필요하다.
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
 * MVP에서는 년/월/시의 "천간"에 대해서만 계산하고, 지지 및 지장간 기반 십성은
 * 다음 단계에서 정교화한다.
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
    year: TenGod;
    month: TenGod;
    hour: TenGod | null;
  };
}
