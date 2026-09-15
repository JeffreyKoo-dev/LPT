import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * 충전 단위별 지급 보석(보너스 포함) — cash_charge_options 테이블에서 조회한다.
 * 예전엔 이 파일에 하드코딩돼 있었는데, 프로모션 실험(충전 이벤트 등)을
 * 코드 재배포 없이 SQL로 바로 반영할 수 있도록 DB로 옮겼다.
 *
 * 클라이언트(lib/wallet.ts, /charge 페이지)와 서버 API 라우트
 * (api/payments/confirm) 양쪽에서 호출하므로, 어떤 Supabase 클라이언트를
 *쓸지는 호출부가 넘겨준다(브라우저용 anon 클라이언트든, 서버용
 * service_role 클라이언트든 상관없다 — 조회는 인증된 사용자면 누구나
 * 가능하도록 열려있다).
 */
export interface ChargeOption {
  krwAmount: number;
  cashAmount: number;
}

export async function getChargeOptions(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, "public", any>
): Promise<ChargeOption[]> {
  const { data, error } = await supabase
    .from("cash_charge_options")
    .select("krw_amount, cash_amount")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return (data ?? []).map((row) => ({ krwAmount: row.krw_amount, cashAmount: row.cash_amount }));
}

/** 특정 충전 금액에 대응하는 지급 보석만 필요할 때 (없으면 null) */
export async function getChargeCashAmount(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, "public", any>,
  krwAmount: number
): Promise<number | null> {
  const { data, error } = await supabase
    .from("cash_charge_options")
    .select("cash_amount")
    .eq("krw_amount", krwAmount)
    .eq("is_active", true)
    .maybeSingle();

  if (error) throw error;
  return data?.cash_amount ?? null;
}
