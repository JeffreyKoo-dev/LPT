"use client";

import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";

export interface SupabaseSessionState {
  /** Supabase 환경변수 자체가 없으면(로컬 개발 등) 로그인 기능을 아예 숨긴다 */
  configured: boolean;
  loading: boolean;
  user: User | null;
  session: Session | null;
  signOut: () => Promise<void>;
}

/** 로그인 상태를 구독하는 클라이언트 훅. 헤더, 마이페이지 등에서 공통으로 사용한다. */
export function useSupabaseSession(): SupabaseSessionState {
  const configured = isSupabaseConfigured();
  const [loading, setLoading] = useState(configured);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    if (!configured) return;
    const supabase = getSupabaseClient();

    supabase.auth.getSession().then(({ data }: { data: { session: Session | null } }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event: string, newSession: Session | null) => {
        setSession(newSession);
      }
    );

    // 로그인 링크(매직 링크)는 이메일 클라이언트에서 새 탭으로 열린다. 이 탭(원래 탭)의
    // 세션 저장소는 쿠키 기반이라, 다른 탭에서 로그인이 완료돼도 localStorage의
    // storage 이벤트처럼 자동으로 알림이 오지 않는다. 그래서 사용자가 원래 탭으로
    // 돌아와 다시 포커스를 줄 때마다 세션을 다시 확인해 반영한다.
    function handleFocus() {
      supabase.auth.getSession().then(({ data }: { data: { session: Session | null } }) => {
        setSession(data.session);
      });
    }
    function handleVisibility() {
      if (document.visibilityState === "visible") handleFocus();
    }
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      listener.subscription.unsubscribe();
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [configured]);

  async function signOut() {
    if (!configured) return;
    await getSupabaseClient().auth.signOut();
  }

  return { configured, loading, user: session?.user ?? null, session, signOut };
}
