import { describe, expect, it } from "vitest";
import { createCharacter } from "@/lib/game/character";
import { LIVING_COST, MAX_AGE } from "@/lib/game/constants";
import {
  ALLOWANCE_BY_STAGE,
  CHILD_COST,
  INCIDENT_CAUSES,
  ageRiskPct,
  riskPct,
  rollLifeRisk,
  updateHappiness,
  yearlyNet,
} from "@/lib/game/life";
import type { Character, JobState } from "@/types/character";

/** 기본 테스트 캐릭터 (health 85, burnout 0, stress 8, mood 80, 무직) */
const base = (): Character => createCharacter("u_test", "테스트", "blush", "male", 0);

/** 상태만 덮어쓴 캐릭터 */
const withStatus = (over: Partial<Character["status"]>): Character => {
  const c = base();
  return { ...c, status: { ...c.status, ...over } };
};

const devJob = (salaryManwon: number): JobState => ({
  family: "dev",
  company: "midsize",
  grade: "newbie",
  title: "개발/IT 사원",
  salaryManwon,
  hiredAt: 0,
  hiredAtAge: 26,
});

describe("ageRiskPct — 나이 구간 경계", () => {
  it("각 구간의 시작/끝 나이에서 코드에 정의된 확률을 돌려준다", () => {
    expect(ageRiskPct(0)).toBe(0.5);
    expect(ageRiskPct(29)).toBe(0.5);
    expect(ageRiskPct(30)).toBe(1.5);
    expect(ageRiskPct(39)).toBe(1.5);
    expect(ageRiskPct(40)).toBe(4);
    expect(ageRiskPct(44)).toBe(4);
    expect(ageRiskPct(45)).toBe(8);
    expect(ageRiskPct(49)).toBe(8);
    expect(ageRiskPct(50)).toBe(16);
    expect(ageRiskPct(54)).toBe(16);
    expect(ageRiskPct(55)).toBe(30);
    expect(ageRiskPct(57)).toBe(30);
    expect(ageRiskPct(58)).toBe(50);
    expect(ageRiskPct(59)).toBe(50);
  });

  it("MAX_AGE 이상이면 100", () => {
    expect(ageRiskPct(MAX_AGE)).toBe(100);
    expect(ageRiskPct(MAX_AGE + 5)).toBe(100);
  });
});

describe("riskPct — 종합 위험 확률", () => {
  it("건강한 캐릭터는 하한 0.2 로 클램프된다", () => {
    // base(0.5) + 무직(1.5) − 케어감소(85→2.1 + 0→1.5 = 3.6) = -1.6 → 0.2
    expect(riskPct(base(), 20)).toBe(0.2);
  });

  it("MAX_AGE 이상이면 상한 100", () => {
    expect(riskPct(base(), MAX_AGE)).toBe(100);
  });

  it("neutral=true 는 아픈 컨디션 대신 중립값(50/30/50)으로 평가한다", () => {
    const sick = withStatus({ health: 10, burnout: 90, stress: 90 });
    // 실제 컨디션: 1.5 + 1.5 + 2(stress>80) − ((10-50)*0.06 + (50-90)*0.03) = 8.6
    expect(riskPct(sick, 30)).toBeCloseTo(8.6, 10);
    // 중립: 1.5 + 1.5 + 0 − ((50-50)*0.06 + (50-30)*0.03) = 2.4
    expect(riskPct(sick, 30, true)).toBeCloseTo(2.4, 10);
    expect(riskPct(sick, 30, true)).toBeLessThan(riskPct(sick, 30));
  });

  it("직업 위험도(riskLevel×100)가 더해진다", () => {
    const employed = { ...base(), job: devJob(4000) }; // dev riskLevel 0.012 → 1.2
    // 중립 기준: 1.5 + 1.2 − 0.6 = 2.1 (무직은 1.5 + 1.5 − 0.6 = 2.4)
    expect(riskPct(employed, 30, true)).toBeCloseTo(2.1, 10);
  });
});

