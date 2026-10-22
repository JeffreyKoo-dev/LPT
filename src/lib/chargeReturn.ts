/**
 * 잔액 부족으로 충전 페이지에 갔다가, 충전이 끝나면 원래 보던 화면으로
 * 돌아오기 위한 경로를 sessionStorage에 잠깐 보관한다.
 * 같은 사이트의 내부 경로("/..."), 프로토콜 상대 경로("//...")는 거부한다.
 */
const KEY = "lpt_return_after_charge";

export function saveChargeReturn(path: string): void {
  try {
    if (path.startsWith("/") && !path.startsWith("//")) window.sessionStorage.setItem(KEY, path);
  } catch {
    /* 저장소를 못 쓰는 환경이면 복귀 없이 진행 */
  }
}

export function peekChargeReturn(): string | null {
  try {
    const v = window.sessionStorage.getItem(KEY);
    return v && v.startsWith("/") && !v.startsWith("//") ? v : null;
  } catch {
    return null;
  }
}

export function clearChargeReturn(): void {
  try {
    window.sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
