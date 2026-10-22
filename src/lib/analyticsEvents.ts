/**
 * 수집을 허용하는 이벤트 이름. 서버(/api/events)가 이 목록으로 검증하므로
 * 새 이벤트를 추가하려면 여기에 먼저 등록해야 한다.
 */
export const ANALYTICS_EVENTS = [
  "page_view",
  "unlock_impression", // 유료 콘텐츠 잠금 카드가 화면에 노출됨 (props: product)
  "unlock_confirm_open", // "열어보기"를 눌러 확인 단계가 열림
  "unlock_insufficient", // 보석이 부족해 충전 안내가 노출됨 (props: product, shortage)
  "unlock_purchased", // 보석으로 결제 완료
  "charge_select", // 충전 금액 선택 (props: krw)
  "charge_pay_click", // 결제하기 클릭 (props: krw)
  "charge_success", // 충전 승인 완료
  "share_click", // 결과 공유 (props: method)
  "invite_share", // 친구 초대 링크 공유/복사 (props: method)
] as const;

export type AnalyticsEventName = (typeof ANALYTICS_EVENTS)[number];
