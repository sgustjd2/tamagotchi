import { describe, expect, it } from "vitest";
import type { ActionEffect } from "@/types/action";
import type { Character, YearCounters } from "@/types/character";
import { createCharacter } from "@/lib/game/character";
import { getAction } from "@/lib/game/actions";
import { COOLDOWN_SCALE, GAME_YEAR_MS, YEARLY_TARGETS } from "@/lib/game/constants";
import {
  gradeOf,
  mergeEffect,
  runDueReviews,
  scaleEffect,
  scoreYear,
  selfDevPenaltyEffect,
} from "@/lib/game/review";

const NOW = 1_700_000_000_000;
const ZERO: YearCounters = { study: 0, exercise: 0, selfDev: 0, meals: 0 };

function makeChar(overrides: Partial<Character> = {}): Character {
  return { ...createCharacter("guest_test", "테스트", "blush", "male", NOW), ...overrides };
}

const baseStatus = makeChar().status;

describe("scoreYear", () => {
  it("목표 전량 달성 + 완벽 컨디션이면 100점", () => {
    const counters: YearCounters = { ...YEARLY_TARGETS };
    // 나이 10(초등) 적정 체중 35kg, health/sleep 100, stress 0
    const status = { ...baseStatus, health: 100, sleepQuality: 100, stress: 0, weight: 35 };
    expect(scoreYear(counters, status, 10)).toBe(100);
  });

  it("카운터 0 + neutralStatus 옵션이면 중립 기본값 16점 (컨디션 무시)", () => {
    // 50*0.12 + 50*0.08 + (100-50)*0.05 + 70*0.05 = 16
    expect(scoreYear(ZERO, baseStatus, 10, { neutralStatus: true })).toBe(16);
    // 최악의 컨디션을 넣어도 neutral 이면 동일해야 한다
    const worst = { ...baseStatus, health: 0, sleepQuality: 0, stress: 100, weight: 120 };
    expect(scoreYear(ZERO, worst, 10, { neutralStatus: true })).toBe(16);
  });

  it("항목별 가중치: study 0.22 > selfDev 0.2 > exercise 0.18 > meals 0.1", () => {
    const only = (k: keyof YearCounters) => ({ ...ZERO, [k]: YEARLY_TARGETS[k] });
    const opt = { neutralStatus: true } as const;
    // 중립 기본 16점 + 각 항목 가중치*100
    expect(scoreYear(only("study"), baseStatus, 10, opt)).toBe(38);
    expect(scoreYear(only("selfDev"), baseStatus, 10, opt)).toBe(36);
    expect(scoreYear(only("exercise"), baseStatus, 10, opt)).toBe(34);
    expect(scoreYear(only("meals"), baseStatus, 10, opt)).toBe(26);
  });

  it("목표 초과 달성해도 항목 점수는 100으로 캡", () => {
    const doubled = { ...ZERO, study: YEARLY_TARGETS.study * 2 };
    expect(scoreYear(doubled, baseStatus, 10, { neutralStatus: true })).toBe(38);
  });

  it("baby 단계는 잠긴 활동(공부·자기개발·운동)을 빼고 재정규화 — 만점 케어면 S", () => {
    const counters: YearCounters = { ...ZERO, meals: YEARLY_TARGETS.meals };
    const status = { ...baseStatus, health: 100, sleepQuality: 100, stress: 0 };
    expect(scoreYear(counters, status, 1, { stage: "baby" })).toBeGreaterThanOrEqual(85);
    // stage 없이 호출하면 기존 전체 가중 채점 유지(호환)
    expect(scoreYear(counters, status, 1)).toBeLessThan(85);
  });

  it("meals 목표는 feed 쿨타임상 1년 안에 물리적으로 달성 가능해야 한다", () => {
    const feedCd = Math.round(getAction("feed")!.cooldownMs * COOLDOWN_SCALE);
    const maxPerYear = Math.floor(GAME_YEAR_MS / feedCd);
    expect(YEARLY_TARGETS.meals).toBeLessThanOrEqual(maxPerYear);
  });
});

describe("gradeOf 경계값", () => {
  it("85=S / 84=A / 70=A / 69=B / 55=B / 54=C / 40=C / 39=D", () => {
    expect(gradeOf(85)).toBe("S");
    expect(gradeOf(84)).toBe("A");
    expect(gradeOf(70)).toBe("A");
    expect(gradeOf(69)).toBe("B");
    expect(gradeOf(55)).toBe("B");
    expect(gradeOf(54)).toBe("C");
    expect(gradeOf(40)).toBe("C");
    expect(gradeOf(39)).toBe("D");
  });
});

describe("selfDevPenaltyEffect", () => {
  it("자기개발 미해금 단계(baby)는 페널티 없음", () => {
    expect(selfDevPenaltyEffect(0, "baby")).toEqual({});
    expect(selfDevPenaltyEffect(0, "middle")).toEqual({});
  });

  it("해금 단계(high)에서 0회면 기본 페널티", () => {
    expect(selfDevPenaltyEffect(0, "high")).toEqual({
      stats: { discipline: -3, careerPotential: -5 },
      status: { confidence: -2 },
    });
  });

  it("성인(employee) 0회면 careerPotential 가중 + employability 추가 페널티", () => {
    expect(selfDevPenaltyEffect(0, "employee")).toEqual({
      stats: { discipline: -3, careerPotential: -8, employability: -3 },
      status: { confidence: -2 },
    });
  });

  it("1~2회는 경감 페널티, 10회 이상은 보너스, 3~9회는 중립", () => {
    expect(selfDevPenaltyEffect(2, "high")).toEqual({
      stats: { discipline: -1, careerPotential: -2 },
    });
    expect(selfDevPenaltyEffect(10, "employee")).toEqual({
      stats: { careerPotential: 3 },
      status: { confidence: 2 },
    });
    expect(selfDevPenaltyEffect(5, "employee")).toEqual({});
  });
});

