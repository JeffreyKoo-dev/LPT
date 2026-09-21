"use client";

import { useEffect, useRef } from "react";
import { useSupabaseSession } from "@/lib/useSupabaseSession";
import { pullAndMergeOnLogin } from "@/lib/supabase/sync";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";

/**
 * 화면에 아무것도 그리지 않는 동기화 트리거. 로그인이 감지되면 1회
 * 클라우드↔로컬 동기화(pullAndMergeOnLogin)를 실행한다. 레이아웃에 항상
 * 마운트되어 있어 어느 페이지에서 로그인하든 동작한다.
 *
 * 동시에 이탈 유저 재활성화(웰컴백 보너스) 여부도 서버에서 확인한다 —
 * 30일 이상 안 돌아왔던 사용자면 자동으로 별조각이 지급된다(조용히
 * 처리 — 사용자는 대시보드 거래내역에서 자연스럽게 확인하게 된다).
 */
export function AuthSync() {
  const session = useSupabaseSession();
  const syncedUserId = useRef<string | null>(null);

  useEffect(() => {
    if (!session.user) return;
    if (syncedUserId.current === session.user.id) return;
    syncedUserId.current = session.user.id;
    pullAndMergeOnLogin(session.user.id);

    if (isSupabaseConfigured()) {
      getSupabaseClient()
        .rpc("check_winback_bonus")
        .then(({ error }: { error: { message: string } | null }) => {
          if (error) console.error("[AuthSync] 웰컴백 확인 실패", error.message);
        });
    }
  }, [session.user]);

  return null;
}
