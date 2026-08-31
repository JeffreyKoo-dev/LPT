/**
 * 닉네임 등 사용자 입력 텍스트에 대한 1차(키워드) 필터.
 *
 * 이 앱은 대부분 고정된 문구로 구성되어 있어, 사용자가 자유롭게 입력하는
 * 텍스트는 사실상 "닉네임"이 유일하다. 여기서 명백한 욕설·비하 표현을
 * 1차로 걸러내고, 더 정교한 판단(맥락상 비하인지 등)은 서버의 AI 검수
 * (lib/moderationApi.ts, Supabase Edge Function)에 맡긴다.
 *
 * 키워드 매칭은 우회가 쉬운 한계가 있다는 걸 인지하고 있으며, 그래서
 * 최종 방어선이 아니라 즉각적인 사용자 피드백을 위한 1차 필터로만 쓴다.
 */

const BLOCKED_SUBSTRINGS: string[] = [
  "씨발", "시발", "병신", "지랄", "개새끼", "좆", "년아", "새끼야",
  "장애인같", "찐따", "흑형", "짱깨", "쪽바리", "니거",
];

export interface NicknameCheckResult {
  allowed: boolean;
  reason?: string;
}

export function checkNicknameLocally(nickname: string): NicknameCheckResult {
  const normalized = nickname.replace(/\s/g, "").toLowerCase();
  const hit = BLOCKED_SUBSTRINGS.find((word) => normalized.includes(word));
  if (hit) {
    return { allowed: false, reason: "사용할 수 없는 표현이 포함되어 있어요." };
  }
  return { allowed: true };
}
