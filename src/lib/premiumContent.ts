import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { ProductCode } from "@/lib/wallet";

export interface PremiumContent {
  text: string;
  generatedAt: string;
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

/** premium_report / daeun_seun 전용 — 이미 생성해둔 콘텐츠가 있으면 가져온다 */
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
    return (data?.content as PremiumContent) ?? null;
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
