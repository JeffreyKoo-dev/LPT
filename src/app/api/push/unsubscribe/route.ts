// src/app/api/push/unsubscribe/route.ts
// push_subscriptions의 RLS(본인 user_id 행만 delete 가능)에 기대어, 호출자 본인
// 토큰으로 그대로 delete한다.

import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { endpoint } = await req.json();
  if (!endpoint) {
    return NextResponse.json({ error: "endpoint가 필요합니다." }, { status: 400 });
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

    const { error } = await callerClient.from("push_subscriptions").delete().eq("endpoint", endpoint);
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[push/unsubscribe] 삭제 실패", error);
    return NextResponse.json({ error: "구독 해지에 실패했어요." }, { status: 500 });
  }
}
