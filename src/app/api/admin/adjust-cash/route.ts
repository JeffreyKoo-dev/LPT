import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin, getAdminDbClient } from "@/lib/adminAuth";

/** 관리자가 특정 사용자의 캐시를 수동으로 지급/차감한다 (CS 대응용). */
export async function POST(req: NextRequest) {
  const { authorized, email } = await verifyAdmin(req);
  if (!authorized) return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });

  const { userId, amount, reason } = await req.json();
  if (!userId || typeof amount !== "number" || amount === 0) {
    return NextResponse.json({ error: "유효한 사용자와 금액을 입력해주세요." }, { status: 400 });
  }

  const supabase = getAdminDbClient();
  const { data, error } = await supabase.rpc("admin_adjust_cash", {
    p_user_id: userId,
    p_amount: amount,
    p_reason: reason || `관리자(${email}) 수동 조정`,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ newBalance: data?.[0]?.new_balance });
}
