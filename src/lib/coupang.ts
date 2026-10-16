import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";

export interface CoupangProduct {
  productId: number;
  productName: string;
  productPrice: number;
  productImage: string;
  productUrl: string; // 이미 제휴 추적이 걸린 링크
  isRocket: boolean;
  isFreeShipping: boolean;
}

/**
 * 키워드로 쿠팡파트너스 상품을 검색한다. 실제 API는 서버(Edge Function)의
 * 캐시를 거쳐 호출되므로, 시간당 호출 제한을 신경 쓸 필요 없이 이 함수를
 * 그대로 써도 된다. Supabase 미설정이거나 실패 시 빈 배열을 반환해
 * 서비스 흐름을 막지 않는다(호출부에서 큐레이션된 정적 데이터로 폴백해야 함).
 */
export async function searchCoupangProducts(keyword: string): Promise<CoupangProduct[]> {
  if (!isSupabaseConfigured()) return [];

  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.functions.invoke("coupang-search", {
      body: { keyword },
    });
    if (error) throw error;
    return (data?.products ?? []) as CoupangProduct[];
  } catch (error) {
    console.error("[coupang] 상품 검색 실패", error);
    return [];
  }
}

/**
 * 수동 생성한 쿠팡 파트너스 단축 링크인지 확인한다. 쿠팡 파트너스 "링크 생성"
 * 결과는 link.coupang.com/a/... 또는 coupa.ng/... 형태다. 이 두 도메인만 허용해
 * 오타나 임의 URL이 "제휴 링크"로 노출되는 것을 막는다.
 */
export function isCoupangAffiliateUrl(url: string | undefined): url is string {
  if (!url) return false;
  try {
    const { protocol, hostname } = new URL(url);
    if (protocol !== "https:") return false;
    return hostname === "link.coupang.com" || hostname === "coupa.ng";
  } catch {
    return false;
  }
}

/**
 * 제휴 링크용 rel 값. sponsored/nofollow로 유료 제휴 링크임을 검색엔진에 알린다.
 * noreferrer는 일부러 뺀다 — 쿠팡이 유입 채널(등록된 사이트)을 확인할 수 있어야 한다.
 */
export const AFFILIATE_LINK_REL = "sponsored nofollow noopener";
