// Supabase Edge Function: generate-premium-content
//
// 캐시 결제가 완료된 유료 콘텐츠(정밀 사주 리포트 / 심층 궁합 분석 /
// 대운·세운 해석 / 이번 달 운세)의 AI 해석문을 생성한다. 결제
// (purchase_product RPC)와 생성은 분리된 단계라, 결제 성공 후 이 함수
// 호출이 실패해도 캐시가 사라지지 않는다 — 클라이언트는 재결제 없이 이
// 함수만 다시 호출하면 된다 (lib/premiumContent.ts의 hasPurchased()로
// 결제 여부를 별도 확인).
//
// premium_report / daeun_seun / monthly_fortune: 본인 소유 데이터라 결과를
// premium_content 테이블에 저장해 재조회 시 재사용한다. monthly_fortune만
// "이번 달에 한해서만" 유효한 결제/캐시로 취급한다 — 매달 바뀌는
// 콘텐츠라는 상품의 핵심 가치라, 지난달 결제·캐시로는 이번 달 콘텐츠를
// 못 본다 (lib/premiumContent.ts의 hasPurchasedThisMonth와 대칭).
// compatibility_deep: 상대방 생년월일 등은 저장하지 않는다는 기존 원칙
// (/compatibility 페이지에 명시)과 일관되게, 이 상품은 저장하지 않고
// 매번 그 자리에서 생성해 응답만 반환한다.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const TONE_GUIDE =
  "말투 원칙: 모든 문장은 '~일 수 있어요', '~한 경향이 있어요'처럼 경향과 가능성으로 " +
  "표현하세요. '반드시', '확실히', '~할 것이다'처럼 단정하는 표현은 쓰지 마세요. " +
  "따뜻하고 존중하는 톤으로, 2인칭 존댓말('~님')을 사용하세요.\n" +
  "형식 원칙: 마크다운 문법을 절대 쓰지 마세요 — #으로 시작하는 제목, **로 감싸는 " +
  "굵은 글씨, 목록(-, 1. 등)을 전부 쓰지 마세요. 소제목이나 구분선 없이, 자연스럽게 " +
  "이어지는 문단(순수 텍스트)으로만 작성하세요. 강조하고 싶은 단어가 있어도 특수문자로 " +
  "감싸지 말고 문장 구조나 어순으로 자연스럽게 강조하세요.";

// ── 한국 표준시(KST) 기준 연·월 판정 ──────────────────────────────────────────
// 이 함수는 UTC로 도는데 사용자는 KST라, 로컬 시간을 쓰면 1/1 0~9시(KST) 같은 경계에서
// 서버만 아직 작년·지난달로 판단해 결제 내역을 못 찾는다. 아래 헬퍼는 src/lib/kst.ts와
// 같은 로직이므로 한쪽을 고치면 반드시 다른 쪽도 같이 고칠 것.
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

function getKstDate(now: Date = new Date()) {
  const k = new Date(now.getTime() + KST_OFFSET_MS);
  return { year: k.getUTCFullYear(), month: k.getUTCMonth() + 1 };
}

function getCurrentYearMonth(): string {
  const { year, month } = getKstDate();
  return `${year}-${String(month).padStart(2, "0")}`;
}

function getKstMonthStart(): Date {
  const { year, month } = getKstDate();
  return new Date(Date.UTC(year, month - 1, 1) - KST_OFFSET_MS);
}

/** 신년운세 대상 연도 — 12월부터는 다음 해 운세를 판다 (src/lib/kst.ts getFortuneYear와 동일) */
function getFortuneYear(): number {
  const { year, month } = getKstDate();
  return month === 12 ? year + 1 : year;
}

/** 대상 연도 Y의 결제 인정 기간: (Y-1)년 12/1 00:00 KST ~ Y년 12/1 00:00 KST */
function getFortuneYearWindow(targetYear: number): { start: Date; end: Date } {
  return {
    start: new Date(Date.UTC(targetYear - 1, 11, 1) - KST_OFFSET_MS),
    end: new Date(Date.UTC(targetYear, 11, 1) - KST_OFFSET_MS),
  };
}

