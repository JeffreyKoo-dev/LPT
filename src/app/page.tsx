import Link from "next/link";
import { Button } from "@/components/common/Button";
import { Card, CardDescription, CardTitle } from "@/components/common/Card";

const CONCEPT_ITEMS = [
  {
    label: "사주",
    desc: "타고난 기질 구조를 읽어내는 출발점",
  },
  {
    label: "성향 설문",
    desc: "지금 겉으로 드러나는 행동 패턴 측정",
  },
  {
    label: "시기의 흐름",
    desc: "대운과 세운으로 보는, 시기에 따라 달라지는 변화의 흐름",
  },
  {
    label: "라이프스타일 인디케이터",
    desc: "생활, 일, 관계, 성장 방식의 시각화",
  },
  {
    label: "성장 퀘스트",
    desc: "부족한 부분을 채우고 강점을 키우는 행동 미션",
  },
  {
    label: "성장의 기록",
    desc: "레벨업과 뱃지로 쌓여가는 성장 기록",
  },
];

export default function HomePage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "사주 기반 성향 테스트 LPT",
    alternateName: "QuestofME",
    url: "https://questofme.com",
    applicationCategory: "LifestyleApplication",
    description:
      "사주팔자와 성향 설문(MBTI식 행동 유형 검사)을 함께 분석해 나만의 라이프 패턴 유형을 찾는 자기이해 서비스",
    inLanguage: "ko",
    offers: { "@type": "Offer", price: "0", priceCurrency: "KRW" },
  };

  return (
    <div className="relative">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <section className="px-5 pb-20 pt-16 sm:pt-24">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="animate-rise font-display text-4xl leading-tight font-bold tracking-tight text-foreground sm:text-5xl">
            타고난 기질과 지금의 나,
            <br />
            <span className="text-growth">같은 지도 위에서</span> 함께 읽는다
          </h1>
          <p className="mx-auto mt-6 max-w-xl animate-rise text-base leading-relaxed text-muted [animation-delay:120ms]">
            LPT는 생년월일시 기반 사주팔자와 성향 설문을 함께 분석해, 나의 일하는 방식과
            관계 맺는 방식, 성장 방향을 캐릭터 카드로 보여주는 서비스입니다. 운세 앱이나
            단순 성격 테스트가 아니라, 꾸준히 성장 기록을 쌓아가는 라이프 전략 RPG입니다.
          </p>
          <div className="mt-9 flex animate-rise flex-col items-center justify-center gap-3 [animation-delay:200ms] sm:flex-row">
            <Link href="/start">
              <Button size="lg" className="w-full sm:w-auto">
                내 라이프 패턴 분석 시작하기
              </Button>
            </Link>
          </div>
          <p className="mt-4 text-xs text-muted">
            결과는 확정된 운명이 아니라, 참고할 수 있는 경향과 가능성입니다.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 pb-24">
        <div className="mb-10 text-center">
          <h2 className="font-display text-2xl font-semibold tracking-tight text-foreground">
            LPT를 이루는 6가지 조각
          </h2>
          <p className="mt-2 text-sm text-muted">
            타고난 기질부터 매일의 성장 기록까지, 하나의 캐릭터 시트로 연결됩니다.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CONCEPT_ITEMS.map((item, i) => (
            <Card key={item.label} className="animate-rise" style={{ animationDelay: `${i * 60}ms` }}>
              <span className="font-numeral text-sm text-growth">{String(i + 1).padStart(2, "0")}</span>
              <CardTitle className="mt-2">{item.label}</CardTitle>
              <CardDescription className="mt-2">{item.desc}</CardDescription>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-5 pb-24">
        <Card className="text-center">
          <CardTitle>결과를 읽을 때 이렇게 봐주세요</CardTitle>
          <CardDescription className="mt-3">
            LPT의 모든 결과는 &ldquo;반드시 그렇다&rdquo;가 아니라 &ldquo;그런 경향이 있을 수
            있다&rdquo;, &ldquo;지금 시기에는 이런 방식이 더 도움이 될 수 있다&rdquo;는
            참고 정보로 제공됩니다. 최종 선택과 판단은 항상 본인의 몫입니다.
          </CardDescription>
        </Card>
      </section>
    </div>
  );
}
