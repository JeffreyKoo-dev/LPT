import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";

/**
 * 현재 로그인한 사용자 id를 메모리에 캐싱해, lib/growth.ts·lib/survey.ts 같은
 * 일반 함수(React 훅이 아닌 곳)에서도 동기적으로 "로그인 여부"를 확인할 수
 * 있게 한다. Supabase의 auth 상태 변화를 앱 전체에서 한 번만 구독한다.
 */
let cachedUserId: string | null = null;
let subscribed = false;

function ensureSubscribed(): void {
  if (subscribed || !isSupabaseConfigured()) return;
  subscribed = true;

  const supabase = getSupabaseClient();
  supabase.auth.getSession().then(({ data }: { data: { session: { user: { id: string } } | null } }) => {
    cachedUserId = data.session?.user.id ?? null;
  });
  supabase.auth.onAuthStateChange((_event: string, session: { user: { id: string } } | null) => {
    cachedUserId = session?.user.id ?? null;
  });
}

/** 로그인 상태면 user id를, 아니면 null을 동기적으로 반환한다 (초기 로드 직후엔 잠깐 null일 수 있음) */
export function getCachedUserId(): string | null {
  ensureSubscribed();
  return cachedUserId;
}
