import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin, getAdminDbClient } from "@/lib/adminAuth";

/** 닉네임으로 사용자를 찾아, 지갑·최근 거래내역까지 한 번에 보여준다 (CS 대응용). */
export async function GET(req: NextRequest) {
  const { authorized } = await verifyAdmin(req);
  if (!authorized) return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });

  const nickname = req.nextUrl.searchParams.get("nickname");
  if (!nickname) return NextResponse.json({ error: "닉네임을 입력해주세요." }, { status: 400 });

  const supabase = getAdminDbClient();

  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select("user_id, nickname, lpt_type_id, xp, created_at")
    .ilike("nickname", `%${nickname}%`)
    .limit(5);

  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 });
  if (!profile || profile.length === 0) return NextResponse.json({ users: [] });

  const userIds = profile.map((p) => p.user_id);
  const [{ data: wallets }, { data: transactions }] = await Promise.all([
    supabase.from("wallets").select("user_id, cash_balance").in("user_id", userIds),
    supabase
      .from("wallet_transactions")
      .select("user_id, type, amount, balance_after, description, created_at")
      .in("user_id", userIds)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const users = profile.map((p) => ({
    ...p,
    cashBalance: wallets?.find((w) => w.user_id === p.user_id)?.cash_balance ?? 0,
    recentTransactions: (transactions ?? []).filter((t) => t.user_id === p.user_id).slice(0, 10),
  }));

  return NextResponse.json({ users });
}
