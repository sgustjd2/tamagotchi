// ---------------------------------------------------------------------------
// legacy.test.ts — 2세대 플레이(유산·이름·재능 보너스·시작 조건) 테스트
// ---------------------------------------------------------------------------

import { describe, expect, it } from "vitest";
import { createCharacter } from "@/lib/game/character";
import { housingDef } from "@/lib/game/housing";
import {
  INHERITANCE_RATE,
  INHERITED_ITEM_MAX,
  INHERITED_ITEM_MIN,
  applyStartingHousing,
  canStartSecondGen,
  inheritanceAmount,
  inheritedItems,
  inheritedStatBonus,
  nextGenName,
  pickInherited,
  startingHousingOptions,
} from "@/lib/game/legacy";
import type { Character, CharacterStats, WardrobeItemKey } from "@/types/character";

const NOW = 1_700_000_000_000;

/** 기본 캐릭터 + 필요한 필드만 덮어쓰기 */
function makeChar(overrides: Partial<Character> = {}): Character {
  return { ...createCharacter("u1", "철수", "blush", "male", NOW), ...overrides };
}

describe("inheritanceAmount", () => {
  it("최종 저축의 20%를 반올림해 상속한다", () => {
    expect(INHERITANCE_RATE).toBe(0.2);
    expect(inheritanceAmount(makeChar({ savings: 1000 }))).toBe(200);
    expect(inheritanceAmount(makeChar({ savings: 1234 }))).toBe(247); // round(246.8)
  });

  it("저축이 음수(빚)면 물려주지 않고 0", () => {
    expect(inheritanceAmount(makeChar({ savings: -500 }))).toBe(0);
    expect(inheritanceAmount(makeChar({ savings: 0 }))).toBe(0);
  });
});

describe("nextGenName", () => {
  it('1세대 "철수" → "철수 2세"', () => {
    expect(nextGenName(makeChar({ name: "철수" }))).toBe("철수 2세");
  });

  it('2세대 "철수 2세"(generation=2) → "철수 3세"', () => {
    expect(nextGenName(makeChar({ name: "철수 2세", generation: 2 }))).toBe("철수 3세");
  });

  it("세대 번호는 이름 접미사가 아니라 generation 필드가 결정한다", () => {
    // 이름에 "5세"가 붙어 있어도 generation=2 라면 3세가 된다
    expect(nextGenName(makeChar({ name: "영희 5세", generation: 2 }))).toBe("영희 3세");
    // generation 미설정이면 1세대로 간주 → 항상 2세
    expect(nextGenName(makeChar({ name: "영희 5세" }))).toBe("영희 2세");
  });
});

describe("inheritedStatBonus", () => {
  const baseStats = (): CharacterStats => makeChar().stats;

  it("각 키마다 5 + round(스탯*5%)를 부여하고 +5에서 캡된다", () => {
    const stats: CharacterStats = {
      ...baseStats(),
      intelligence: 100, // 5 + min(5, 5) = 10
      discipline: 200, // round(10) → 캡 5 → 10
      creativity: 0, // 5 + 0 = 5
      memory: 50, // 5 + round(2.5)=3 → 8
      communication: 49, // 5 + round(2.45)=2 → 7
      fitness: 10, // 5 + round(0.5)=1 → 6
    };
    const out = inheritedStatBonus(stats);
    expect(out.intelligence).toBe(10);
    expect(out.discipline).toBe(10); // 거대 스탯도 최대 +5
    expect(out.creativity).toBe(5);
    expect(out.memory).toBe(8);
    expect(out.communication).toBe(7);
    expect(out.fitness).toBe(6);
  });

  it("재능 대상 6개 키만 반환한다(stamina 등은 제외)", () => {
    const out = inheritedStatBonus(baseStats());
    expect(Object.keys(out).sort()).toEqual(
      ["communication", "creativity", "discipline", "fitness", "intelligence", "memory"].sort(),
    );
    expect(out).not.toHaveProperty("stamina");
  });
});

describe("pickInherited / inheritedItems — 유품 상속", () => {
  it("보유 목록에서 중복 없이 count 개를 뽑는다 (rand 결정적)", () => {
    const owned = ["a", "b", "c", "d", "e"];
    const seq = [0.9, 0.1, 0.5];
    let i = 0;
    const rand = () => seq[i++ % seq.length];
    const out = pickInherited(owned, 3, rand);
    expect(out).toHaveLength(3);
    expect(new Set(out).size).toBe(3);
    out.forEach((k) => expect(owned).toContain(k));
  });

  it("보유분이 count 보다 적으면 있는 만큼만", () => {
    expect(pickInherited(["a"], 3, () => 0)).toEqual(["a"]);
    expect(pickInherited([], 3, () => 0)).toEqual([]);
  });

  it("옷·방 아이템을 각각 2~3개 범위로 물려준다", () => {
    const parent = makeChar({
      wardrobe: ["dress", "hoodie", "suit", "hanbok", "crown"] as WardrobeItemKey[],
      roomItems: [],
    });
    const out = inheritedItems(parent, () => 0.5);
    expect(out.wardrobe.length).toBeGreaterThanOrEqual(INHERITED_ITEM_MIN);
    expect(out.wardrobe.length).toBeLessThanOrEqual(INHERITED_ITEM_MAX);
    expect(out.roomItems).toEqual([]);
  });
});

describe("startingHousingOptions / applyStartingHousing — 시작 주거", () => {
  it("유산으로 전액 감당 가능한 선택지만 — 본가는 항상 포함", () => {
    expect(startingHousingOptions(0).map((h) => h.key)).toEqual(["parents"]);
    const keys = startingHousingOptions(1000).map((h) => h.key);
    expect(keys).toContain("parents");
    expect(keys).toContain("monthlyOneRoom"); // 보증금 1000
    expect(keys).not.toContain("jeonseOfficetel"); // 3억은 불가
  });

  it("적용 시 유산에서 전액 차감, 대출 없음", () => {
    const child = makeChar({ savings: 5000 });
    const out = applyStartingHousing(child, "monthlyOneRoom");
    const def = housingDef("monthlyOneRoom");
    expect(out.savings).toBe(5000 - def.price);
    expect(out.housing).toEqual({
      option: "monthlyOneRoom",
      deposit: def.price,
      loanBalance: 0,
      homeValue: 0,
    });
  });

  it("감당 불가하거나 본가면 변경 없음", () => {
    const poor = makeChar({ savings: 100 });
    expect(applyStartingHousing(poor, "aptOwned")).toBe(poor);
    expect(applyStartingHousing(poor, "parents")).toBe(poor);
  });
});

describe("canStartSecondGen", () => {
  it("사망 엔딩 + 자녀가 있어야 true", () => {
    expect(canStartSecondGen(makeChar({ deathAge: 70, childrenBornAges: [30] }))).toBe(true);
  });

  it("사망하지 않았으면 false", () => {
    expect(canStartSecondGen(makeChar({ childrenBornAges: [30] }))).toBe(false);
  });

  it("자녀가 없으면(빈 배열/미설정) false", () => {
    expect(canStartSecondGen(makeChar({ deathAge: 70, childrenBornAges: [] }))).toBe(false);
    expect(canStartSecondGen(makeChar({ deathAge: 70 }))).toBe(false);
  });
});
