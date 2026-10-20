/**
 * 전자상거래법상 쇼핑몰/유료서비스 화면에 표시해야 하는 사업자 정보.
 * 사업자등록증·통신판매업신고증에 기재된 값 그대로 유지할 것 — 상호/주소가
 * 바뀌면 이 파일만 고치면 Footer·이용약관·개인정보처리방침에 전부 반영된다.
 *
 * phone은 2026-10-20 확정(070-8028-9498), email은 2026-10-03 확정
 * (stoneiron@anyallx.com) — 둘 다 개인정보보호책임자 연락처로도 함께 쓰인다.
 */
export const BUSINESS_INFO = {
  companyName: "저스트셀에이아이",
  serviceName: "LPT (QuestofME)",
  ceoName: "구재형",
  registrationNumber: "304-63-00718",
  mailOrderNumber: "제2026-서울강남-02766호",
  address: "서울특별시 강남구 언주로 419, 608호 (역삼동, 행남자기)",
  /** 고객센터 대표번호 */
  phone: "070-8028-9498" as string | null,
  /** 개인정보보호책임자 연락처로도 함께 쓰임 */
  email: "stoneiron@anyallx.com" as string | null,
};
