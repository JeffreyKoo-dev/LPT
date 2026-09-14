import { createClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";

/**
 * 관리자 API 라우트 전용 인증 헬퍼.
 *
 * 관리자 이메일 목록은 ADMIN_EMAILS(서버 전용, NEXT_PUBLIC_ 접두어 없음)
 * 환경변수에 쉼표로 구분해 저장한다. 클라이언트에는 누가 관리자인지
 * 노출되지 않는다 — 실제 권한 검사는 항상 이 함수(서버)에서만 이뤄진다.
 * 클라이언트 쪽 접근 제어(관리자 페이지 진입 가드)는 UX용일 뿐이고,
 * 진짜 방어선은 각 API 라우트가 이 함수를 호출하는 것이다.
 */
export async function verifyAdmin(
  req: NextRequest
): Promise<{ authorized: boolean; email?: string }> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return { authorized: false };

  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (adminEmails.length === 0) return { authorized: false };

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user?.email) return { authorized: false };

    const email = data.user.email.toLowerCase();
    return { authorized: adminEmails.includes(email), email };
  } catch (error) {
    console.error("[adminAuth] 검증 실패", error);
    return { authorized: false };
  }
}

/** 관리자 전용 데이터 조회에 쓰는 service_role 클라이언트 (RLS 우회) */
export function getAdminDbClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
