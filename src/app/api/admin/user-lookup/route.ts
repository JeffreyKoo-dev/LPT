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
    // auth.users는 PostgREST로 직접 조회할 수 없다. Admin API의 listUsers는 이메일
    // filter 파라미터를 지원하지 않아(무시되어 항상 첫 페이지가 돌아옴) 검색 결과가
    // 늘 같은 사람으로 나오던 문제가 있었다. 그래서 페이지를 넘기며 직접 부분 일치로 거른다.
    const needle = query.trim().toLowerCase();
    const matched: string[] = [];
    const PER_PAGE = 200;
    const MAX_PAGES = 25; // 최대 5,000명까지 검색
    for (let page = 1; page <= MAX_PAGES && matched.length < 5; page++) {
      const { data: authData, error: authError } = await supabase.auth.admin.listUsers({
        page,
        perPage: PER_PAGE,
      });
      if (authError) return NextResponse.json({ error: authError.message }, { status: 500 });
      const users = authData?.users ?? [];
      for (const u of users) {
        if ((u.email ?? "").toLowerCase().includes(needle)) matched.push(u.id);
        if (matched.length >= 5) break;
      }
      if (users.length < PER_PAGE) break;
    }
    userIds = matched;
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
