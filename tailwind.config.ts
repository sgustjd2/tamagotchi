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
