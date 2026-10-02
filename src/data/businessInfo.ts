/**
 * 전자상거래법상 쇼핑몰/유료서비스 화면에 표시해야 하는 사업자 정보.
 * 사업자등록증·통신판매업신고증에 기재된 값 그대로 유지할 것 — 상호/주소가
 * 바뀌면 이 파일만 고치면 Footer·이용약관·개인정보처리방침에 전부 반영된다.
 *
 * phone/email은 아직 확정되지 않아 비워둔 상태(2026-10-01). 값이 생기면
 * 바로 채워 넣을 것 — 개인정보보호책임자 연락처는 개인정보보호법상 필수
 * 표시 항목이라 계속 비워두면 안 된다.
 */
export const BUSINESS_INFO = {
  companyName: "저스트셀에이아이",
  serviceName: "LPT (QuestofME)",
  ceoName: "구재형",
  registrationNumber: "304-63-00718",
  mailOrderNumber: "제2026-서울강남-02766호",
  address: "서울특별시 강남구 언주로 419, 608호 (역삼동, 행남자기)",
  /** TODO: 확정되는 대로 채울 것 */
  phone: null as string | null,
  /** TODO: 확정되는 대로 채울 것. 개인정보보호책임자 연락처로도 함께 쓰임 */
  email: null as string | null,
};
