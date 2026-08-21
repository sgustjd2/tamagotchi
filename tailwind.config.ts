import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: "#FFF8F0",
        ink: "#2E2722",
        blush: "#FFB7C5",
        mint: "#A8E6CF",
        sky: "#AEDFF7",
        butter: "#FFE3A3",
        grape: "#C9B6F2",
        coral: "#FF9A8B",
        lcd: "#E5EAD2", // 다마고치 LCD 화면 (연한 크림-그린)
        lcdink: "#3A2E22", // 진한 갈색
        // 게이지 전용 — 파스텔 표면색은 트랙과 대비(1.1:1)가 안 나와 게이지엔 쓰지 않는다
        gauge: {
          good: "#3FA96F",
          warn: "#E0A428",
          bad: "#D9472E",
        },
        // -------------------------------------------------------------------
        // 시맨틱 토큰(최소 단계) — 새 코드는 의미로 색을 고른다.
        // surface: text-ink 를 얹는 배경(ink 대비 7:1 이상)
        // strong : cream 배경 위 글자·아이콘용 진한 색(대비 4.5:1 이상)
        // 대비 수치는 lib/__tests__/semanticTokens.test.ts 가 잠근다.
        // -------------------------------------------------------------------
        primary: { surface: "#FF9A8B", strong: "#B4432F" },
        success: { surface: "#A8E6CF", strong: "#1E7A48" },
        warning: { surface: "#FFE3A3", strong: "#8A5B00" },
        danger: { surface: "#FFC9BF", strong: "#B4331D" },
      },
      fontFamily: {
        sans: [
          "Pretendard Variable",
          "Pretendard",
          "-apple-system",
          "BlinkMacSystemFont",
          "system-ui",
          "Roboto",
          "Helvetica Neue",
          "Segoe UI",
          "Apple SD Gothic Neo",
          "Noto Sans KR",
          "Malgun Gothic",
          "sans-serif",
        ],
        pixel: [
          "Galmuri11",
          "Galmuri14",
          "DungGeunMo",
          "monospace",
        ],
      },
      boxShadow: {
        toy: "0 8px 0 0 rgba(0,0,0,0.08), 0 14px 24px -10px rgba(0,0,0,0.25)",
        soft: "0 10px 30px -12px rgba(0,0,0,0.25)",
      },
      borderRadius: {
        xl2: "1.75rem",
      },
      keyframes: {
        bob: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
        wiggle: {
          "0%, 100%": { transform: "rotate(-3deg)" },
          "50%": { transform: "rotate(3deg)" },
        },
        pop: {
          "0%": { transform: "scale(0.6)", opacity: "0" },
          "70%": { transform: "scale(1.08)", opacity: "1" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
      },
      animation: {
        bob: "bob 2.8s ease-in-out infinite",
        wiggle: "wiggle 0.5s ease-in-out",
        pop: "pop 0.35s ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
