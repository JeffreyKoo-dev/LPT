import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin, getAdminDbClient } from "@/lib/adminAuth";

export async function GET(req: NextRequest) {
  const { authorized } = await verifyAdmin(req);
  if (!authorized) return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });

  const supabase = getAdminDbClient();

  const [{ count: totalUsers }, { count: recentSignups }, { data: completedOrders }, { count: reportCount }] =
    await Promise.all([
      supabase.from("user_profiles").select("*", { count: "exact", head: true }),
      supabase
        .from("user_profiles")
        .select("*", { count: "exact", head: true })
        .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
      supabase.from("purchase_orders").select("krw_amount").eq("status", "completed"),
      supabase.from("moderation_reports").select("*", { count: "exact", head: true }),
    ]);

  const totalRevenue = (completedOrders ?? []).reduce((sum, row) => sum + (row.krw_amount ?? 0), 0);

  return NextResponse.json({
    totalUsers: totalUsers ?? 0,
    recentSignups: recentSignups ?? 0,
    totalRevenue,
    totalOrders: completedOrders?.length ?? 0,
    reportCount: reportCount ?? 0,
  });
}
