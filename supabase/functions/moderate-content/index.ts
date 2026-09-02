// Supabase Edge Function: moderate-content
//
// 닉네임 등 사용자 입력 텍스트를 Anthropic API로 의미 기반 검수한다.
// 종교적 문제, 성적 비하, 인종적 문제, 장애 관련 비하 표현이 감지되면
// moderation_reports 테이블에 기록하고 차단 응답을 반환한다.
//
// 배포 방법 (Supabase CLI 필요):
//   supabase functions deploy moderate-content
//   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
//
// 클라이언트에서는 이 함수를 호출만 하고, Anthropic API 키는 절대
// 클라이언트 코드에 노출되지 않는다 (Edge Function 안에서만 사용).

import { createClient } from "npm:@supabase/supabase-js@2";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const CATEGORIES = ["religious", "sexual", "racial", "disability", "other", "none"] as const;

Deno.serve(async (req: Request) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { fieldName, text, userId } = await req.json();

    if (!text || typeof text !== "string") {
      return new Response(JSON.stringify({ allowed: false, reason: "입력이 비어있어요." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    if (!ANTHROPIC_API_KEY) {
      // 키가 설정 안 됐으면 차단하지 않고 통과시킨다 (서비스 흐름을 막지 않기 위함).
      // 대신 로그를 남겨 관리자가 설정 누락을 알아챌 수 있게 한다.
      console.error("[moderate-content] ANTHROPIC_API_KEY 미설정 — 검수 없이 통과");
      return new Response(JSON.stringify({ allowed: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const classification = await classifyText(text);

    if (classification.category !== "none") {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      await supabase.from("moderation_reports").insert({
        field_name: fieldName ?? "unknown",
        content_snippet: text.slice(0, 500),
        category: classification.category,
        severity: "blocked",
        user_id: userId ?? null,
      });

      return new Response(
        JSON.stringify({ allowed: false, reason: "부적절할 수 있는 표현이 포함되어 있어요." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ allowed: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[moderate-content] 처리 실패", error);
    // 검수 자체가 실패해도 서비스 이용 자체를 막지는 않는다.
    return new Response(JSON.stringify({ allowed: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function classifyText(text: string): Promise<{ category: (typeof CATEGORIES)[number] }> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 20,
      system:
        "당신은 사용자 닉네임을 검수하는 필터입니다. 아래 텍스트에 종교 비하, 성적 비하, " +
        "인종/민족 비하, 장애 비하 표현이 있는지 판단하세요. " +
        "religious, sexual, racial, disability, other(그 외 심한 욕설·혐오 표현), none(문제없음) " +
        "중 하나의 단어만 정확히 출력하세요. 다른 설명은 절대 추가하지 마세요.",
      messages: [{ role: "user", content: text }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Anthropic API 오류: ${response.status}`);
  }

  const data = await response.json();
  const rawLabel = (data.content?.[0]?.text ?? "none").trim().toLowerCase();
  const category = CATEGORIES.includes(rawLabel as (typeof CATEGORIES)[number])
    ? (rawLabel as (typeof CATEGORIES)[number])
    : "none";

  return { category };
}
