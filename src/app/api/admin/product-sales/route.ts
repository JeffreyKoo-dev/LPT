import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin, getAdminDbClient } from "@/lib/adminAuth";

/** 어떤 유료 콘텐츠가 실제로 잘 팔리는지, 상품 코드별 판매 건수·캐시 매출을 집계한다. */
export async function GET(req: NextRequest) {
  const { authorized } = await verifyAdmin(req);
  if (!authorized) return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });

  const supabase = getAdminDbClient();
  const { data, error } = await supabase
    .from("wallet_transactions")
    .select("product_code, amount")
    .eq("type", "spend")
    .not("product_code", "is", null);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const grouped = new Map<string, { count: number; totalCash: number }>();
  for (const row of data ?? []) {
    const code = row.product_code as string;
    const entry = grouped.get(code) ?? { count: 0, totalCash: 0 };
    entry.count += 1;
    entry.totalCash += Math.abs(row.amount);
    grouped.set(code, entry);
  }

  const sales = Array.from(grouped.entries())
    .map(([productCode, stats]) => ({ productCode, ...stats }))
    .sort((a, b) => b.count - a.count);

  return NextResponse.json({ sales });
}
