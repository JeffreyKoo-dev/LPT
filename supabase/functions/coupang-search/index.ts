// Supabase Edge Function: coupang-search
//
// 쿠팡파트너스 Search API로 키워드에 맞는 상품을 검색해 제휴 링크가 포함된
// 결과를 반환한다. 이 API는 "시간당 최대 10회" 호출 제한이 있어(공식 정책),
// 매 사용자 요청마다 직접 호출하지 않고 coupang_product_cache 테이블에
// 캐싱한 결과를 재사용한다. 캐시가 20시간 넘게 오래됐을 때만 실제 API를
// 호출해 갱신한다.
//
// 배포 방법 (Supabase 대시보드 → Edge Functions → Deploy a new function
// → Via Editor 사용을 권장 — 로컬 CLI 번들링이 일부 네트워크 환경에서
// 인증서 문제로 실패하는 사례가 있었음):
//   함수 이름: coupang-search
//   Secrets: COUPANG_ACCESS_KEY, COUPANG_SECRET_KEY (쿠팡파트너스에서 발급)
//
// 쿠팡파트너스 API는 가입 즉시 쓸 수 있는 게 아니라, 판매 실적이 누적
// 15만원을 넘어야 API 키 발급/활성화가 가능하다 (쿠팡 측 정책, 코드로
// 우회 불가능).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ACCESS_KEY = Deno.env.get("COUPANG_ACCESS_KEY");
const SECRET_KEY = Deno.env.get("COUPANG_SECRET_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const CACHE_TTL_HOURS = 20;
const COUPANG_HOST = "https://api-gateway.coupang.com";
const SEARCH_PATH = "/v2/providers/affiliate_open_api/apis/openapi/products/search";

interface CoupangProduct {
  productId: number;
  productName: string;
  productPrice: number;
  productImage: string;
  productUrl: string;
  isRocket: boolean;
  isFreeShipping: boolean;
}

Deno.serve(async (req: Request) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { keyword } = await req.json();
    if (!keyword || typeof keyword !== "string") {
      return new Response(JSON.stringify({ products: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1) 캐시 확인
    const { data: cached } = await supabase
      .from("coupang_product_cache")
      .select("products, fetched_at")
      .eq("keyword", keyword)
      .maybeSingle();

    const isFresh =
      cached && Date.now() - new Date(cached.fetched_at).getTime() < CACHE_TTL_HOURS * 60 * 60 * 1000;

    if (isFresh) {
      return new Response(JSON.stringify({ products: cached.products, source: "cache" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2) 캐시가 없거나 오래됐으면 실제 API 호출
    if (!ACCESS_KEY || !SECRET_KEY) {
      console.error("[coupang-search] API 키 미설정");
      // 키가 없어도, 오래된 캐시라도 있으면 그거라도 반환 (서비스 흐름 유지)
      if (cached) {
        return new Response(JSON.stringify({ products: cached.products, source: "stale-cache" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ products: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    try {
      const products = await fetchFromCoupang(keyword);
      await supabase
        .from("coupang_product_cache")
        .upsert({ keyword, products, fetched_at: new Date().toISOString() });

      return new Response(JSON.stringify({ products, source: "live" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (apiError) {
      console.error("[coupang-search] API 호출 실패", apiError);
      // API 호출 실패(레이트리밋 등) 시, 오래된 캐시라도 있으면 폴백으로 반환
      if (cached) {
        return new Response(JSON.stringify({ products: cached.products, source: "stale-cache" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ products: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (error) {
    console.error("[coupang-search] 처리 실패", error);
    return new Response(JSON.stringify({ products: [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function fetchFromCoupang(keyword: string): Promise<CoupangProduct[]> {
  const query = `keyword=${encodeURIComponent(keyword)}&limit=10`;
  const authorization = await generateHmac("GET", SEARCH_PATH, query);

  const response = await fetch(`${COUPANG_HOST}${SEARCH_PATH}?${query}`, {
    method: "GET",
    headers: {
      Authorization: authorization,
      "Content-Type": "application/json;charset=UTF-8",
    },
  });

  if (!response.ok) {
    throw new Error(`쿠팡 API 오류: ${response.status}`);
  }

  const json = await response.json();
  return (json.data?.productData ?? []) as CoupangProduct[];
}

/** 쿠팡파트너스 HMAC-SHA256 서명 생성 (공식 가이드 알고리즘 그대로 구현) */
async function generateHmac(method: string, path: string, query: string): Promise<string> {
  const datetime = getGmtDatetime();
  const message = datetime + method + path + query;

  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(SECRET_KEY!),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signatureBuffer = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(message));
  const signature = Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return `CEA algorithm=HmacSHA256, access-key=${ACCESS_KEY}, signed-date=${datetime}, signature=${signature}`;
}

/** YYMMDD'T'HHMMSS'Z' (UTC) 형식 — 쿠팡 API가 요구하는 정확한 포맷 */
function getGmtDatetime(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const yy = String(now.getUTCFullYear()).slice(2);
  const mm = pad(now.getUTCMonth() + 1);
  const dd = pad(now.getUTCDate());
  const hh = pad(now.getUTCHours());
  const mi = pad(now.getUTCMinutes());
  const ss = pad(now.getUTCSeconds());
  return `${yy}${mm}${dd}T${hh}${mi}${ss}Z`;
}
