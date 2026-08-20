import Link from "next/link";
import { Award, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

interface BadgeCardProps {
  name: string;
  description: string;
  earned: boolean;
  earnedAt?: string | null;
  shareHref?: string;
}

export function BadgeCard({ name, description, earned, earnedAt, shareHref }: BadgeCardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border p-5 text-center transition-colors",
        earned ? "border-growth/40 bg-growth-soft" : "border-border bg-surface-2/60 opacity-60"
      )}
    >
      <div
        className={cn(
          "mx-auto flex h-11 w-11 items-center justify-center rounded-full border",
          earned ? "border-growth text-growth" : "border-border text-muted"
        )}
      >
        {earned ? <Award size={18} strokeWidth={1.75} /> : <Lock size={16} strokeWidth={1.75} />}
      </div>
      <h3 className="mt-3 font-display text-sm font-semibold tracking-tight text-foreground">{name}</h3>
      <p className="mt-1 text-xs text-muted">{description}</p>
      {earned && earnedAt && (
        <p className="mt-2 text-[11px] text-growth">
          {new Date(earnedAt).toLocaleDateString("ko-KR")} 획득
        </p>
      )}
      {earned && shareHref && (
        <Link href={shareHref} className="mt-2 inline-block text-[11px] text-fate underline underline-offset-2">
          공유하기
        </Link>
      )}
    </div>
  );
}
