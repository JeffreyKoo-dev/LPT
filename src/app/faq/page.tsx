import type { Metadata } from "next";
import Link from "next/link";
import { PageHeading } from "@/components/common/PageHeading";
import { Card } from "@/components/common/Card";
import { Button } from "@/components/common/Button";
import { ALL_FAQ_ITEMS, FAQ_GROUPS } from "@/data/faqItems";

export const metadata: Metadata = {
  title: "자주 묻는 질문 · 이용 방법",
  description:
    "LPT 사용 순서, 사주와 성향 설문 결과 이해, 계정·결제·개인정보에 대해 자주 묻는 질문을 한곳에 정리했습니다.",
};

export default function FaqPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: ALL_FAQ_ITEMS.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };

  return (
    <div className="mx-auto max-w-2xl px-5 py-14">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <PageHeading
        label="FAQ"
        title="자주 묻는 질문"
        description="이용 방법과 결과 해석, 계정·결제에 대한 궁금증을 모았어요."
      />

      <div className="flex flex-col gap-8">
        {FAQ_GROUPS.map((group) => (
          <section key={group.title}>
            <h2 className="mb-3 font-display text-lg font-semibold text-foreground">{group.title}</h2>
            <div className="flex flex-col gap-3">
              {group.items.map((item) => (
                <Card key={item.q} variant="ledger" className="p-5">
                  <h3 className="text-sm font-semibold text-foreground">Q. {item.q}</h3>
                  <p className="mt-2 break-keep text-sm leading-relaxed text-muted">{item.a}</p>
                </Card>
              ))}
            </div>
          </section>
        ))}
      </div>

      <Card className="mt-10 text-center">
        <p className="text-sm text-muted">사주와 유형의 기본 개념은 가이드에서 더 자세히 읽을 수 있어요.</p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link href="/guide">
            <Button variant="secondary" className="w-full">읽을거리 보기</Button>
          </Link>
          <Link href="/start">
            <Button className="w-full">내 유형 알아보기</Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
