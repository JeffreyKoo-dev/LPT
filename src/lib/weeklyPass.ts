import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";

/** 현재 유효한 주간 이용권의 만료 시각을 조회한다 (없거나 만료됐으면 null). */
export async function getActivePassExpiry(): Promise<Date | null> {
  if (!isSupabaseConfigured()) return null;

  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("active_passes")
      .select("expires_at")
      .eq("pass_type", "weekly_pass")
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();
    if (error) throw error;
    return data ? new Date(data.expires_at) : null;
  } catch (error) {
    console.error("[weeklyPass] 이용권 조회 실패", error);
    return null;
  }
}

/** 주간 이용권을 구매(또는 연장)한다. */
export async function purchaseWeeklyPass(): Promise<{ newBalance: number; expiresAt: Date }> {
  if (!isSupabaseConfigured()) throw new Error("이 기능을 사용할 수 없는 환경입니다.");

  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc("purchase_weekly_pass");
  if (error) throw new Error(error.message);

  const row = data?.[0];
  return { newBalance: row?.new_balance ?? 0, expiresAt: new Date(row?.expires_at) };
}
