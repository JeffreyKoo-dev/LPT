interface PageHeadingProps {
  label: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  align?: "center" | "left";
}

/**
 * 페이지 상단 제목 영역의 공용 컴포넌트.
 *
 * 이전에는 모든 페이지가 "작은 색깔 라벨 → 제목 → 설명"을 위아래로 쌓은
 * 알약(pill) 배지 패턴을 똑같이 반복했다 (전형적인 AI 생성 UI의 "eyebrow
 * label" 패턴). 여기서는 라벨을 제목 위 배지가 아니라, 제목과 나란히
 * 짧은 세로선으로 구분되는 문서 주석(marginalia) 형태로 바꿔 반복적인
 * 느낌을 줄였다.
 */
export function PageHeading({ label, title, description, align = "center" }: PageHeadingProps) {
  const isCenter = align === "center";
  return (
    <div className={isCenter ? "mb-8 text-center" : "mb-8"}>
      <div className={`flex items-baseline gap-3 ${isCenter ? "justify-center" : ""}`}>
        <span className="text-xs text-muted">{label}</span>
        <span className="h-3 w-px bg-border" aria-hidden="true" />
        <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
          {title}
        </h1>
      </div>
      {description && <p className="mt-2 text-sm text-muted">{description}</p>}
    </div>
  );
}
