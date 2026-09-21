import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin, getAdminDbClient } from "@/lib/adminAuth";

/**
 * 닉네임 또는 이메일로 사용자를 찾아, 지갑·최근 거래내역까지 한 번에
 * 보여준다 (CS 대응용). 검색어에 "@"가 있으면 이메일 검색, 없으면
 * 닉네임 검색으로 자동 분기한다.
 */
export async function GET(req: NextRequest) {
  const { authorized } = await verifyAdmin(req);
  if (!authorized) return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });

  const query = req.nextUrl.searchParams.get("nickname");
  if (!query) return NextResponse.json({ error: "검색어를 입력해주세요." }, { status: 400 });

  const supabase = getAdminDbClient();
  const isEmailSearch = query.includes("@");

  let userIds: string[];

  if (isEmailSearch) {
    // auth.users는 PostgREST로 직접 조회할 수 없어, Admin API의 filter로 검색한다
    // (이메일 부분/완전 일치 지원).
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 5,
      // @ts-expect-error - supabase-js 타입 선언에 filter가 아직 없지만 서버는 지원한다
      filter: query,
    });
    if (authError) return NextResponse.json({ error: authError.message }, { status: 500 });
    userIds = (authData?.users ?? []).map((u) => u.id);
    if (userIds.length === 0) return NextResponse.json({ users: [] });
  }

  const profileQuery = supabase
    .from("user_profiles")
    .select("user_id, nickname, lpt_type_id, xp, created_at");

  const { data: profile, error: profileError } = isEmailSearch
    ? await profileQuery.in("user_id", userIds!).limit(5)
    : await profileQuery.ilike("nickname", `%${query}%`).limit(5);

  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 });
  if (!profile || profile.length === 0) return NextResponse.json({ users: [] });

  const foundUserIds = profile.map((p) => p.user_id);
  const [{ data: wallets }, { data: transactions }] = await Promise.all([
    supabase.from("wallets").select("user_id, cash_balance, bonus_balance").in("user_id", foundUserIds),
    supabase
      .from("wallet_transactions")
      .select("user_id, type, amount, balance_after, description, created_at")
      .in("user_id", foundUserIds)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const users = profile.map((p) => {
    const wallet = wallets?.find((w) => w.user_id === p.user_id);
    return {
      ...p,
      cashBalance: wallet?.cash_balance ?? 0,
      bonusBalance: wallet?.bonus_balance ?? 0,
      recentTransactions: (transactions ?? []).filter((t) => t.user_id === p.user_id).slice(0, 10),
    };
  });

  return NextResponse.json({ users });
}
