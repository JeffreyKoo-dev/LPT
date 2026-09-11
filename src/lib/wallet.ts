import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { CHARGE_OPTIONS } from "@/lib/chargeOptions";

/**
 * 캐시 지갑 클라이언트 래퍼. 모든 잔액 변경은 Supabase RPC(SECURITY DEFINER
 * 함수)를 통해서만 이뤄지며, 이 파일에서 테이블을 직접 insert/update하지
 * 않는다. Supabase 미설정 환경에서는 각 함수가 null/빈 값으로 안전하게
 * 반환되어 서비스 흐름을 막지 않는다.
 */

export type ProductCode =
  | "daily_card_unlock"
  | "premium_report"
  | "compatibility_deep"
  | "daeun_seun";

export interface ProductPrice {
  product_code: ProductCode;
  display_name: string;
  cash_price: number;
  ai_model: string | null;
  ad_unlockable: boolean;
  is_active: boolean;
}

/** 현재 활성화된 가격표 조회 (광고 버튼 노출 여부 판단에 사용) */
export async function getProductPrices(): Promise<ProductPrice[]> {
  if (!isSupabaseConfigured()) return [];

  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from("product_prices").select("*").eq("is_active", true);
    if (error) throw error;
    return (data ?? []) as ProductPrice[];
  } catch (error) {
    console.error("[wallet] 가격표 조회 실패", error);
    return [];
  }
}

/** 현재 유저 캐시 잔액 조회. 로그인 상태가 아니거나 실패하면 null. */
export async function getWalletBalance(): Promise<number | null> {
  if (!isSupabaseConfigured()) return null;

  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from("wallets").select("cash_balance").maybeSingle();
    if (error) throw error;
    return data?.cash_balance ?? null;
  } catch (error) {
    console.error("[wallet] 잔액 조회 실패", error);
    return null;
  }
}

/** 최근 거래 내역 조회 */
export interface WalletTransaction {
  id: string;
  type: "charge" | "spend" | "ad_reward" | "refund";
  amount: number;
  balance_after: number;
  description: string | null;
  created_at: string;
}

export async function getWalletTransactions(limit = 10): Promise<WalletTransaction[]> {
  if (!isSupabaseConfigured()) return [];

  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("wallet_transactions")
      .select("id, type, amount, balance_after, description, created_at")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []) as WalletTransaction[];
  } catch (error) {
    console.error("[wallet] 거래내역 조회 실패", error);
    return [];
  }
}

/**
 * 리워드 광고 시청 완료 콜백에서 호출한다.
 * 서버(Postgres 함수)가 하루 3회 상한을 최종 검증하므로, 프론트에서 미리
 * 카운트를 표시하더라도 반드시 이 호출 결과를 신뢰해야 한다.
 */
export async function claimAdCashReward(
  rewardAmount = 100
): Promise<{ newBalance: number; remainingToday: number }> {
  if (!isSupabaseConfigured()) throw new Error("결제 기능을 사용할 수 없는 환경입니다.");

  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc("grant_ad_cash_reward", {
    p_reward_amount: rewardAmount,
  });
  if (error) throw new Error(error.message);

  const row = data?.[0];
  return { newBalance: row?.new_balance ?? 0, remainingToday: row?.remaining_today ?? 0 };
}

/**
 * 오늘의 카드 등 일일 콘텐츠 해제. method='ad' 요청은 product_prices의
 * ad_unlockable=false인 상품이면 서버에서 자동 거부된다 — 프론트는
 * isAdUnlockable()로 버튼 노출 여부만 미리 필터링한다.
 */
export async function unlockDailyContent(
  productCode: ProductCode,
  method: "cash" | "ad"
): Promise<{ unlocked: boolean; newBalance: number }> {
  if (!isSupabaseConfigured()) throw new Error("결제 기능을 사용할 수 없는 환경입니다.");

  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc("unlock_daily_content", {
    p_product_code: productCode,
    p_method: method,
  });
  if (error) throw new Error(error.message);

  const row = data?.[0];
  return { unlocked: row?.unlocked ?? false, newBalance: row?.new_balance ?? 0 };
}

/** 정밀 리포트/궁합분석/대운세운 등 일반 상품 캐시 결제 (광고 해제 경로 없음) */
export async function purchaseProduct(
  productCode: ProductCode,
  referenceId?: string
): Promise<{ newBalance: number }> {
  if (!isSupabaseConfigured()) throw new Error("결제 기능을 사용할 수 없는 환경입니다.");

  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc("purchase_product", {
    p_product_code: productCode,
    p_reference_id: referenceId ?? null,
  });
  if (error) throw new Error(error.message);

  return { newBalance: data?.[0]?.new_balance ?? 0 };
}

/** 오늘 이미 해당 상품을 해제했는지 확인한다 (일일 콘텐츠 재구매 방지 UI용) */
export async function hasUnlockedToday(productCode: ProductCode): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;

  try {
    const supabase = getSupabaseClient();
    const today = new Date().toISOString().slice(0, 10);
    const { data, error } = await supabase
      .from("daily_unlocks")
      .select("product_code")
      .eq("product_code", productCode)
      .eq("unlock_date", today)
      .maybeSingle();
    if (error) throw error;
    return !!data;
  } catch (error) {
    console.error("[wallet] 오늘 해제 여부 조회 실패", error);
    return false;
  }
}

/**
 * 특정 상품이 광고로 해제 가능한지 프론트에서 미리 판단한다.
 * "광고 보고 무료로 열기" 버튼은 이 값이 true일 때만 렌더링한다.
 * (서버도 동일 조건을 재검증하므로 이중 방어)
 */
export function isAdUnlockable(prices: ProductPrice[], code: ProductCode): boolean {
  return prices.find((p) => p.product_code === code)?.ad_unlockable ?? false;
}

export function getProductPrice(prices: ProductPrice[], code: ProductCode): ProductPrice | undefined {
  return prices.find((p) => p.product_code === code);
}

/**
 * 결제 시작 전, 결제할 주문을 미리 DB에 남겨둔다(status='pending'). 이 값을
 * /api/payments/confirm이 나중에 조회해 "실제로 우리가 시작한 결제인지",
 * "금액이 조작되지 않았는지"를 대조하는 기준으로 쓴다.
 */
export async function createPendingOrder(krwAmount: number): Promise<{ orderId: string } | null> {
  if (!isSupabaseConfigured()) return null;
  const cashAmount = CHARGE_OPTIONS[krwAmount];
  if (!cashAmount) throw new Error(`등록되지 않은 충전 금액: ${krwAmount}`);

  try {
    const supabase = getSupabaseClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new Error("로그인이 필요합니다.");

    const { data, error } = await supabase
      .from("purchase_orders")
      .insert({
        user_id: userData.user.id,
        krw_amount: krwAmount,
        cash_amount: cashAmount,
        pg_provider: "tosspayments",
      })
      .select("id")
      .single();

    if (error) throw error;
    return { orderId: data.id };
  } catch (error) {
    console.error("[wallet] 주문 생성 실패", error);
    return null;
  }
}
