import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { ProductCode } from "@/lib/wallet";
import { getStorage, STORAGE_KEYS } from "@/lib/storage";
import type { BasicInfo } from "@/types/user";
import { getFortuneYear, getFortuneYearWindow, getKstMonthStart, getKstYearMonth } from "@/lib/kst";

export interface PremiumContent {
  text: string;
  generatedAt: string;
  /** monthly_fortune 전용 — 이 콘텐츠가 어느 달 것인지("2026-09"). 다른 상품은 비워둠. */
  yearMonth?: string;
  /** yearly_fortune 전용 — 이 콘텐츠가 어느 해 것인지("2026"). 다른 상품은 비워둠. */
  year?: string;
  /** monthly_fortune 전용 — 콘텐츠 버전. 2부터 달력월을 절기월 구간으로 나눠 계산한 데이터를 쓴다. */
  version?: number;
}

/**
 * 이번 달 운세 콘텐츠 버전(supabase/functions/generate-premium-content/index.ts와 같은 값).
 * 버전이 다른 이전 캐시는 보여주지 않고 새로 생성하게 한다(결제는 이번 달 것으로 그대로 인정).
 */
const MONTHLY_CONTENT_VERSION = 2;

// 연·월 판정은 서버(Edge Function, UTC)와 같도록 한국 표준시(KST) 기준으로 한다 (lib/kst.ts 참고).
function getCurrentYearMonth(): string {
  return getKstYearMonth();
}

/** 신년운세의 대상 연도. 12월부터는 다음 해 운세를 가리킨다. */
function getCurrentYear(): string {
  return String(getFortuneYear());
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
    const startOfMonth = getKstMonthStart();

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

/**
 * yearly_fortune 전용 — 지금 파는 대상 연도의 운세를 이미 결제했는지 확인한다.
 * 대상 연도 Y의 결제는 (Y-1)년 12/1 ~ Y년 11/30(KST)에 한 결제로 본다. 그래서 2026년에
 * 산 사람도 12/1부터 2027년 운세를 다시 살 수 있다.
 */
export async function hasPurchasedThisYear(productCode: ProductCode): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;

  try {
    const supabase = getSupabaseClient();
    const { start, end } = getFortuneYearWindow(getFortuneYear());

    const { data, error } = await supabase
      .from("wallet_transactions")
      .select("id")
      .eq("product_code", productCode)
      .eq("type", "spend")
      .gte("created_at", start.toISOString())
      .lt("created_at", end.toISOString())
      .limit(1);
    if (error) throw error;
    return (data?.length ?? 0) > 0;
  } catch (error) {
    console.error("[premiumContent] 올해 결제 여부 확인 실패", error);
    return false;
  }
}

/** premium_report / daeun_seun / monthly_fortune / yearly_fortune 전용 — 이미 생성해둔 콘텐츠가 있으면 가져온다 */
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
    if (!content) return null;

    // monthly_fortune / yearly_fortune은 콘텐츠가 이번 기간 것일 때만 유효하다
    // — 지난 기간 콘텐츠가 남아있어도 그대로 보여주면 안 된다(상품의 핵심 가치를 해침).
    if (
      productCode === "monthly_fortune" &&
      (content.yearMonth !== getCurrentYearMonth() || content.version !== MONTHLY_CONTENT_VERSION)
    ) {
      return null;
    }
    if (productCode === "yearly_fortune" && content.year !== getCurrentYear()) {
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
    // 호칭용 이름(닉네임). 없으면 서버가 주어를 생략하는 문장으로 쓴다.
    body: { productCode, context, userName: getStorage().get<BasicInfo>(STORAGE_KEYS.basicInfo)?.nickname ?? "" },
  });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);

  return data.content as PremiumContent;
}