describe("mergeEffect / scaleEffect", () => {
  it("mergeEffect: status/stats 키별 합산 + exp 합산", () => {
    const a: ActionEffect = { status: { mood: 2, stress: -1 }, stats: { intelligence: 1 }, exp: 10 };
    const b: ActionEffect = { status: { mood: 3 }, stats: { discipline: 2 }, exp: 5 };
    expect(mergeEffect(a, b)).toEqual({
      status: { mood: 5, stress: -1 },
      stats: { intelligence: 1, discipline: 2 },
      exp: 15,
    });
  });

  it("mergeEffect: 빈 효과끼리 합치면 exp 0", () => {
    expect(mergeEffect({}, {})).toEqual({ status: {}, stats: {}, exp: 0 });
  });

  it("scaleEffect: 키별 배율(round2) + exp 반올림", () => {
    const e: ActionEffect = { status: { health: -3, stress: 5 }, stats: { careerPotential: -5 }, exp: 11 };
    expect(scaleEffect(e, 0.5)).toEqual({
      status: { health: -1.5, stress: 2.5 },
      stats: { careerPotential: -2.5 },
      exp: 6, // Math.round(11 * 0.5)
    });
  });

  it("scaleEffect: exp/status 가 없으면 undefined 유지", () => {
    const scaled = scaleEffect({ stats: { discipline: -3 } }, 1.5);
    expect(scaled.status).toBeUndefined();
    expect(scaled.exp).toBeUndefined();
    expect(scaled.stats).toEqual({ discipline: -4.5 });
  });
});

describe("runDueReviews", () => {
  it("age <= lastReviewedAge 또는 사망 상태면 멱등 no-op", () => {
    const c = makeChar(); // ageYears 0, lastReviewedAge 0
    const res = runDueReviews(c, NOW);
    expect(res.reviews).toEqual([]);
    expect(res.character).toBe(c);
    const dead = makeChar({ ageYears: 5, lastReviewedAge: 0, deathAge: 5 });
    expect(runDueReviews(dead, NOW).reviews).toEqual([]);
  });

  it("나이 +1: normal 리뷰 1건 + 카운터 리셋 + lastReviewedAge 갱신", () => {
    const counters: YearCounters = { study: 2, exercise: 1, selfDev: 0, meals: 3 };
    const c = makeChar({
      ageYears: 1,
      lastReviewedAge: 0,
      bornAt: NOW - GAME_YEAR_MS,
      yearCounters: counters,
      status: { ...baseStatus, health: 95 }, // 위험 확률 최소화(1세 기준 0.2%)
    });
    const res = runDueReviews(c, NOW);
    expect(res.reviews).toHaveLength(1);
    const r = res.reviews[0];
    expect(r.id).toBe(`${c.id}:1`); // id 형식 `${id}:${age}`
    expect(r.kind).toBe("normal");
    expect(r.age).toBe(1);
    expect(r.stage).toBe("baby");
    expect(r.counters).toEqual(counters); // 리뷰에는 그 해 카운터 스냅샷 보존
    expect(r.exam).toBeUndefined(); // baby 는 학업(시험) 단계 아님
    expect(r.work).toBeUndefined(); // 무직 — 업무평가 없음
    expect(res.character.yearCounters).toEqual(ZERO);
    expect(res.character.lastReviewedAge).toBe(1);
    expect(res.character.reviews.map((x) => x.id)).toContain(`${c.id}:1`);
    // 재실행 시 새 리뷰 없음(멱등)
    expect(runDueReviews(res.character, NOW).reviews).toEqual([]);
  });

  it("나이 +3 점프: normal 1건 + neglected 요약 1건", () => {
    const c = makeChar({
      ageYears: 3,
      lastReviewedAge: 0,
      bornAt: NOW - GAME_YEAR_MS * 3,
      status: { ...baseStatus, health: 95 },
    });
    const res = runDueReviews(c, NOW);
    const first = res.reviews[0];
    expect(first.kind).toBe("normal");
    expect(first.age).toBe(1); // 직전 1년은 last+1 나이 기준으로 채점
    // 직전 1년에 사망(중립 위험 ~1.4%)하지 않았을 때만 방치 리뷰가 붙는다
    if (!first.death) {
      expect(res.reviews).toHaveLength(2);
      const neglect = res.reviews[1];
      expect(neglect.id).toBe(`${c.id}:neglect:3`);
      expect(neglect.kind).toBe("neglected");
      expect(neglect.neglectedYears).toBe(2);
      expect(neglect.score).toBe(0);
      expect(neglect.grade).toBe("D");
      expect(neglect.counters).toEqual(ZERO);
    }
    expect(res.character.lastReviewedAge).toBe(3);
    expect(res.character.yearCounters).toEqual(ZERO);
  });
});
