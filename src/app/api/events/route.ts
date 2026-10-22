// src/app/api/events/route.ts
//
// 클라이언트 이벤트 수집. 허용 목록에 있는 이벤트 이름만 받고, props는 크기를
// 제한한다. 로그인 상태면 Authorization 토큰으로 user_id를 붙이고, 아니면
// anon_id만 저장한다. 실패해도 사용자 흐름에는 영향이 없도록 항상 가볍게 응답한다.

import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { ANALYTICS_EVENTS } from "@/lib/analyticsEvents";

const MAX_BODY_BYTES = 2000;

export async function POST(req: NextRequest) {
  try {
    const raw = await req.text();
    if (raw.length > MAX_BODY_BYTES) return NextResponse.json({ ok: false }, { status: 413 });
    const body = JSON.parse(raw) as {
      anonId?: unknown;
      name?: unknown;
      path?: unknown;
      props?: unknown;
    };

    const anonId = typeof body.anonId === "string" ? body.anonId.slice(0, 64) : "";
    const name = typeof body.name === "string" ? body.name : "";
    if (!anonId || !(ANALYTICS_EVENTS as readonly string[]).includes(name)) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }
    const path = typeof body.path === "string" ? body.path.slice(0, 200) : null;

    // props는 문자열/숫자/불리언 값만 허용 (객체·배열 차단)
    const props: Record<string, string | number | boolean> = {};
    if (body.props && typeof body.props === "object" && !Array.isArray(body.props)) {
      for (const [k, v] of Object.entries(body.props as Record<string, unknown>).slice(0, 10)) {
        if (typeof v === "string") props[k.slice(0, 40)] = v.slice(0, 100);
        else if (typeof v === "number" || typeof v === "boolean") props[k.slice(0, 40)] = v;
      }
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const caller = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data } = await caller.auth.getUser();
      userId = data.user?.id ?? null;
    }

    const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    const { error } = await admin
      .from("analytics_events")
      .insert({ anon_id: anonId, user_id: userId, name, path, props });
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[events] 저장 실패", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
