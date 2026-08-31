export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 py-8 text-center text-xs text-muted">
      <p>
        LPT는 자기이해와 라이프 전략 수립을 돕는 참고 도구이며, 특정 결과를 단정하거나
        보장하지 않습니다.
      </p>
      <p className="mt-1">© {new Date().getFullYear()} LPT 라이프 패턴 타입</p>
    </footer>
  );
}
