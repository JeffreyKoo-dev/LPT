import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { ProductCode } from "@/lib/wallet";

export interface PremiumContent {
  text: string;
  generatedAt: string;
  /** monthly_fortune 전용 — 이 콘텐츠가 어느 달 것인지("2026-09"). 다른 상품은 비워둠. */
  yearMonth?: string;
}

function getCurrentYearMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/** 해당 상품을 이미 결제했는지 확인한다 (wallet_transactions의 차감 기록 존재 여부) */
export async function hasPurchased(productCode: ProductCode): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;

  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("wallet_transactions")
      .select("id")
      .eq("product_code", productCode)
      .eq("type", "spend")
      .limit(1);
    if (error) throw error;
    return (data?.length ?? 0) > 0;
  } catch (error) {
    console.error("[premiumContent] 결제 여부 확인 실패", error);
    return false;
  }
}

/**
 * monthly_fortune 전용 — "이번 달에" 결제한 적 있는지 확인한다. 지난달에
 * 결제했더라도 이번 달은 다시 결제해야 한다(매달 바뀌는 콘텐츠라는 상품의
 * 핵심 가치 — hasPurchased()와 달리 "평생 한 번"이 아니라 "이번 달에 한
 * 번"을 확인한다).
 */
export async function hasPurchasedThisMonth(productCode: ProductCode): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;

  try {
    const supabase = getSupabaseClient();
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { data, error } = await supabase
      .from("wallet_transactions")
      .select("id")
      .eq("product_code", productCode)
      .eq("type", "spend")
      .gte("created_at", startOfMonth.toISOString())
      .limit(1);
    if (error) throw error;
    return (data?.length ?? 0) > 0;
  } catch (error) {
    console.error("[premiumContent] 이번 달 결제 여부 확인 실패", error);
    return false;
  }
}

/** premium_report / daeun_seun / monthly_fortune 전용 — 이미 생성해둔 콘텐츠가 있으면 가져온다 */
export async function getCachedContent(productCode: ProductCode): Promise<PremiumContent | null> {
  if (!isSupabaseConfigured()) return null;

  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("premium_content")
      .select("content")
      .eq("product_code", productCode)
      .maybeSingle();
    if (error) throw error;
    const content = (data?.content as PremiumContent) ?? null;

    // monthly_fortune은 캐시가 이번 달 것일 때만 유효하다 — 지난달 캐시가
    // 남아있어도 그대로 보여주면 안 된다(상품의 핵심 가치를 해침).
    if (content && productCode === "monthly_fortune" && content.yearMonth !== getCurrentYearMonth()) {
      return null;
    }

    return content;
  } catch (error) {
    console.error("[premiumContent] 콘텐츠 조회 실패", error);
    return null;
  }
}

/**
 * 결제 완료 후(또는 이미 결제된 상태에서 콘텐츠만 없을 때) AI 콘텐츠 생성을
 * 요청한다. 결제 여부는 서버(Edge Function)가 wallet_transactions로 다시
 * 검증하므로, 재결제 없이 여러 번 호출해도 안전하다.
 */
export async function generatePremiumContent(
  productCode: ProductCode,
  context: Record<string, unknown>
): Promise<PremiumContent> {
  if (!isSupabaseConfigured()) throw new Error("이 기능을 사용할 수 없는 환경입니다.");

  const supabase = getSupabaseClient();
  const { data, error } = await supabase.functions.invoke("generate-premium-content", {
    body: { productCode, context },
  });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);

  return data.content as PremiumContent;
}