function getCurrentYear(): string {
  return String(getFortuneYear());
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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "인증이 필요합니다." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 호출자 확인용 클라이언트: 사용자의 JWT로 "누가 호출했는지"만 검증한다.
    const callerClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await callerClient.auth.getUser();
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: "인증이 유효하지 않습니다." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    // 관리자 클라이언트: 이후 모든 DB 읽기/쓰기는 이 클라이언트로만 수행한다.
    // (Authorization 헤더를 호출자 것으로 덮어쓰면 안 된다 — 그러면 RLS가
    // service_role이 아니라 호출자 권한으로 적용돼, premium_content처럼
    // 클라이언트 직접 write를 막아둔 테이블에 쓰기가 실패한다. 실제로 이
    // 문제로 500 에러가 발생했었다.)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { productCode, context } = await req.json();

    if (!ANTHROPIC_API_KEY) {
      return new Response(JSON.stringify({ error: "AI 콘텐츠 생성 기능이 아직 설정되지 않았습니다." }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 결제 여부 확인 — wallet_transactions에 해당 상품의 차감 기록이 있어야만 생성 진행
    // (service_role 클라이언트라 RLS 우회, 여기서 직접 조건을 검사한다)
    // monthly_fortune은 "이번 달에" 결제한 기록만 유효하다 — 지난달 결제로는
    // 이번 달 콘텐츠를 생성할 수 없다.
    let txQuery = supabase
      .from("wallet_transactions")
      .select("id")
      .eq("user_id", userId)
      .eq("product_code", productCode)
      .eq("type", "spend");

    if (productCode === "monthly_fortune") {
      txQuery = txQuery.gte("created_at", getKstMonthStart().toISOString());
    }
    if (productCode === "yearly_fortune") {
      // 대상 연도의 결제 인정 기간 안에서만 유효 (2026년 구매분으로 2027년 운세를 만들 수 없다)
      const { start, end } = getFortuneYearWindow(getFortuneYear());
      txQuery = txQuery.gte("created_at", start.toISOString()).lt("created_at", end.toISOString());

      // 클라이언트가 계산한 대상 연도가 서버 기준과 다르면(기기 시계 오류, 배포 시차) 엉뚱한 해의 운세가
      // 저장되지 않도록 막는다.
      const clientYear = (context as { yearlyFortune?: { year?: number | string } })?.yearlyFortune?.year;
      if (clientYear !== undefined && String(clientYear) !== getCurrentYear()) {
        return new Response(
          JSON.stringify({ error: "운세 연도 정보가 맞지 않아요. 페이지를 새로고침한 뒤 다시 시도해주세요." }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const { data: txRows } = await txQuery.limit(1);

    if (!txRows || txRows.length === 0) {
      return new Response(JSON.stringify({ error: "결제 내역을 찾을 수 없습니다." }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // premium_report / daeun_seun / monthly_fortune: 이미 생성해둔 캐시가 있으면 그대로 반환
    if (productCode !== "compatibility_deep") {
      const { data: cached } = await supabase
        .from("premium_content")
        .select("content")
        .eq("user_id", userId)
        .eq("product_code", productCode)
        .maybeSingle();

      // monthly_fortune은 캐시가 이번 달 것일 때만 유효하다 (지난달 캐시 무시)
      const cacheIsValid =
        cached &&
        (productCode !== "monthly_fortune" || cached.content?.yearMonth === getCurrentYearMonth()) &&
        (productCode !== "yearly_fortune" || cached.content?.year === getCurrentYear());

      if (cacheIsValid) {
        return new Response(JSON.stringify({ content: cached.content, source: "cache" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const prompt = buildPrompt(productCode, context);
    // 신년운세는 월별 12개 흐름까지 풀어 쓰므로 출력 한도를 넉넉하게 잡는다.
    const generatedText = await callClaude(prompt, productCode === "yearly_fortune" ? 3500 : 1024);
    const content: Record<string, unknown> = { text: generatedText, generatedAt: new Date().toISOString() };
    if (productCode === "monthly_fortune") {
      content.yearMonth = (context as { yearMonth?: string })?.yearMonth ?? getCurrentYearMonth();
    }
    if (productCode === "yearly_fortune") {
      content.year = getCurrentYear();
    }

    if (productCode !== "compatibility_deep") {
      await supabase.from("premium_content").upsert({ user_id: userId, product_code: productCode, content });
    }

    return new Response(JSON.stringify({ content, source: "live" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[generate-premium-content] 처리 실패", error);
    return new Response(JSON.stringify({ error: "콘텐츠 생성 중 오류가 발생했습니다." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function buildPrompt(productCode: string, context: Record<string, unknown>): string {
  if (productCode === "premium_report") {
    return (
      `${TONE_GUIDE}\n\n` +
      `아래는 한 사람의 사주 분석 데이터입니다. 이 데이터를 바탕으로, 무료 리포트보다 ` +
      `더 깊이 있는 정밀 해석을 8~12문장 분량으로 작성하세요. 오행 균형, 십성 조합이 ` +
      `보여주는 성향의 결, 삶에서 반복될 수 있는 주제, 강점과 성장 포인트를 자연스러운 ` +
      `문단으로 풀어주세요. 목록이나 소제목 없이 이어지는 글로 작성하세요.\n\n` +
      `데이터: ${JSON.stringify(context)}`
    );
  }

  if (productCode === "compatibility_deep") {
    return (
      `${TONE_GUIDE}\n\n` +
      `아래는 두 사람의 사주 기반 궁합 데이터(기본 점수·헤드라인 포함)입니다. 이 데이터를 ` +
      `바탕으로, 두 사람의 일간(日干)과 오행이 어떻게 상호작용하는지, 서로 잘 맞을 수 있는 ` +
      `지점과 신경 쓰면 좋을 지점을 균형 있게 6~10문장으로 풀어주세요. 갈등을 단정하지 말고 ` +
      `"함께 신경 쓰면 더 좋아질 수 있는 부분"처럼 건설적인 톤을 유지하세요.\n\n` +
      `데이터: ${JSON.stringify(context)}`
    );
  }

  if (productCode === "daeun_seun") {
    return (
      `${TONE_GUIDE}\n\n` +
      `아래는 한 사람의 대운(10년 단위 흐름)과 최근 세운(연간 흐름) 데이터입니다. 현재 ` +
      `대운 시기와 올해·내년의 세운이 어떤 결의 시기일 수 있는지, 어떤 부분에 신경 쓰면 ` +
      `좋을지를 6~10문장으로 자연스럽게 풀어주세요. 특정 사건을 예측하듯 단정하지 말고, ` +
      `"이런 흐름을 참고할 수 있어요" 수준으로 작성하세요.\n\n` +
      `데이터: ${JSON.stringify(context)}`
    );
  }

  if (productCode === "monthly_fortune") {
    return (
      `${TONE_GUIDE}\n\n` +
      `아래는 한 사람의 이번 달 월운(月運) 데이터입니다. 이번 달이 어떤 결의 흐름일 ` +
      `수 있는지, 일과 관계와 컨디션 중 어느 쪽에 조금 더 마음 써보면 좋을지를 ` +
      `5~8문장으로 자연스럽게 풀어주세요. 이번 달"에 한정된" 이야기라는 걸 은근히 ` +
      `느끼게 해주세요(다음 달엔 또 다른 흐름일 수 있다는 뉘앙스).\n\n` +
      `데이터: ${JSON.stringify(context)}`
    );
  }

  if (productCode === "yearly_fortune") {
    const year = getFortuneYear();
    return (
      `${TONE_GUIDE}\n\n` +
      `[신년운세 형식 — 위 형식 원칙의 예외] 이 글은 ${year}년 한 해의 흐름을 읽는 신년운세입니다. ` +
      `마크다운 기호(#, **, -, 번호 목록)는 여전히 쓰지 마세요. 다만 읽기 쉽도록 문단 맨 앞에 ` +
      `아래 이름표를 "이름표 · 본문" 형태의 일반 텍스트로 붙이고, 이름표 사이는 빈 줄로 나누세요.\n` +
      `1) "총운 · " 한 해 전체의 결을 3~4문장.\n` +
      `2) "상반기와 하반기 · " 어느 쪽에 조금 더 마음 써보면 좋을지 3~4문장.\n` +
      `3) "월별 흐름 · " 줄을 바꿔 절기월 12개를 순서대로 한 줄씩. 형식은 "인월(2월 초~) · 한두 문장"처럼 ` +
      `데이터의 monthName과 approxPeriod를 그대로 쓰고, 각 달의 ganzhi·십성·12운성 데이터에 맞는 내용으로 ` +
      `쓰세요. 줄 앞에 -, 숫자를 붙이지 마세요.\n` +
      `4) "일 · ", "관계 · ", "재충전 · " 각각 2문장씩 영역별 포인트.\n` +
      `5) "조심하면 좋은 때 · ", "기회가 될 수 있는 때 · " 각각 2문장씩, 월별 흐름 데이터에 근거해 어느 달인지 짚어주세요.\n` +
      `사주에서는 한 해가 입춘(2월 초) 무렵 시작한다고 본다는 점을 총운 끝에 한 문장으로 가볍게 안내하세요. ` +
      `"${year}년 한 해에 한정된" 이야기라는 걸 은근히 느끼게 해주세요(내년엔 또 다른 흐름일 수 있다는 뉘앙스). ` +
      `특정 사건을 예측하듯 단정하지 말고 참고할 수 있는 흐름 수준으로 쓰세요.\n\n` +
      `데이터: ${JSON.stringify(context)}`
    );
  }

  throw new Error(`알 수 없는 상품 코드: ${productCode}`);
}

async function callClaude(prompt: string, maxTokens = 1024): Promise<string> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Anthropic API 오류: ${response.status}`);
  }

  const data = await response.json();
  const rawText = data.content?.[0]?.text ?? "";
  return stripMarkdown(rawText);
}

/**
 * 프롬프트로 마크다운을 쓰지 말라고 지시해도 가끔 새어나올 수 있어, 마지막
 * 안전장치로 흔한 마크다운 기호를 제거한다. #제목, **굵게**, *기울임*,
 * 목록(-, 1. 등) 표시를 걷어내고 순수 텍스트만 남긴다.
 */
function stripMarkdown(text: string): string {
  return text
    .replace(/^#{1,6}\s+/gm, "") // # 제목
    .replace(/\*\*(.+?)\*\*/g, "$1") // **굵게**
    .replace(/\*(.+?)\*/g, "$1") // *기울임*
    .replace(/^[-*+]\s+/gm, "") // - 목록
    .replace(/^\d+\.\s+/gm, "") // 1. 목록
    .trim();
}
