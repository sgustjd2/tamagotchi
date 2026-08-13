// work.test.ts — 승진 심사(promotionScore/promotionHold) 밸런스 테스트
// C등급 보류 완화(D만 보류) + 같은 직급 근속 보정(+2/년, 최대 +10) 검증.

import { describe, expect, it } from "vitest";

import { createCharacter } from "../character";
import { promotionHold, promotionScore } from "../work";
import type { Character, JobState } from "@/types/character";

const JOB: JobState = {
  family: "dev",
  company: "small",
  grade: "staff",
  title: "개발/IT 사원",
  salaryManwon: 3200,
  hiredAt: 0,
  hiredAtAge: 26,
};

function make(over: Partial<Character> = {}): Character {
  const c = createCharacter("u_test", "테스트", "blush", "male", 0);
  return { ...c, ageYears: 30, job: { ...JOB }, ...over };
}

const COUNTERS = { study: 8, exercise: 8, selfDev: 8, meals: 8 };

describe("promotionHold — 보류 사유", () => {
  it("평가 C는 더 이상 보류가 아니다 (점수에 이미 반영되므로 이중 처벌 제거)", () => {
    expect(promotionHold(make(), "C", COUNTERS)).not.toContain("평가 부진");
  });

  it("평가 D는 여전히 보류", () => {
    expect(promotionHold(make(), "D", COUNTERS)).toContain("평가 부진");
  });

  it("번아웃 85+ · 자기개발 0회 · 건강 30 미만 보류는 유지", () => {
    const burned = make();
    burned.status.burnout = 90;
    expect(promotionHold(burned, "B", COUNTERS)).toContain("번아웃");
    expect(promotionHold(make(), "B", { ...COUNTERS, selfDev: 0 })).toContain(
      "자기개발 부족",
    );
    const sick = make();
    sick.status.health = 20;
    expect(promotionHold(sick, "B", COUNTERS)).toContain("건강 악화");
  });
});

describe("promotionScore — 같은 직급 근속 보정", () => {
  // 승진(또는 입사) 이듬해 첫 심사는 보정 0, 이후 1년마다 +2, 최대 +10
  it("첫 심사 해는 보정 0, 해가 갈수록 +2씩 오른다", () => {
    const c = make(); // hiredAtAge 26, promotedAtAge 없음
    const base = promotionScore(c, 70, COUNTERS, false, 27); // 근속 1년차
    expect(promotionScore(c, 70, COUNTERS, false, 28)).toBe(base + 2);
    expect(promotionScore(c, 70, COUNTERS, false, 30)).toBe(base + 6);
  });

  it("보정은 +10에서 멈춘다", () => {
    const c = make();
    const base = promotionScore(c, 70, COUNTERS, false, 27);
    expect(promotionScore(c, 70, COUNTERS, false, 32)).toBe(base + 10); // 6년차
    expect(promotionScore(c, 70, COUNTERS, false, 40)).toBe(base + 10); // 상한 유지
  });

  it("승진하면 근속 기산점이 promotedAtAge로 리셋된다", () => {
    const promoted = make({ job: { ...JOB, grade: "junior", promotedAtAge: 33 } });
    const base = promotionScore(promoted, 70, COUNTERS, false, 34); // 승진 이듬해
    expect(promotionScore(promoted, 70, COUNTERS, false, 36)).toBe(base + 4);
  });

  it("reviewAge 를 생략하면 현재 나이(ageYears) 기준으로 동작한다 (UI 표시 경로)", () => {
    const c = make({ ageYears: 29 }); // 근속 3년차 → +4
    const explicit = promotionScore(c, 70, COUNTERS, false, 29);
    expect(promotionScore(c, 70, COUNTERS)).toBe(explicit);
  });
});
