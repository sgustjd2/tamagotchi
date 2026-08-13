// ---------------------------------------------------------------------------
// events.test.ts — 연간 랜덤 인생 이벤트(rollYearlyEvent)와 결혼/출산 판정 테스트
// rand 파라미터(rTrigger/rPick/r)를 고정 주입해 결정적으로 검증한다.
// ---------------------------------------------------------------------------

import { describe, expect, it } from "vitest";
import { createCharacter } from "@/lib/game/character";
import {
  MAX_CHILDREN,
  YEARLY_EVENT_CHANCE,
  childbirthChance,
  rollChildbirth,
  rollMarriage,
  rollYearlyEvent,
} from "@/lib/game/events";
import type { Character, JobState } from "@/types/character";

const NOW = 1_700_000_000_000;

/** 기본 캐릭터 + 필요한 필드만 덮어쓰기 */
function makeChar(overrides: Partial<Character> = {}): Character {
  return { ...createCharacter("u1", "테스트", "blush", "male", NOW), ...overrides };
}

const JOB: JobState = {
  family: "dev",
  company: "midsize",
  grade: "staff",
  title: "사원",
  salaryManwon: 4000,
  hiredAt: NOW,
  hiredAtAge: 27,
};

/** rPick 을 촘촘히 스캔해 해당 조건에서 등장 가능한 이벤트 키 집합 수집 */
function possibleKeys(c: Character, age: number): Set<string> {
  const keys = new Set<string>();
  for (let i = 0; i <= 400; i++) {
    const ev = rollYearlyEvent(c, age, 0, i / 400);
    if (ev) keys.add(ev.record.key);
  }
  return keys;
}

/** 특정 키의 이벤트를 결정적으로 뽑아오는 헬퍼 */
function pickByKey(c: Character, age: number, key: string) {
  for (let i = 0; i <= 400; i++) {
    const ev = rollYearlyEvent(c, age, 0, i / 400);
    if (ev?.record.key === key) return ev;
  }
  return null;
}

describe("rollYearlyEvent", () => {
  it("rTrigger 가 YEARLY_EVENT_CHANCE 이상이면 발동하지 않는다", () => {
    const c = makeChar();
    expect(rollYearlyEvent(c, 30, YEARLY_EVENT_CHANCE, 0)).toBeNull(); // 경계값(>=)
    expect(rollYearlyEvent(c, 30, 0.99, 0)).toBeNull();
    expect(rollYearlyEvent(c, 30, YEARLY_EVENT_CHANCE - 0.001, 0)).not.toBeNull();
  });

  it("rTrigger 0 + rPick 0 이면 첫 번째 적격 이벤트(foundCash)가 선택된다", () => {
    const ev = rollYearlyEvent(makeChar({ job: JOB }), 30, 0, 0);
    expect(ev?.record.key).toBe("foundCash");
    expect(ev?.savingsDelta).toBe(20);
    expect(ev?.record.savingsDelta).toBe(20); // 0이 아니므로 기록에도 포함
  });

  it("나이 게이트: 7세는 적격 이벤트가 없어 null, 8세는 어린이용 이벤트만 가능", () => {
    const c = makeChar(); // job 없음, savings 0
    expect(rollYearlyEvent(c, 7, 0, 0)).toBeNull();
    expect(possibleKeys(c, 8)).toEqual(new Set(["foundCash", "schoolPrize"]));
  });

  it("bonus 는 취업 상태에서만 풀에 포함되고, 금액은 연봉의 5% 반올림", () => {
    expect(possibleKeys(makeChar(), 30).has("bonus")).toBe(false);
    const withJob = makeChar({ job: JOB });
    expect(possibleKeys(withJob, 30).has("bonus")).toBe(true);
    expect(pickByKey(withJob, 30, "bonus")?.savingsDelta).toBe(200); // 4000 * 0.05
  });

  it("투자 이벤트는 20세 이상 + 저축 500 이상일 때만 등장한다", () => {
    const poor = possibleKeys(makeChar({ savings: 499 }), 30);
    expect(poor.has("stockGain")).toBe(false);
    expect(poor.has("stockLoss")).toBe(false);

    const young = possibleKeys(makeChar({ savings: 1000 }), 19); // 나이 게이트
    expect(young.has("stockGain")).toBe(false);

    const rich = possibleKeys(makeChar({ savings: 500 }), 30);
    expect(rich.has("stockGain")).toBe(true);
    expect(rich.has("stockLoss")).toBe(true);
  });

  it("투자 이득/손실의 savingsDelta 부호와 5,000 상한", () => {
    const c = makeChar({ savings: 1000 });
    expect(pickByKey(c, 30, "stockGain")?.savingsDelta).toBe(80); // round(1000*0.08)
    expect(pickByKey(c, 30, "stockLoss")?.savingsDelta).toBe(-80);
    // 저축이 아주 커도 ±5,000 으로 캡 (후반에도 체감되도록 상한 확대)
    const rich = makeChar({ savings: 100_000 });
    expect(pickByKey(rich, 30, "stockGain")?.savingsDelta).toBe(5000);
    expect(pickByKey(rich, 30, "stockLoss")?.savingsDelta).toBe(-5000);
  });

  it("복권/휴대폰 파손 금액은 연봉에 비례해 커진다(무직은 기본값)", () => {
    expect(pickByKey(makeChar(), 30, "lottery")?.savingsDelta).toBe(300);
    const salaried = makeChar({ job: JOB }); // 연봉 4000
    expect(pickByKey(salaried, 30, "lottery")?.savingsDelta).toBe(300 + 1200);
    expect(pickByKey(salaried, 30, "phoneBroken")?.savingsDelta).toBe(-(80 + 80));
  });

  it("savingsDelta 가 0이면 record.savingsDelta 는 undefined", () => {
    const ev = pickByKey(makeChar(), 30, "reunion");
    expect(ev?.savingsDelta).toBe(0);
    expect(ev?.record.savingsDelta).toBeUndefined();
  });
});

