import Image from "next/image";
import { Card } from "@/components/common/Card";
import { ElementIcon } from "@/components/common/ElementIcon";
import { LptTypeMeta, FantasyClassMeta } from "@/types/lpt";
import { Element } from "@/types/saju";
import { Gender } from "@/types/user";
import { cn } from "@/lib/utils";

const ELEMENT_LABEL: Record<Element, string> = {
  wood: "목(木)",
  fire: "화(火)",
  earth: "토(土)",
  metal: "금(金)",
  water: "수(水)",
};

const ELEMENT_COLOR: Record<Element, string> = {
  wood: "text-emerald-700 border-emerald-600/40 bg-emerald-500/10",
  fire: "text-rose-700 border-rose-600/40 bg-rose-500/10",
  earth: "text-amber-700 border-amber-600/40 bg-amber-500/10",
  metal: "text-slate-600 border-slate-500/40 bg-slate-500/10",
  water: "text-sky-700 border-sky-600/40 bg-sky-500/10",
};

interface CharacterCardProps {
  nickname: string;
  typeMeta: LptTypeMeta;
  fantasyClass: FantasyClassMeta;
  gender: Gender;
}

export function CharacterCard({ nickname, typeMeta, fantasyClass, gender }: CharacterCardProps) {
  const element = fantasyClass.accentElement;
  const illustrationSlug = `${typeMeta.id.toLowerCase().replace(/_/g, "-")}-${gender}`;

  return (
    <Card className="relative overflow-hidden border-t-2 border-t-fate">
      <div className="flex flex-col items-center text-center">
        <div className="relative -mt-2 h-40 w-32 overflow-hidden rounded-2xl bg-surface-2">
          <Image
            src={`/characters/${illustrationSlug}.svg`}
            alt={`${typeMeta.name} 캐릭터 일러스트`}
            fill
            className="object-cover object-top"
            priority
          />
        </div>

        <span
          className={cn(
            "mt-3 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs",
            ELEMENT_COLOR[element]
          )}
        >
          <ElementIcon element={element} size={14} />
          {ELEMENT_LABEL[element]} 기운
        </span>

        <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight text-foreground">
          {typeMeta.name}
        </h2>
        <p className="mt-1 text-sm text-growth">{fantasyClass.className}</p>
        <p className="mt-3 text-sm text-muted">{nickname}님의 캐릭터</p>

        <div className="mt-5 grid w-full grid-cols-2 gap-3 border-t border-border pt-5 text-left">
          <div>
            <p className="text-xs text-muted">역할군</p>
            <p className="mt-1 text-sm text-foreground">{fantasyClass.role}</p>
          </div>
          <div>
            <p className="text-xs text-muted">대표 스탯</p>
            <p className="mt-1 text-sm text-foreground">{fantasyClass.primaryStat}</p>
          </div>
        </div>

        <p className="mt-5 text-sm leading-relaxed text-muted">{typeMeta.tagline}</p>
      </div>
    </Card>
  );
}
