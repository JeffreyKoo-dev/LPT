"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useSupabaseSession, SupabaseSessionState } from "@/lib/useSupabaseSession";

/**
 * 성장 관련 화면(대시보드/퀘스트/뱃지/성장기록)에서 사용한다.
 * Supabase가 설정되어 있는데 로그인 상태가 아니면 /login으로 보낸다
 * (로그인 후 원래 페이지로 돌아올 수 있도록 redirect 쿼리를 함께 붙인다).
 * Supabase 자체가 설정 안 된 환경(로컬 개발 등)에서는 막지 않고 그대로 통과시킨다
 * — 로그인 기능이 없는 채로 개발/테스트하던 기존 흐름을 깨지 않기 위함이다.
 */
export function useRequireLogin(): SupabaseSessionState & { redirecting: boolean } {
  const session = useSupabaseSession();
  const router = useRouter();
  const pathname = usePathname();

  const redirecting = session.configured && !session.loading && !session.user;

  useEffect(() => {
    if (!redirecting) return;
    router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
  }, [redirecting, pathname, router]);

  return { ...session, redirecting };
}
