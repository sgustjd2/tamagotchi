// ---------------------------------------------------------------------------
// legacy.ts
// 2세대 플레이 — 엔딩(사망) 후 자녀에게 이어가기.
// 부모 저축의 일부를 유산으로, 핵심 스탯 일부를 재능(시작 보너스)으로 물려준다.
// ---------------------------------------------------------------------------

import type {
  Character,
  CharacterStats,
  HousingOptionKey,
  HousingState,
  RoomItemKey,
  WardrobeItemKey,
} from "@/types/character";
import { netWorth } from "./assets";
import { housingDef, HOUSING_OPTIONS, type HousingDef } from "./housing";

/** 유산 상속률 — 부모 최종 순자산(저축+차/집 처분)의 20% (빚은 물려주지 않음) */
export const INHERITANCE_RATE = 0.2;

export function inheritanceAmount(c: Character): number {
  return Math.max(0, Math.round(netWorth(c) * INHERITANCE_RATE));
}

/** "철수" → "철수 2세", "철수 2세" → "철수 3세" */
export function nextGenName(c: Character): string {
  const base = c.name.replace(/\s?\d+세$/, "").trim();
  const gen = (c.generation ?? 1) + 1;
  return `${base} ${gen}세`;
}

/** 부모 스탯의 5%(최대 +5)를 자녀 시작 스탯에 재능으로 반영 */
export function inheritedStatBonus(stats: CharacterStats): Partial<CharacterStats> {
  const keys: (keyof CharacterStats)[] = [
    "intelligence",
    "discipline",
    "creativity",
    "memory",
    "communication",
    "fitness",
  ];
  const out: Partial<CharacterStats> = {};
  for (const k of keys) {
    out[k] = 5 + Math.min(5, Math.round(stats[k] * 0.05));
  }
  return out;
}

/** 2세대 시작 가능 여부 — 사망 엔딩 + 자녀 존재 */
export function canStartSecondGen(c: Character): boolean {
  return c.deathAge != null && (c.childrenBornAges?.length ?? 0) > 0;
}

// ---------------------------------------------------------------------------
// 유품 상속 — 부모가 쓰던 옷장/방 아이템을 각각 랜덤 2~3개 물려준다.
// ---------------------------------------------------------------------------

export const INHERITED_ITEM_MIN = 2;
export const INHERITED_ITEM_MAX = 3;

/** 보유 목록에서 중복 없이 count 개 선택 — rand 주입(결정성, 테스트 가능) */
export function pickInherited<T>(owned: T[], count: number, rand: () => number): T[] {
  const pool = [...owned];
  const out: T[] = [];
  while (pool.length > 0 && out.length < count) {
    out.push(pool.splice(Math.floor(rand() * pool.length), 1)[0]);
  }
  return out;
}

/** 부모 소장품에서 유품 선정 — 보유분이 적으면 있는 만큼만 */
export function inheritedItems(
  c: Character,
  rand: () => number,
): { wardrobe: WardrobeItemKey[]; roomItems: RoomItemKey[] } {
  const count = () =>
    INHERITED_ITEM_MIN +
    Math.floor(rand() * (INHERITED_ITEM_MAX - INHERITED_ITEM_MIN + 1));
  return {
    wardrobe: pickInherited(c.wardrobe ?? [], count(), rand),
    roomItems: pickInherited(c.roomItems ?? [], count(), rand),
  };
}

// ---------------------------------------------------------------------------
// 시작 주거 — 유산이 크면 본가 대신 부모가 마련해 준 집에서 인생을 시작한다.
// ---------------------------------------------------------------------------

/** 유산으로 대출 없이 전액 감당 가능한 시작 주거 선택지 — 본가(0원)는 항상 포함 */
export function startingHousingOptions(inherited: number): HousingDef[] {
  return HOUSING_OPTIONS.filter((h) => h.key === "parents" || h.price <= inherited);
}

/**
 * 선택한 시작 주거를 적용 — 유산(savings)에서 전액 지불, 대출 없음.
 * 감당 불가하거나 본가면 그대로 반환(방어적).
 */
export function applyStartingHousing(
  child: Character,
  key: HousingOptionKey,
): Character {
  const def = housingDef(key);
  if (def.key === "parents" || def.price > child.savings) return child;
  const housing: HousingState = {
    option: def.key,
    deposit: def.kind === "monthly" || def.kind === "jeonse" ? def.price : 0,
    loanBalance: 0,
    homeValue: def.kind === "owned" ? def.price : 0,
  };
  return { ...child, savings: child.savings - def.price, housing };
}
