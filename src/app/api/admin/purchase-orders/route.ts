import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin, getAdminDbClient } from "@/lib/adminAuth";

export async function GET(req: NextRequest) {
  const { authorized } = await verifyAdmin(req);
  if (!authorized) return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });

  const supabase = getAdminDbClient();
  const { data, error } = await supabase
    .from("purchase_orders")
    .select("id, krw_amount, cash_amount, status, pg_provider, created_at, completed_at")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ orders: data ?? [] });
}
