import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";

export interface ModerationResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Supabase Edge Function(moderate-content)을 호출해 AI 기반 정밀 검수를 받는다.
 * Supabase가 설정 안 된 환경(로컬 개발 등)이거나 호출이 실패하면, 서비스 흐름을
 * 막지 않기 위해 통과(allowed: true)시킨다 — 이 경우 lib/contentModeration.ts의
 * 1차 키워드 필터가 최소한의 방어선 역할을 한다.
 */
export async function checkContentWithAi(fieldName: string, text: string): Promise<ModerationResult> {
  if (!isSupabaseConfigured()) return { allowed: true };

  try {
    const supabase = getSupabaseClient();
    const { data: userData } = await supabase.auth.getUser();

    const { data, error } = await supabase.functions.invoke("moderate-content", {
      body: { fieldName, text, userId: userData.user?.id ?? null },
    });

    if (error) throw error;
    return data as ModerationResult;
  } catch (error) {
    console.error("[moderation] AI 검수 호출 실패, 통과 처리", error);
    return { allowed: true };
  }
}
