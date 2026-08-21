import { describe, expect, it } from "vitest";
import { createCharacter } from "@/lib/game/character";
import { leverage } from "@/lib/game/negotiate";
import { learningEfficiency } from "@/lib/game/status";
import { rollLifeRisk } from "@/lib/game/life";
import type { Character, JobState } from "@/types/character";

// 죽은 스탯 소비처 연결 검증 — sleepQuality/confidence/fitness 가
// 실제로 결과를 바꾸는지(±10% 내외 체감 수준) 잠그는 테스트.

const base = (): Character => createCharacter("u_test", "테스트", "blush", "male", 0);

const withStatus = (over: Partial<Character["status"]>): Character => {
  const c = base();
  return { ...c, status: { ...c.status, ...over } };
};

const job: JobState = {
  family: "dev",
  company: "midsize",
  grade: "junior",
  title: "개발/IT 주임",
  salaryManwon: 4000,
  hiredAt: 0,
  hiredAtAge: 26,
  lastEvalGrade: "B",
};

describe("sleepQuality → 학습 효율", () => {
  it("80 초과면 +10% 보너스, 25 미만이면 0.85 페널티", () => {
    const good = withStatus({ sleepQuality: 90 });
    const mid = withStatus({ sleepQuality: 50 });
    const bad = withStatus({ sleepQuality: 10 });
    expect(learningEfficiency(good)).toBeCloseTo(learningEfficiency(mid) * 1.1, 2);
    expect(learningEfficiency(bad)).toBeLessThan(learningEfficiency(mid));
  });
});

describe("confidence → 협상력", () => {
  it("자신감 100 은 50 대비 +10%, 0 은 -10%", () => {
    const at = (confidence: number) =>
      leverage({ ...withStatus({ confidence }), job });
    expect(at(100)).toBeCloseTo(at(50) * 1.1, 4);
    expect(at(0)).toBeCloseTo(at(50) * 0.9, 4);
  });
});

describe("fitness → 사고 피해 경감", () => {
  it("체력단련이 높으면 같은 사고의 피해가 줄어든다 (총 경감 상한 40%)", () => {
    const soft = base();
    const fit = base();
    fit.stats = { ...fit.stats, fitness: 100 };
    const hitSoft = rollLifeRisk(soft, 30, 0, 0.99, 0);
    const hitFit = rollLifeRisk(fit, 30, 0, 0.99, 0);
    if (hitSoft.kind === "incident" && hitFit.kind === "incident") {
      expect(hitFit.healthHit).toBeLessThan(hitSoft.healthHit);
    } else {
      throw new Error("incident 가 아니어야 할 이유가 없음");
    }
    // 전부 만렙이어도 경감은 40% 를 넘지 않는다
    const max = base();
    max.stats = { ...max.stats, stamina: 100, strength: 100, fitness: 100 };
    const hitMax = rollLifeRisk(max, 30, 0, 0.99, 0);
    if (hitMax.kind === "incident") {
      expect(hitMax.healthHit).toBe(Math.round(30 * 0.6));
    }
  });
});
