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

    return () => listener.subscription.unsubscribe();
  }, [configured]);

  async function signOut() {
    if (!configured) return;
    await getSupabaseClient().auth.signOut();
  }

  return { configured, loading, user: session?.user ?? null, session, signOut };
}
