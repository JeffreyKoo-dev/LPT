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

  // 이메일 검색은 auth.users 기준으로 찾는다. 카카오 가입자는 auth.users.email이 비어
  // 있고 이메일이 메타데이터/identities에만 있을 수 있으며, 닉네임·프로필이 아직 없는
  // 가입자도 있으므로 프로필이 없어도 결과에 포함한다.
  type AuthMatch = { id: string; email: string | null; created_at: string };
  const authMatches: AuthMatch[] = [];

  if (isEmailSearch) {
    // Admin API의 listUsers는 이메일 filter를 지원하지 않아 페이지를 넘기며 직접 거른다.
    const needle = query.trim().toLowerCase();
    const PER_PAGE = 200;
    const MAX_PAGES = 25; // 최대 5,000명까지 검색
    for (let page = 1; page <= MAX_PAGES && authMatches.length < 5; page++) {
      const { data: authData, error: authError } = await supabase.auth.admin.listUsers({
        page,
        perPage: PER_PAGE,
      });
      if (authError) return NextResponse.json({ error: authError.message }, { status: 500 });
      const users = authData?.users ?? [];
      for (const u of users) {
        const meta = (u.user_metadata ?? {}) as { email?: string };
        const candidates = [
          u.email,
          meta.email,
          ...(u.identities ?? []).map((i) => (i.identity_data as { email?: string } | undefined)?.email),
        ]
          .filter((v): v is string => typeof v === "string" && v.length > 0)
          .map((v) => v.toLowerCase());
        if (candidates.some((c) => c.includes(needle))) {
          authMatches.push({
            id: u.id,
            email: u.email ?? meta.email ?? candidates[0] ?? null,
            created_at: u.created_at,
          });
        }
        if (authMatches.length >= 5) break;
      }
      if (users.length < PER_PAGE) break;
    }
    if (authMatches.length === 0) return NextResponse.json({ users: [] });
  }

  const profileQuery = supabase
    .from("user_profiles")
    .select("user_id, nickname, lpt_type_id, xp, created_at");

  const { data: profileRows, error: profileError } = isEmailSearch
    ? await profileQuery.in("user_id", authMatches.map((m) => m.id))
    : await profileQuery.ilike("nickname", `%${query}%`).limit(5);

  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 });

  const profile = isEmailSearch
    ? authMatches.map((m) => {
        const pr = profileRows?.find((r) => r.user_id === m.id);
        return {
          user_id: m.id,
          nickname: pr?.nickname ?? `(닉네임 없음) ${m.email ?? ""}`.trim(),
          lpt_type_id: pr?.lpt_type_id ?? null,
          xp: pr?.xp ?? 0,
          created_at: pr?.created_at ?? m.created_at,
        };
      })
    : (profileRows ?? []);
  if (profile.length === 0) return NextResponse.json({ users: [] });

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
