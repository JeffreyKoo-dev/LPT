import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin, getAdminDbClient } from "@/lib/adminAuth";

/**
 * "이번 달 운세"가 실제로 매달 재구매되고 있는지 확인하는 핵심 건강 지표.
 * 재구매율이 낮으면(예: 지난달 산 사람 대부분이 이번 달엔 안 삼) "매달
 * 자연스럽게 재구매된다"는 설계 가정이 실제로는 안 먹히고 있다는 신호다.
 */
export async function GET(req: NextRequest) {
  const { authorized } = await verifyAdmin(req);
  if (!authorized) return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });

  const supabase = getAdminDbClient();

  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();

  const [{ data: thisMonthRows }, { data: lastMonthRows }] = await Promise.all([
    supabase
      .from("wallet_transactions")
      .select("user_id")
      .eq("product_code", "monthly_fortune")
      .eq("type", "spend")
      .gte("created_at", thisMonthStart),
    supabase
      .from("wallet_transactions")
      .select("user_id")
      .eq("product_code", "monthly_fortune")
      .eq("type", "spend")
      .gte("created_at", lastMonthStart)
      .lt("created_at", thisMonthStart),
  ]);

  const thisMonthBuyers = new Set((thisMonthRows ?? []).map((r) => r.user_id));
  const lastMonthBuyers = new Set((lastMonthRows ?? []).map((r) => r.user_id));

  let retained = 0;
  for (const id of lastMonthBuyers) {
    if (thisMonthBuyers.has(id)) retained += 1;
  }

  const retentionRate = lastMonthBuyers.size > 0 ? Math.round((retained / lastMonthBuyers.size) * 100) : null;

  return NextResponse.json({
    thisMonthBuyers: thisMonthBuyers.size,
    lastMonthBuyers: lastMonthBuyers.size,
    retained,
    retentionRate,
  });
}
