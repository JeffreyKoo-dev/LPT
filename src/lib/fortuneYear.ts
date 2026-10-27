const STEMS_KO = ["갑", "을", "병", "정", "무", "기", "경", "신", "임", "계"];
const BRANCHES_KO = ["자", "축", "인", "묘", "진", "사", "오", "미", "신", "유", "술", "해"];

const mod = (n: number, m: number) => ((n % m) + m) % m;

/** 해당 연도의 간지 이름 — 2027 → "정미년" (엔진의 세운 계산과 같은 규칙: (연도-4)를 10·12로 나눈 나머지) */
export function getYearGanzhiName(year: number): string {
  return `${STEMS_KO[mod(year - 4, 10)]}${BRANCHES_KO[mod(year - 4, 12)]}년`;
}
