import { describe, expect, it } from "vitest";

import config from "../../tailwind.config";

// 시맨틱 색 토큰의 WCAG 대비 계약을 잠근다:
//   surface: ink 글자를 얹는 배경 → ink 대비 7:1 이상 (AAA)
//   strong : cream 배경 위 글자·아이콘 → cream 대비 4.5:1 이상 (AA)
// 값을 바꾸면 이 테스트가 재계산해 계약 위반을 잡는다.

const INK = "#2E2722";
const CREAM = "#FFF8F0";

/** WCAG 상대 휘도 */
function luminance(hex: string): number {
  const h = hex.replace("#", "");
  const ch = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  const lin = ch.map((c) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4),
  );
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

type Semantic = Record<string, { surface: string; strong: string }>;

const colors = (config.theme?.extend?.colors ?? {}) as Record<string, unknown>;
const SEMANTIC_KEYS = ["primary", "success", "warning", "danger"] as const;

describe("시맨틱 색 토큰 대비 계약", () => {
  const semantic = Object.fromEntries(
    SEMANTIC_KEYS.map((k) => [k, colors[k]]),
  ) as Semantic;

  it("4종 토큰이 모두 surface/strong 2단으로 정의돼 있다", () => {
    for (const k of SEMANTIC_KEYS) {
      expect(semantic[k], k).toBeDefined();
      expect(semantic[k].surface, `${k}.surface`).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(semantic[k].strong, `${k}.strong`).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it("surface 는 ink 글자와 7:1 이상 (AAA)", () => {
    for (const k of SEMANTIC_KEYS) {
      expect(
        contrast(semantic[k].surface, INK),
        `${k}.surface vs ink`,
      ).toBeGreaterThanOrEqual(7);
    }
  });

  it("strong 은 cream 배경과 4.5:1 이상 (AA)", () => {
    for (const k of SEMANTIC_KEYS) {
      expect(
        contrast(semantic[k].strong, CREAM),
        `${k}.strong vs cream`,
      ).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("게이지 색도 트랙 구실을 하도록 흰 배경과 2:1 이상", () => {
    const gauge = colors.gauge as Record<string, string>;
    for (const k of ["good", "warn", "bad"]) {
      expect(contrast(gauge[k], "#FFFFFF"), `gauge.${k}`).toBeGreaterThanOrEqual(2);
    }
  });
});
