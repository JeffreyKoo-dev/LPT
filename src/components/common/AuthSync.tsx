"use client";

import { useEffect, useRef } from "react";
import { useSupabaseSession } from "@/lib/useSupabaseSession";
import { pullAndMergeOnLogin } from "@/lib/supabase/sync";

/**
 * 화면에 아무것도 그리지 않는 동기화 트리거. 로그인이 감지되면 1회
 * 클라우드↔로컬 동기화(pullAndMergeOnLogin)를 실행한다. 레이아웃에 항상
 * 마운트되어 있어 어느 페이지에서 로그인하든 동작한다.
 */
export function AuthSync() {
  const session = useSupabaseSession();
  const syncedUserId = useRef<string | null>(null);

  useEffect(() => {
    if (!session.user) return;
    if (syncedUserId.current === session.user.id) return;
    syncedUserId.current = session.user.id;
    pullAndMergeOnLogin(session.user.id);
  }, [session.user]);

  return null;
}
