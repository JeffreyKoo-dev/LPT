import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin, getAdminDbClient } from "@/lib/adminAuth";

/** 결제 취소/환불(차지백)로 자산을 회수한 내역을 보여준다 — 미회수액이 있으면 특히 확인 필요. */
export async function GET(req: NextRequest) {
  const { authorized } = await verifyAdmin(req);
  if (!authorized) return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });

  const supabase = getAdminDbClient();
  const { data, error } = await supabase
    .from("payment_refund_events")
    .select("id, order_id, user_id, krw_amount, cash_amount_granted, cash_amount_recovered, shortfall, reviewed, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ events: data ?? [] });
}

/** 관리자가 확인 처리(reviewed=true)한다. */
export async function POST(req: NextRequest) {
  const { authorized } = await verifyAdmin(req);
  if (!authorized) return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });

  const { eventId } = await req.json();
  if (!eventId) return NextResponse.json({ error: "eventId가 필요합니다." }, { status: 400 });

  const supabase = getAdminDbClient();
  const { error } = await supabase
    .from("payment_refund_events")
    .update({ reviewed: true })
    .eq("id", eventId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
