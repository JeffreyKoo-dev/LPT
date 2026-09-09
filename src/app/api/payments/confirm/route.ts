// src/app/api/payments/confirm/route.ts
//
// 캐시 충전 결제 승인 엔드포인트. 토스페이먼츠 결제창(SDK)에서 결제가
// 끝나면 브라우저가 successUrl로 리다이렉트되며 paymentKey/orderId/amount를
// 쿼리로 넘겨준다. 이 라우트가 바로 그 값을 받아 "서버가 직접" 토스
// 결제승인 API를 호출해 진짜 결제인지 확인한 뒤에만 캐시를 지급한다.
//
// 이 방식을 쓰는 이유: 토스페이먼츠 결제 상태 웹훅에는 서명 헤더가 없다
// (서명은 payout.changed/seller.changed 웹훅에만 존재 — 토스 공식 문서
// 확인). 그래서 "웹훅이 왔으니 믿는다"는 방식은 위조 위험이 있다. 대신
// 서버가 우리 SECRET_KEY로 토스 API를 직접 호출해 받은 응답만 신뢰하는
// 이 흐름이 토스페이먼츠가 문서에서 권장하는 표준 결제 승인 패턴이다.
//
// 필요한 환경변수: TOSS_SECRET_KEY (토스페이먼츠 가입 후 발급, 서버 전용,
// 절대 클라이언트에 노출 금지 — NEXT_PUBLIC_ 접두어를 붙이지 않는다)

import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const TOSS_SECRET_KEY = process.env.TOSS_SECRET_KEY;

/**
 * 관리자 권한 Supabase 클라이언트를 요청 처리 시점에만 생성한다(모듈 로드
 * 시점이 아니라). 환경변수가 아직 설정되지 않은 상태로 빌드하면, 최상위에서
 * createClient()를 바로 호출하는 경우 next build 자체가 실패한다 — 이 결제
 * 기능을 아직 설정하지 않은 배포 환경에서도 사이트 전체 빌드는 항상
 * 성공해야 하므로, 필요한 시점에만 생성하도록 지연시킨다.
 */
function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY! // 서버 전용, 절대 클라이언트에 노출 금지
  );
}

// 충전 단위별 지급 캐시 (보너스 포함). 프로모션이 잦아지면 DB화 고려
// (docs/PHASE2_ROADMAP.md의 cash_charge_options 초안 참고).
const CHARGE_OPTIONS: Record<number, number> = {
  1000: 1000,
  3000: 3300,
  5000: 5750,
  10000: 12000,
};

export async function POST(req: NextRequest) {
  if (!TOSS_SECRET_KEY) {
    return NextResponse.json({ error: "결제 기능이 아직 설정되지 않았습니다." }, { status: 503 });
  }

  const supabaseAdmin = getSupabaseAdmin();

  const { paymentKey, orderId, amount } = (await req.json()) as {
    paymentKey: string;
    orderId: string;
    amount: number;
  };

  if (!paymentKey || !orderId || !amount) {
    return NextResponse.json({ error: "필수 파라미터가 누락됐습니다." }, { status: 400 });
  }

  // 1) 우리 쪽에 남겨둔 주문 기록과 대조 — 금액 위조 방지 (클라이언트가 amount를
  //    조작해서 보낼 수 있으므로, 결제 시작 시점에 서버에 저장해둔 값과 비교한다)
  const { data: order, error: orderError } = await supabaseAdmin
    .from("purchase_orders")
    .select("id, user_id, krw_amount, status")
    .eq("id", orderId)
    .maybeSingle();

  if (orderError || !order) {
    return NextResponse.json({ error: "주문을 찾을 수 없습니다." }, { status: 404 });
  }
  if (order.status !== "pending") {
    return NextResponse.json({ error: "이미 처리된 주문입니다." }, { status: 409 });
  }
  if (order.krw_amount !== amount) {
    return NextResponse.json({ error: "결제 금액이 일치하지 않습니다." }, { status: 400 });
  }

  // 2) 서버가 직접 토스 결제승인 API를 호출한다 — 이 응답만 신뢰한다
  const authHeader = "Basic " + Buffer.from(`${TOSS_SECRET_KEY}:`).toString("base64");
  const tossResponse = await fetch("https://api.tosspayments.com/v1/payments/confirm", {
    method: "POST",
    headers: {
      Authorization: authHeader,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ paymentKey, orderId, amount }),
  });

  const tossPayment = await tossResponse.json();

  if (!tossResponse.ok || tossPayment.status !== "DONE") {
    await supabaseAdmin.from("purchase_orders").update({ status: "failed" }).eq("id", orderId);
    return NextResponse.json(
      { error: tossPayment.message ?? "결제 승인에 실패했습니다." },
      { status: 400 }
    );
  }

  // 3) 승인 확인됨 — 캐시 지급 (service_role 전용 함수, 클라이언트는 직접 호출 불가)
  const cashAmount = CHARGE_OPTIONS[amount];
  if (!cashAmount) {
    return NextResponse.json({ error: `등록되지 않은 충전 금액: ${amount}` }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin.rpc("charge_cash_from_pg", {
    p_user_id: order.user_id,
    p_krw_amount: amount,
    p_cash_amount: cashAmount,
    p_pg_transaction_id: paymentKey,
  });

  if (error) {
    console.error("[payments/confirm] charge_cash_from_pg 실패", error);
    return NextResponse.json({ error: "캐시 지급 중 오류가 발생했습니다." }, { status: 500 });
  }

  await supabaseAdmin
    .from("purchase_orders")
    .update({
      status: "completed",
      pg_transaction_id: paymentKey,
      completed_at: new Date().toISOString(),
    })
    .eq("id", orderId);

  return NextResponse.json({ ok: true, newBalance: data?.[0]?.new_balance });
}
