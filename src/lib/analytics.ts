"use client";

import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";
import type { AnalyticsEventName } from "@/lib/analyticsEvents";

const ANON_KEY = "lpt_anon_id";

/** 브라우저별 익명 ID. 저장소를 못 쓰는 환경에서는 세션 동안만 유지된다. */
let memoryAnonId: string | null = null;

function getAnonId(): string {
  try {
    const existing = window.localStorage.getItem(ANON_KEY);
    if (existing) return existing;
    const id = crypto.randomUUID();
    window.localStorage.setItem(ANON_KEY, id);
    return id;
  } catch {
    memoryAnonId ??= crypto.randomUUID();
    return memoryAnonId;
  }
}

/**
 * 행동 이벤트를 기록한다. 실패해도 조용히 무시한다(사용자 흐름 우선).
 * props에는 개인정보(생년월일, 설문 응답 등)를 넣지 않는다.
 */
export function track(name: AnalyticsEventName, props?: Record<string, string | number | boolean>): void {
  if (typeof window === "undefined") return;
  void (async () => {
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (isSupabaseConfigured()) {
        const { data } = await getSupabaseClient().auth.getSession();
        if (data.session?.access_token) headers.Authorization = `Bearer ${data.session.access_token}`;
      }
      await fetch("/api/events", {
        method: "POST",
        headers,
        keepalive: true,
        body: JSON.stringify({ anonId: getAnonId(), name, path: window.location.pathname, props }),
      });
    } catch {
      /* 계측 실패는 무시 */
    }
  })();
}
