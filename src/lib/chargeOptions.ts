/**
 * 충전 단위별 지급 캐시(보너스 포함).
 * 클라이언트(lib/wallet.ts)와 서버 API 라우트(api/payments/confirm)
 * 양쪽에서 똑같이 참조한다 — 두 곳에 따로 하드코딩하면 금액이 어긋날
 * 위험이 있어 이 파일 하나로 공유한다. 이 파일은 브라우저 전용 API를
 * 쓰지 않아 서버/클라이언트 어디서든 안전하게 import할 수 있다.
 *
 * 프로모션이 잦아지면 DB화 고려 (docs/PHASE2_ROADMAP.md의
 * cash_charge_options 초안 참고).
 */
export const CHARGE_OPTIONS: Record<number, number> = {
  1000: 1000,
  3000: 3300,
  5000: 5750,
  10000: 12000,
};
