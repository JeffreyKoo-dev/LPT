// src/app/api/account/delete/route.ts
//
// 본인 계정 탈퇴. auth.users 행을 삭제하면(Supabase Admin API), 관련된
// 모든 테이블(user_profiles, survey_responses, wallets, wallet_transactions,
// purchase_orders, premium_content, friendships 등)이 on delete cascade로
// 자동 정리된다. shared_profiles만 예외로 on delete set null — 이미
// 공유된 링크는 계정이 사라져도 콘텐츠 자체는 유지하고, 소유자 표시만 사라진다.

import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  try {
    // 1) 호출자 본인 확인 (일반 anon 키 + 호출자 토큰으로 "누구인지"만 검증)
    const callerClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: userData, error: userError } = await callerClient.auth.getUser();
    if (userError || !userData.user) {
      return NextResponse.json({ error: "인증이 유효하지 않습니다." }, { status: 401 });
    }

    // 2) 관리자 권한으로 본인 계정만 삭제 (다른 사람 계정은 절대 지울 수 없음 — userData.user.id는
    //    본인 토큰에서 나온 값이라 위조 불가)
    const admin = getSupabaseAdmin();
    const { error: deleteError } = await admin.auth.admin.deleteUser(userData.user.id);
    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[account/delete] 처리 실패", error);
    return NextResponse.json({ error: "탈퇴 처리 중 오류가 발생했어요." }, { status: 500 });
  }
}
