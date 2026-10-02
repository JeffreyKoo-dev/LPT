// src/app/api/push/subscribe/route.ts
//
// 브라우저가 생성한 푸시 구독 정보를 저장한다. 관리자 권한이 필요 없다 —
// push_subscriptions의 RLS가 "본인 user_id로만 insert 가능"을 강제하므로,
// 호출자 본인 토큰이 실린 클라이언트로 그대로 insert하면 충분하다
// (account/delete 라우트처럼 admin 클라이언트를 쓸 필요가 없음).

import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { endpoint, p256dh, authKey } = await req.json();
  if (!endpoint || !p256dh || !authKey) {
    return NextResponse.json({ error: "구독 정보가 올바르지 않습니다." }, { status: 400 });
  }

  try {
    const callerClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: userData, error: userError } = await callerClient.auth.getUser();
    if (userError || !userData.user) {
      return NextResponse.json({ error: "인증이 유효하지 않습니다." }, { status: 401 });
    }

    const { error } = await callerClient
      .from("push_subscriptions")
      .upsert(
        { user_id: userData.user.id, endpoint, p256dh, auth_key: authKey },
        { onConflict: "endpoint" }
      );
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[push/subscribe] 저장 실패", error);
    return NextResponse.json({ error: "구독 저장에 실패했어요." }, { status: 500 });
  }
}
