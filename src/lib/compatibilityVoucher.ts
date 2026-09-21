import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";

/** 보유 궁합권 개수를 조회한다. */
export async function getVoucherCount(): Promise<number> {
  if (!isSupabaseConfigured()) return 0;

  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("compatibility_vouchers")
      .select("remaining_count")
      .maybeSingle();
    if (error) throw error;
    return data?.remaining_count ?? 0;
  } catch (error) {
    console.error("[compatibilityVoucher] 궁합권 조회 실패", error);
    return 0;
  }
}

/** 3인 세트 번들을 구매한다(실제 보석 결제). */
export async function purchaseBundle(): Promise<{ newBalance: number; vouchers: number }> {
  if (!isSupabaseConfigured()) throw new Error("이 기능을 사용할 수 없는 환경입니다.");

  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc("purchase_compatibility_bundle");
  if (error) throw new Error(error.message);

  const row = data?.[0];
  return { newBalance: row?.new_balance ?? 0, vouchers: row?.vouchers ?? 0 };
}

/** 궁합권 1개를 소모한다(있을 때만 성공). 결제(캐시 차감)는 이미 번들 구매 시 끝났다. */
export async function redeemVoucher(): Promise<{ redeemed: boolean; remaining: number }> {
  if (!isSupabaseConfigured()) throw new Error("이 기능을 사용할 수 없는 환경입니다.");

  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc("redeem_compatibility_voucher");
  if (error) throw new Error(error.message);

  const row = data?.[0];
  return { redeemed: row?.redeemed ?? false, remaining: row?.remaining ?? 0 };
}
