import type { Metadata } from "next";
import Link from "next/link";
import { PageHeading } from "@/components/common/PageHeading";
import { Card, CardTitle, CardDescription } from "@/components/common/Card";
import { GUIDE_ARTICLES } from "@/data/guideArticles";
import { LPT_TYPES } from "@/data/lptTypes";

export const metadata: Metadata = {
  title: "사주·LPT 가이드",
  description:
    "사주팔자, 오행, 십신, 대운과 세운 같은 기본 개념과 LPT 12유형의 구조를 쉬운 말로 풀어쓴 해설 모음입니다.",
};

export default function GuideIndexPage() {
  return (
    <div className="mx-auto max-w-2xl px-5 py-14">
      <PageHeading
        label="가이드"
        title="사주와 LPT 읽을거리"
        description="용어가 낯설어도 괜찮아요. 처음부터 차근차근 풀어 설명했어요."
      />

      <div className="flex flex-col gap-4">
        {GUIDE_ARTICLES.map((article) => (
          <Link key={article.slug} href={`/guide/${article.slug}`} className="block">
            <Card className="transition-colors hover:border-fate/40">
              <p className="text-xs text-muted">읽는 시간 약 {article.readMinutes}분</p>
              <CardTitle className="mt-1">{article.title}</CardTitle>
              <CardDescription className="mt-2 break-keep">{article.summary}</CardDescription>
            </Card>
          </Link>
        ))}
      </div>

      <section className="mt-12">
        <h2 className="font-display text-lg font-semibold text-foreground">12가지 유형 소개</h2>
        <p className="mt-1 text-sm text-muted">각 유형의 일상, 일, 관계 모습과 성장 팁을 읽어 보세요.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {LPT_TYPES.map((t) => (
            <Link
              key={t.id}
              href={`/types/${t.id.toLowerCase()}`}
              className="rounded-full border border-border bg-surface-2 px-3 py-1 text-xs text-muted hover:border-fate/40"
            >
              {t.name}
            </Link>
          ))}
        </div>
      </section>

      <p className="mt-10 text-center text-xs text-muted">
        궁금한 점은 <Link href="/faq" className="underline underline-offset-2">자주 묻는 질문</Link>에서 확인할 수 있어요.
      </p>
    </div>
  );
}