describe("rollLifeRisk — 사고/사망 굴림", () => {
  it("MAX_AGE 이상이면 rand 와 무관하게 노환 사망", () => {
    expect(rollLifeRisk(base(), MAX_AGE, 0.99, 0.99, 0.5)).toEqual({
      kind: "death",
      cause: "노환",
    });
  });

  it("rTrigger 가 확률보다 높으면 none", () => {
    expect(rollLifeRisk(base(), 30, 0.999, 0, 0)).toEqual({ kind: "none" });
  });

  it("rTrigger=0 + rFatal=0 이면 사망 — 52세 미만은 사건 사인, 52세 이상은 지병", () => {
    expect(rollLifeRisk(base(), 30, 0, 0, 0)).toEqual({
      kind: "death",
      cause: "교통사고", // rPick=0 → INCIDENTS[0]
    });
    expect(rollLifeRisk(base(), 55, 0, 0, 0)).toEqual({ kind: "death", cause: "지병" });
  });

  it("rTrigger=0 + rFatal=0.99 이면 회복 가능한 사건 (사인은 INCIDENT_CAUSES 중 하나)", () => {
    // 기본 캐릭터(지구력/근력 5) → 단련 경감 2% → 30×0.98=29.4 → 반올림 29
    const ev = rollLifeRisk(base(), 30, 0, 0.99, 0);
    expect(ev).toEqual({ kind: "incident", cause: "교통사고", healthHit: 29 });
    const last = rollLifeRisk(base(), 30, 0, 0.99, 0.99); // rPick 끝 → 마지막 항목
    expect(last).toEqual({ kind: "incident", cause: "부상", healthHit: 20 }); // 19.6 → 20
    if (ev.kind === "incident") expect(INCIDENT_CAUSES).toContain(ev.cause);
  });

  it("지구력·근력이 높으면 사고 피해가 최대 40%까지 줄어든다", () => {
    const tough = base();
    tough.stats = { ...tough.stats, stamina: 100, strength: 100 };
    const ev = rollLifeRisk(tough, 30, 0, 0.99, 0);
    // 30 × (1 - 0.4) = 18
    expect(ev).toEqual({ kind: "incident", cause: "교통사고", healthHit: 18 });
  });
});

describe("yearlyNet — 연간 저축 변화", () => {
  it("취업 전에는 생활비 면제로 0", () => {
    expect(yearlyNet(base())).toBe(0);
  });

  it("취업 후에는 연봉 − LIVING_COST", () => {
    const c = { ...base(), job: devJob(5000) };
    expect(yearlyNet(c)).toBe(5000 - LIVING_COST);
  });

  it("자녀가 있으면 1명당 CHILD_COST 만큼 양육비가 추가된다", () => {
    const c = { ...base(), job: devJob(5000), childrenBornAges: [30, 33] };
    expect(yearlyNet(c)).toBe(5000 - LIVING_COST - 2 * CHILD_COST);
  });

  it("취업 전 학생/취준생은 stage 를 주면 단계별 용돈/알바 수입", () => {
    expect(yearlyNet(base(), { stage: "elementary" })).toBe(
      ALLOWANCE_BY_STAGE.elementary,
    );
    expect(yearlyNet(base(), { stage: "jobseeker" })).toBe(
      ALLOWANCE_BY_STAGE.jobseeker,
    );
    // 용돈이 없는 단계(아기)는 0
    expect(yearlyNet(base(), { stage: "baby" })).toBe(0);
  });

  it("등급이 용돈을 ±30% 가감한다 (S > B > D)", () => {
    const high = (g: "S" | "B" | "D") =>
      yearlyNet(base(), { stage: "high", grade: g });
    expect(high("S")).toBeGreaterThan(high("B"));
    expect(high("B")).toBeGreaterThan(high("D"));
    expect(high("S")).toBe(Math.round(ALLOWANCE_BY_STAGE.high! * 1.3));
    expect(high("D")).toBe(Math.round(ALLOWANCE_BY_STAGE.high! * 0.7));
  });

  it("용돈은 보수적 — 최대치(알바)도 생활비보다 작고, 취업자는 opts 무시", () => {
    const maxAllowance = Math.max(
      ...Object.values(ALLOWANCE_BY_STAGE).map((v) => Math.round(v * 1.3)),
    );
    expect(maxAllowance).toBeLessThan(LIVING_COST);
    const employed = { ...base(), job: devJob(5000) };
    expect(yearlyNet(employed, { stage: "jobseeker", grade: "S" })).toBe(
      5000 - LIVING_COST,
    );
  });
});

describe("updateHappiness — 행복도 갱신", () => {
  it("가중 평균 공식대로 계산해 반올림한다", () => {
    const st = base().status; // mood 80, burnout 0, stress 8, health 85
    // yearHappy = 80*0.4 + 100*0.25 + 92*0.2 + 85*0.15 = 88.15
    // 50*0.6 + 88.15*0.4 = 65.26 → 65
    expect(updateHappiness(50, st)).toBe(65);
  });

  it("결과는 0~100 으로 클램프된다", () => {
    const best = { ...base().status, mood: 100, burnout: 0, stress: 0, health: 100 };
    expect(updateHappiness(120, best)).toBe(100); // 112 → 100
    const worst = { ...base().status, mood: 0, burnout: 100, stress: 100, health: 0 };
    expect(updateHappiness(-50, worst)).toBe(0); // -30 → 0
  });
});
