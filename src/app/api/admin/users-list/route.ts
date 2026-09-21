import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin, getAdminDbClient } from "@/lib/adminAuth";

/** 전체 가입자 목록을 페이지네이션으로 조회한다. */
export async function GET(req: NextRequest) {
  const { authorized } = await verifyAdmin(req);
  if (!authorized) return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });

  const page = Math.max(0, Number(req.nextUrl.searchParams.get("page") ?? "0"));
  const pageSize = 20;

  const supabase = getAdminDbClient();
  const { data, error, count } = await supabase
    .from("user_profiles")
    .select("user_id, nickname, lpt_type_id, xp, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(page * pageSize, page * pageSize + pageSize - 1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const userIds = (data ?? []).map((u) => u.user_id);
  const { data: wallets } = await supabase
    .from("wallets")
    .select("user_id, cash_balance, bonus_balance")
    .in("user_id", userIds.length > 0 ? userIds : ["00000000-0000-0000-0000-000000000000"]);

  const users = (data ?? []).map((u) => {
    const wallet = wallets?.find((w) => w.user_id === u.user_id);
    return {
      ...u,
      cashBalance: wallet?.cash_balance ?? 0,
      bonusBalance: wallet?.bonus_balance ?? 0,
    };
  });

  return NextResponse.json({ users, total: count ?? 0, page, pageSize });
}
