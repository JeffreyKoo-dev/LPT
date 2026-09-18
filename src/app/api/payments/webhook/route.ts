// src/app/api/payments/webhook/route.ts
//
// 토스페이먼츠 결제 상태 웹훅(PAYMENT_STATUS_CHANGED) 수신 엔드포인트.
//
// 중요: 보석 지급의 주된 경로는 이 웹훅이 아니라
// /api/payments/confirm(성공 리다이렉트 시 서버가 직접 토스 API를 호출해
// 검증)이다. 토스페이먼츠의 일반 결제 상태 웹훅에는 서명 헤더가 없어서
// (서명이 있는 건 payout.changed/seller.changed뿐 — 토스 공식 문서 확인)
// "웹훅이 왔다"는 사실만으로 보석을 지급하는 건 위조 위험이 있다.
//
// 이 라우트는 비동기로 발생하는 상태 변경을 처리하는 보조 경로다:
// - "결제 대기 중" 주문이 취소되면: 단순히 주문 상태만 취소로 바꾼다
//   (아직 보석을 지급 안 했으므로 회수할 것도 없음)
// - "이미 완료된" 주문이 나중에 취소·환불(차지백 등)되면:
//   process_payment_refund()로 남아있는 보석만큼 회수하고, 이미 소비돼
//   회수 못 한 금액은 payment_refund_events에 기록해 관리자가 확인할 수
//   있게 한다 (/admin에 노출됨)

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
    const { data: pendingUpdate } = await supabaseAdmin
      .from("purchase_orders")
      .update({ status: "cancelled" })
      .eq("id", eventData.orderId)
      .eq("status", "pending")
      .select("id");

    // pending 주문이 아니었다면(이미 completed였다면), 자산 회수 처리를 시도한다.
    if (!pendingUpdate || pendingUpdate.length === 0) {
      const { error } = await supabaseAdmin.rpc("process_payment_refund", {
        p_order_id: eventData.orderId,
      });
      if (error) {
        // "완료된 주문을 찾을 수 없음"(예: 애초에 존재하지 않는 주문)이나
        // "이미 처리된 환불"은 정상적인 상황일 수 있어 에러 로그만 남기고
        // 웹훅 자체는 200으로 응답한다(토스가 재시도하지 않도록).
        console.error("[payments/webhook] 환불 처리 실패", error.message);
      }
    }
  }

  return NextResponse.json({ ok: true });
}
