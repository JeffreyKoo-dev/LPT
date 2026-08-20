/**
 * 레벨별 누적 필요 경험치 (index 0 = 1레벨, 시작값 0).
 * 레벨이 오를수록 필요 경험치가 완만하게 증가하도록 설계했다.
 */
export const LEVEL_THRESHOLDS: number[] = [
  0, // Lv.1
  100, // Lv.2
  250, // Lv.3
  450, // Lv.4
  700, // Lv.5
  1000, // Lv.6
  1350, // Lv.7
  1750, // Lv.8
  2200, // Lv.9
  2700, // Lv.10 (현재 만렙)
];

export const MAX_LEVEL = LEVEL_THRESHOLDS.length;
