/**
 * 환불 정책에서 화면·약관·FAQ가 함께 쓰는 값. 숫자를 바꿀 때는 이 파일과
 * supabase/migrations(첫 결제 보너스), 그리고 이용약관 제8조 계열 문구를 함께 점검할 것.
 */
export const REFUND_POLICY = {
  /** 청약철회(환불) 요청 가능 기간(일) — 전자상거래법상 최소 기준 */
  windowDays: 7,
  /** 환불 접수 후 회사가 취소·반환을 처리하는 목표 기간(영업일) */
  processBusinessDays: 3,
  /** 카드 결제 취소가 카드사에서 반영되기까지 추가로 걸릴 수 있는 기간 */
  cardExtraBusinessDays: "3~7",
  /** 첫 결제 보너스 별조각 개수 (migrations/031·032의 v_first_bonus와 같은 값) */
  firstChargeBonus: 300,
} as const;

/** 결제·열어보기 직전에 보여주는 청약철회 제한 안내 문구 */
export const WITHDRAWAL_NOTICE =
  "열어보기를 누르면 보석이 차감되고 AI 콘텐츠 생성이 시작됩니다. 콘텐츠 제공이 시작된 뒤에는 해당 부분의 청약철회가 제한됩니다.";

/**
 * WITHDRAWAL_NOTICE 문구나 /refund의 관련 안내를 바꿀 때 함께 올릴 버전.
 * 동의 기록(digital_content_consents.notice_version)에 저장돼 "어떤 문구를 보고 확인했는지" 추적한다.
 */
export const WITHDRAWAL_NOTICE_VERSION = "2026-10-22";
