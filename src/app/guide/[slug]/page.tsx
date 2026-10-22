import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "@/components/common/Card";
import { Button } from "@/components/common/Button";
import { GUIDE_ARTICLES, getGuideArticle } from "@/data/guideArticles";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return GUIDE_ARTICLES.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { slug } = await props.params;
  const article = getGuideArticle(slug);
  if (!article) return {};
  return {
    title: article.title,
    description: article.summary,
    openGraph: { title: article.title, description: article.summary, type: "article" },
  };
}

export default async function GuideArticlePage(props: PageProps) {
  const { slug } = await props.params;
  const article = getGuideArticle(slug);
  if (!article) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.summary,
    inLanguage: "ko",
    publisher: { "@type": "Organization", name: "QuestofMe" },
  };

  const related = article.related
    .map((s) => getGuideArticle(s))
    .filter((a): a is NonNullable<typeof a> => !!a);

  return (
    <article className="mx-auto max-w-2xl px-5 py-14">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <nav className="text-xs text-muted">
        <Link href="/guide" className="underline underline-offset-2">가이드</Link>
        <span className="mx-1.5">/</span>
        <span>읽는 시간 약 {article.readMinutes}분</span>
      </nav>

      <h1 className="mt-3 break-keep font-display text-2xl font-semibold leading-snug tracking-tight text-foreground sm:text-3xl">
        {article.title}
      </h1>
      <p className="mt-3 break-keep text-sm leading-relaxed text-muted">{article.summary}</p>

      <div className="mt-10 flex flex-col gap-10">
        {article.sections.map((section) => (
          <section key={section.heading}>
            <h2 className="break-keep font-display text-lg font-semibold text-foreground">
              {section.heading}
            </h2>
            {section.paragraphs?.map((p) => (
              <p key={p} className="mt-3 break-keep text-[15px] leading-7 text-foreground/90">
                {p}
              </p>
            ))}
            {section.items && (
              <dl className="mt-4 flex flex-col gap-3">
                {section.items.map((item) => (
                  <div key={item.term} className="rounded-lg border border-border bg-surface-2 px-4 py-3">
                    <dt className="text-sm font-semibold text-foreground">{item.term}</dt>
                    <dd className="mt-1 break-keep text-sm leading-relaxed text-muted">{item.desc}</dd>
                  </div>
                ))}
              </dl>
            )}
          </section>
        ))}
      </div>

      <p className="mt-10 break-keep rounded-lg bg-surface-2 px-4 py-3 text-xs leading-relaxed text-muted">
        이 글은 자기이해를 돕는 일반 정보이며, 특정 결과나 미래를 단정하거나 보장하지 않습니다.
      </p>

      {related.length > 0 && (
        <section className="mt-10">
          <h2 className="font-display text-base font-semibold text-foreground">이어서 읽기</h2>
          <div className="mt-3 flex flex-col gap-2">
            {related.map((r) => (
              <Link
                key={r.slug}
                href={`/guide/${r.slug}`}
                className="rounded-lg border border-border bg-surface px-4 py-3 text-sm text-foreground hover:border-fate/40"
              >
                {r.title}
              </Link>
            ))}
          </div>
        </section>
      )}

      <Card className="mt-10 text-center">
        <p className="text-sm text-muted">내 사주와 성향이 어떤 유형으로 이어지는지 직접 확인해 보세요.</p>
        <Link href="/start">
          <Button className="mt-4 w-full">내 유형 알아보기</Button>
        </Link>
      </Card>
    </article>
  );
}