describe("rollMarriage", () => {
  // 모든 조건 충족 기준 캐릭터: 미혼 · 30세 · 취업 · 행복 60
  const ok = () => makeChar({ job: JOB, happiness: 60 });

  it("모든 조건 충족 + r < 0.18 이면 true, r >= 0.18 이면 false", () => {
    expect(rollMarriage(ok(), 30, 0.17)).toBe(true);
    expect(rollMarriage(ok(), 30, 0.18)).toBe(false); // 확률 경계(>=)
  });

  it("이미 결혼했으면 false", () => {
    expect(rollMarriage(makeChar({ job: JOB, happiness: 60, marriedAtAge: 28 }), 30, 0)).toBe(false);
  });

  it("나이 경계: 26~45세만 가능", () => {
    expect(rollMarriage(ok(), 25, 0)).toBe(false);
    expect(rollMarriage(ok(), 26, 0)).toBe(true);
    expect(rollMarriage(ok(), 45, 0)).toBe(true);
    expect(rollMarriage(ok(), 46, 0)).toBe(false);
  });

  it("무직이면 false", () => {
    expect(rollMarriage(makeChar({ happiness: 60 }), 30, 0)).toBe(false);
  });

  it("행복도 경계: 55 미만이면 false", () => {
    expect(rollMarriage(makeChar({ job: JOB, happiness: 54 }), 30, 0)).toBe(false);
    expect(rollMarriage(makeChar({ job: JOB, happiness: 55 }), 30, 0)).toBe(true);
  });
});

describe("rollChildbirth", () => {
  // 조건 충족 기준: 28세 결혼 · 현재 30세 · 자녀 없음
  const ok = () => makeChar({ marriedAtAge: 28 });

  it("첫 판정 해(결혼 1년차)는 30% — r < 0.3 true, r >= 0.3 false", () => {
    const first = makeChar({ marriedAtAge: 28 });
    expect(rollChildbirth(first, 29, 0.29)).toBe(true);
    expect(rollChildbirth(first, 29, 0.3)).toBe(false); // 확률 경계(>=)
  });

  it("무자녀 해가 갈수록 확률이 +8%p씩 오르고 70%에서 멈춘다", () => {
    const c = ok(); // 28세 결혼
    expect(childbirthChance(c, 29)).toBeCloseTo(0.3); // 1년차
    expect(childbirthChance(c, 30)).toBeCloseTo(0.38); // 2년차
    expect(childbirthChance(c, 31)).toBeCloseTo(0.46); // 3년차
    expect(childbirthChance(c, 34)).toBeCloseTo(0.7); // 6년차 = 상한
    expect(childbirthChance(c, 40)).toBeCloseTo(0.7); // 상한 유지
  });

  it("둘째는 첫째 출산 시점 기준으로 30%부터 다시 시작한다", () => {
    const c = makeChar({ marriedAtAge: 28, childrenBornAges: [33] });
    expect(childbirthChance(c, 34)).toBeCloseTo(0.3); // 출산 이듬해
    expect(childbirthChance(c, 36)).toBeCloseTo(0.46); // 출산 +3년
  });

  it("미혼이면 false", () => {
    expect(rollChildbirth(makeChar(), 30, 0)).toBe(false);
  });

  it("나이 경계: 45세까지 가능, 46세부터 불가", () => {
    expect(rollChildbirth(ok(), 45, 0)).toBe(true);
    expect(rollChildbirth(ok(), 46, 0)).toBe(false);
  });

  it("자녀가 MAX_CHILDREN 명이면 false, 1명이면 가능", () => {
    expect(rollChildbirth(makeChar({ marriedAtAge: 28, childrenBornAges: [29, 31] }), 33, 0)).toBe(false);
    expect(MAX_CHILDREN).toBe(2);
    expect(rollChildbirth(makeChar({ marriedAtAge: 28, childrenBornAges: [29] }), 33, 0)).toBe(true);
  });

  it("결혼 1년 미만이면 false", () => {
    expect(rollChildbirth(makeChar({ marriedAtAge: 30 }), 30, 0)).toBe(false);
    expect(rollChildbirth(makeChar({ marriedAtAge: 30 }), 31, 0)).toBe(true);
  });
});
