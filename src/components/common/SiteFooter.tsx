import Link from "next/link";
import { BUSINESS_INFO } from "@/data/businessInfo";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 py-8 text-center text-xs text-muted">
      <p>
        LPT는 자기이해와 라이프 전략 수립을 돕는 참고 도구이며, 특정 결과를 단정하거나
        보장하지 않습니다.
      </p>

      <nav className="mt-4 flex items-center justify-center gap-4">
        <Link href="/privacy" className="underline underline-offset-2 hover:text-foreground">
          개인정보처리방침
        </Link>
        <Link href="/terms" className="underline underline-offset-2 hover:text-foreground">
          이용약관
        </Link>
      </nav>

      <div className="mx-auto mt-4 flex max-w-md flex-col gap-0.5 text-[11px] leading-relaxed text-muted/80">
        <p>
          {BUSINESS_INFO.companyName} · 대표 {BUSINESS_INFO.ceoName} · 사업자등록번호{" "}
          {BUSINESS_INFO.registrationNumber} · 통신판매업신고 {BUSINESS_INFO.mailOrderNumber}
        </p>
        <p>{BUSINESS_INFO.address}</p>
        {(BUSINESS_INFO.phone || BUSINESS_INFO.email) && (
          <p>
            {BUSINESS_INFO.phone && <>고객센터 {BUSINESS_INFO.phone}</>}
            {BUSINESS_INFO.phone && BUSINESS_INFO.email && " · "}
            {BUSINESS_INFO.email && <>{BUSINESS_INFO.email}</>}
          </p>
        )}
      </div>

      <p className="mt-3">© {new Date().getFullYear()} {BUSINESS_INFO.companyName}</p>
    </footer>
  );
}
