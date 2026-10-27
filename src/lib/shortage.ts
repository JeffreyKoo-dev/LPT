import { getWalletBalances } from "@/lib/wallet";
import { getChargeOptions, ChargeOption } from "@/lib/chargeOptions";
import { getSupabaseClient } from "@/lib/supabase/client";

export interface Shortage {
  /** 부족한 보석 개수 */
  amount: number;
  /** 부족분을 채우는 가장 작은 충전 옵션 (옵션을 못 불러오면 null) */
  option: ChargeOption | null;
}

/**
 * 결제 전에 보석이 모자란지 확인한다. 모자라면 부족분과 추천 충전 옵션을 돌려주고,
 * 충분하거나 잔액을 못 읽으면 null(→ 서버가 최종 판단하도록 결제 진행).
 * spendableIncludesBonus: 별조각도 쓸 수 있는 상품이면 true (광고로 해제 가능한 상품).
 */
export async function checkShortage(price: number, spendableIncludesBonus: boolean): Promise<Shortage | null> {
  const balances = await getWalletBalances();
  if (!balances) return null;

  const spendable = spendableIncludesBonus ? balances.totalBalance : balances.cashBalance;
  const missing = price - spendable;
  if (missing <= 0) return null;

  const options = await getChargeOptions(getSupabaseClient()).catch(() => [] as ChargeOption[]);
  const option = options.find((o) => o.cashAmount >= missing) ?? options[options.length - 1] ?? null;
  return { amount: missing, option };
}
