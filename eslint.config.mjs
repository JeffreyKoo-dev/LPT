import { defineConfig } from "eslint/config";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig([
  {
    extends: [...nextCoreWebVitals, ...nextTypescript],
  },
  {
    // React 19/eslint-config-next 16이 새로 추가한 규칙. "useEffect 안에서
    // setState를 직접 호출하면 렌더링 캐스케이드가 생길 수 있다"는 권장
    // 수준 경고인데, Supabase 비동기 데이터 로딩(조건 체크 후 얼리 리턴하며
    // setState)이라는, 이 프로젝트 전반에 걸친 정상적이고 흔한 패턴을 전부
    // 걸러낸다. 실제 버그가 아니라 위험도를 확인한 뒤(16곳 전부 같은 패턴)
    // 경고로만 남겨둔다 — 완전히 끄지 않아 존재는 계속 보이게 유지한다.
    rules: {
      "react-hooks/set-state-in-effect": "warn",
    },
  },
]);