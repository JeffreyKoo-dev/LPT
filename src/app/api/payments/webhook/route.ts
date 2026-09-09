// src/app/api/payments/webhook/route.ts
//
// 토스페이먼츠 결제 상태 웹훅(PAYMENT_STATUS_CHANGED) 수신 엔드포인트.
//
// 중요: 캐시 지급의 주된 경로는 이 웹훅이 아니라
// /api/payments/confirm(성공 리다이렉트 시 서버가 직접 토스 API를 호출해
// 검증)이다. 토스페이먼츠의 일반 결제 상태 웹훅에는 서명 헤더가 없어서
// (서명이 있는 건 payout.changed/seller.changed뿐 — 토스 공식 문서 확인)
// "웹훅이 왔다"는 사실만으로 캐시를 지급하는 건 위조 위험이 있다.
//
// 이 라우트는 결제 취소·실패처럼 confirm 흐름 이후 비동기로 발생하는
// 상태 변경을 purchase_orders에 반영하는 보조 용도로만 쓴다. 이미
// completed된 주문의 캐시를 취소하는 로직은 아직 없다 — 필요해지면
// refund 트랜잭션 타입(wallet_transactions.type='refund')으로
// 별도 처리할 것.

import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: NextRequest) {
  const supabaseAdmin = getSupabaseAdmin();
  const payload = await req.json();
  const { data: eventData, eventType } = payload as {
    eventType: string;
    data: { orderId?: string; status?: string };
  };

  if (!eventData?.orderId) {
    return NextResponse.json({ ok: true }); // 우리와 무관한 이벤트일 수 있음, 조용히 무시
  }

  if (eventType === "PAYMENT_STATUS_CHANGED" && eventData.status === "CANCELED") {
    await supabaseAdmin
      .from("purchase_orders")
      .update({ status: "cancelled" })
      .eq("id", eventData.orderId)
      .eq("status", "pending"); // 이미 completed된 주문은 여기서 건드리지 않는다
  }

  return NextResponse.json({ ok: true });
}
