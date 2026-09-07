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
