import { Card } from "@/components/common/Card";
import { ElementIcon } from "@/components/common/ElementIcon";
import { LptTypeMeta, FantasyClassMeta } from "@/types/lpt";
import { Element } from "@/types/saju";
import { cn } from "@/lib/utils";

const ELEMENT_LABEL: Record<Element, string> = {
  wood: "목(木)",
  fire: "화(火)",
  earth: "토(土)",
  metal: "금(金)",
  water: "수(水)",
};

const ELEMENT_COLOR: Record<Element, string> = {
  wood: "text-emerald-400 border-emerald-400/40 bg-emerald-400/10",
  fire: "text-rose-400 border-rose-400/40 bg-rose-400/10",
  earth: "text-amber-400 border-amber-400/40 bg-amber-400/10",
  metal: "text-slate-300 border-slate-300/40 bg-slate-300/10",
  water: "text-sky-400 border-sky-400/40 bg-sky-400/10",
};

interface CharacterCardProps {
  nickname: string;
  typeMeta: LptTypeMeta;
  fantasyClass: FantasyClassMeta;
}

export function CharacterCard({ nickname, typeMeta, fantasyClass }: CharacterCardProps) {
  const element = fantasyClass.accentElement;
  return (
    <Card className="relative overflow-hidden border-t-2 border-t-fate">
      <div className="flex flex-col items-center text-center">
        <div
          className={cn(
            "flex h-14 w-14 items-center justify-center rounded-2xl border",
            ELEMENT_COLOR[element]
          )}
        >
          <ElementIcon element={element} size={26} />
        </div>

        <span
          className={cn(
            "mt-3 inline-flex items-center rounded-full border px-3 py-1 text-xs",
            ELEMENT_COLOR[element]
          )}
        >
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
