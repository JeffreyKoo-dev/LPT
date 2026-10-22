import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { LPT_TYPES } from "@/data/lptTypes";
import { TYPE_DEEP_DIVES } from "@/data/typeDeepDives";
import { Card, CardTitle, CardDescription } from "@/components/common/Card";
import { Button } from "@/components/common/Button";

interface PageProps {
  params: Promise<{ typeId: string }>;
}

function findType(typeId: string) {
  return LPT_TYPES.find((t) => t.id.toLowerCase() === typeId.toLowerCase());
}

function toSlug(id: string): string {
  return id.toLowerCase().replace(/_/g, "-");
}

export function generateStaticParams() {
  return LPT_TYPES.map((t) => ({ typeId: t.id.toLowerCase() }));
}

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const params = await props.params;
  const type = findType(params.typeId);
  if (!type) return {};

  const title = `${type.name} — LPT 유형 소개`;
  const description = `${type.tagline} ${type.description}`;

  return {
    title,
    description,
    openGraph: { title, description, type: "article" },
    twitter: { card: "summary", title, description },
  };
}

export default async function TypeIntroPage(props: PageProps) {
  const params = await props.params;
  const type = findType(params.typeId);
  if (!type) notFound();

  const slug = toSlug(type.id);
  const deepDive = TYPE_DEEP_DIVES[type.id];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: `${type.name} — LPT 유형 소개`,
    description: type.description,
  };

  return (
    <div className="mx-auto max-w-lg px-5 py-14">
      {/* eslint-disable-next-line react/no-unknown-property */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="text-center">
        <Image
          src={`/characters/${slug}-male.png`}
          alt={type.name}
          width={140}
          height={175}
          className="mx-auto"
        />
        <p className="mt-4 text-xs text-muted">
          {type.quadrant} · {type.energyGroup}
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-foreground">
          {type.name}
        </h1>
        <p className="mt-2 text-sm text-muted">{type.tagline}</p>
      </div>

      <Card className="mt-6">
        <CardDescription>{type.description}</CardDescription>
      </Card>

      <Card className="mt-4">
        <CardTitle>강점일 수 있는 부분</CardTitle>
        <ul className="mt-2 flex flex-col gap-1.5">
          {type.strengths.map((s) => (
            <li key={s} className="text-sm text-muted">
              · {s}
            </li>
          ))}
        </ul>
      </Card>

      <Card className="mt-4">
        <CardTitle>함께 챙겨보면 좋을 부분</CardTitle>
        <ul className="mt-2 flex flex-col gap-1.5">
          {type.growthPoints.map((g) => (
            <li key={g} className="text-sm text-muted">
              · {g}
            </li>
          ))}
        </ul>
      </Card>

      <section className="mt-8 flex flex-col gap-6">
        {[
          { title: "일상에서는 이런 모습일 수 있어요", body: deepDive.daily },
          { title: "일이나 공부를 할 때", body: deepDive.work },
          { title: "사람들과의 관계에서", body: deepDive.relationships },
          { title: "에너지를 되찾는 방법", body: deepDive.recharge },
        ].map((block) => (
          <div key={block.title}>
            <h2 className="font-display text-base font-semibold text-foreground">{block.title}</h2>
            <p className="mt-2 break-keep text-sm leading-7 text-muted">{block.body}</p>
          </div>
        ))}
      </section>

      <Card className="mt-8">
        <CardTitle>이번 달 시도해 볼 작은 성장 팁</CardTitle>
        <ol className="mt-3 flex flex-col gap-2">
          {deepDive.tips.map((tip, i) => (
            <li key={tip} className="flex gap-2 break-keep text-sm leading-relaxed text-muted">
              <span className="font-semibold text-growth">{i + 1}.</span>
              <span>{tip}</span>
            </li>
          ))}
        </ol>
      </Card>

      <p className="mt-6 break-keep text-center text-xs leading-relaxed text-muted">
        위 내용은 경향을 설명하는 참고 정보이며, 같은 유형이라도 사람마다 모습은 다를 수 있어요. 유형이
        어떻게 정해지는지는{" "}
        <Link href="/guide/lpt-system" className="underline underline-offset-2">
          가이드
        </Link>
        에서 볼 수 있어요.
      </p>

      <Card className="mt-6 text-center">
        <CardDescription>
          사주팔자와 성향 설문을 결합하면, 나는 어떤 유형에 가까운지 확인할 수 있어요.
        </CardDescription>
        <Link href="/start">
          <Button className="mt-4 w-full">내 유형 알아보기</Button>
        </Link>
      </Card>

      <div className="mt-8">
        <p className="mb-2 text-xs text-muted">다른 유형도 궁금하다면</p>
        <div className="flex flex-wrap gap-2">
          {LPT_TYPES.filter((t) => t.id !== type.id).map((t) => (
            <Link
              key={t.id}
              href={`/types/${t.id.toLowerCase()}`}
              className="rounded-full border border-border bg-surface-2 px-3 py-1 text-xs text-muted hover:border-fate/40"
            >
              {t.name}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
