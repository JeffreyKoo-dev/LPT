"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * 브라우저(클라이언트 컴포넌트)에서 사용하는 Supabase 클라이언트.
 * NEXT_PUBLIC_* 환경변수는 빌드 시 클라이언트 번들에 포함되므로, 여기엔
 * anon(public) key만 사용한다 — 이 키는 공개되어도 안전하도록 설계됐고,
 * 실제 데이터 접근 제어는 Supabase의 Row Level Security(RLS) 정책이 담당한다.
 */
let client: ReturnType<typeof createBrowserClient> | null = null;

export function getSupabaseClient() {
  if (client) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Supabase 환경변수가 설정되지 않았습니다. .env.local에 NEXT_PUBLIC_SUPABASE_URL, " +
        "NEXT_PUBLIC_SUPABASE_ANON_KEY를 설정해주세요 (.env.local.example 참고)."
    );
  }

  client = createBrowserClient(url, anonKey);
  return client;
}

/** 환경변수가 설정되어 있어 Supabase 기능(로그인 등)을 쓸 수 있는지 확인한다 */
export function isSupabaseConfigured(): boolean {
  return !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
}
