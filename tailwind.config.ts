import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--bg)",
        foreground: "var(--text)",
        surface: {
          DEFAULT: "var(--surface)",
          2: "var(--surface-2)",
        },
        border: "var(--border)",
        muted: "var(--muted)",
        // 단일 강조색(accent) + 보조 강조색(growth) 2색 체계.
        // 이름은 도메인 의미(사주=fate, 성장=growth)를 유지하되 값은 절제된 톤으로 통일한다.
        fate: {
          DEFAULT: "var(--fate)",
          soft: "var(--fate-soft)",
        },
        growth: {
          DEFAULT: "var(--growth)",
          soft: "var(--growth-soft)",
        },
      },
      fontFamily: {
        // @fontsource가 등록하는 실제 폰트 이름을 그대로 참조한다.
        sans: ["'Noto Sans KR'", "-apple-system", "sans-serif"],
        display: ["'Jua'", "-apple-system", "sans-serif"],
        body: ["'Noto Sans KR'", "-apple-system", "sans-serif"],
        numeral: ["'Noto Sans KR'", "-apple-system", "sans-serif"],
      },
      boxShadow: {
        // 컬러 글로우 대신 절제된 elevation(그림자)만 사용한다.
        card: "0 1px 2px rgba(0,0,0,0.4), 0 1px 0 rgba(255,255,255,0.03) inset",
        raised: "0 4px 16px -4px rgba(0,0,0,0.5), 0 1px 0 rgba(255,255,255,0.04) inset",
      },
      keyframes: {
        rise: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        rise: "rise 0.4s ease-out both",
      },
    },
  },
  plugins: [],
};
export default config;
