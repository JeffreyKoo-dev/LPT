import * as React from "react";
import { cn } from "@/lib/utils";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * "default": 둥근 모서리+그림자의 입체적인 카드. 퀘스트·뱃지처럼 누르고
   * 진행하는 액션형 콘텐츠에 쓴다.
   * "ledger": 각진 모서리에 상단 강조선만 있는 문서형 스타일. 사주 분석,
   * 십성표처럼 "표를 읽는" 콘텐츠에 쓴다 — 모든 카드를 똑같이 만들지 않기
   * 위한 구분이다.
   */
  variant?: "default" | "ledger";
}

export function Card({ className, variant = "default", ...props }: CardProps) {
  return (
    <div
      className={cn(
        variant === "default"
          ? "rounded-xl border border-border bg-surface p-6 shadow-card"
          : "rounded-sm border-t-2 border-t-fate border-x border-b border-border bg-surface p-6",
        className
      )}
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn("font-display text-lg font-semibold tracking-tight text-foreground", className)}
      {...props}
    />
  );
}

export function CardDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm leading-relaxed text-muted", className)} {...props} />;
}
