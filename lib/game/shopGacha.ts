// ---------------------------------------------------------------------------
// shopGacha.ts
// 상점 뽑기 — 옷/방 인테리어/자동차를 직접 구매 대신 확률 뽑기로 획득한다.
// 티켓값은 고정, 결과는 미소장 아이템 중 랜덤(중복 없음 → 뽑다 보면 전부 모인다).
// 풀의 상위 가격대(1/3)가 "레어"이고, 행운 스탯이 레어 확률을 올린다.
// rand 는 0~1 주입(결정성 — 테스트 가능).
// ---------------------------------------------------------------------------

import type { Character } from "@/types/character";
import { ASSETS, ownedTier } from "./assets";
import { luckBonus } from "./minigame";
import { ROOM_ITEMS } from "./roomItems";
import { WARDROBE_ITEMS } from "./wardrobe";

export type GachaCategory = "wardrobe" | "room" | "car";

/** 자동차 뽑기 최소 나이 */
export const CAR_MIN_AGE = 20;

/** 뽑기 후보 공통 형태(정가는 희귀도 산정·"이득" 표시 기준) */
export interface GachaItem {
  key: string;
  label: string;
  emoji: string;
  price: number;
}

export const GACHA_CONFIG: Record<
  GachaCategory,
  { label: string; emoji: string; price: number }
> = {
  // ponytail: 티켓값은 풀 평균 정가보다 싸게 — 전부 모으면 직접 구매 합계보다 이득이라
  // 뽑기가 손해로 느껴지지 않게 한다. 경제 인플레가 보이면 티켓값부터 올릴 것.
  wardrobe: { label: "옷 뽑기", emoji: "🎽", price: 5 },
  room: { label: "인테리어 뽑기", emoji: "📦", price: 150 },
  car: { label: "자동차 뽑기", emoji: "🎟️", price: 3000 },
};

/** 아직 소장하지 않았고 조건(나이/티어)을 충족하는 후보 — 가격 오름차순 */
export function gachaPool(c: Character, category: GachaCategory): GachaItem[] {
  let pool: GachaItem[];
  if (category === "wardrobe") {
    pool = WARDROBE_ITEMS.filter(
      (w) => !c.wardrobe.includes(w.key) && c.ageYears >= w.minAge,
    );
  } else if (category === "room") {
    pool = ROOM_ITEMS.filter((i) => !c.roomItems.includes(i.key));
  } else {
    // 자동차는 성인(20살)부터 — 0세가 슈퍼카를 뽑는 것 방지
    if (c.ageYears < CAR_MIN_AGE) return [];
    const cur = ownedTier(c.assets, "car");
    pool = ASSETS.filter((a) => a.tier > cur);
  }
  return [...pool].sort((a, b) => a.price - b.price);
}

export function canPullGacha(
  c: Character,
  category: GachaCategory,
): { ok: boolean; reason?: string } {
  if (gachaPool(c, category).length === 0) {
    // 옷장: 나이 게이트로 풀이 빈 것과 진짜 다 모은 것을 구분해 안내
    if (
      category === "wardrobe" &&
      WARDROBE_ITEMS.some((w) => !c.wardrobe.includes(w.key))
    ) {
      return { ok: false, reason: "지금 나이에 뽑을 수 있는 옷은 다 모았어요!" };
    }
    if (category === "car" && c.ageYears < CAR_MIN_AGE) {
      return { ok: false, reason: `자동차는 ${CAR_MIN_AGE}살부터!` };
    }
    return { ok: false, reason: "모두 소장하고 있어요!" };
  }
  if (c.savings < GACHA_CONFIG[category].price) {
    return { ok: false, reason: "저축이 부족해요." };
  }
  return { ok: true };
}

export interface GachaPull {
  item: GachaItem;
  /** 레어 그룹(상위 가격대)에서 나왔는지 — 연출용 */
  rare: boolean;
}

/** 레어 확률(%) = 기본 18 + 행운 보너스(최대 +15) */
export function gachaRareChance(c: Character): number {
  return 18 + luckBonus(c);
}

/** 뽑기 실행 — rand1: 레어 판정, rand2: 그룹 내 선택. 풀이 비면 null */
export function pullShopGacha(
  c: Character,
  category: GachaCategory,
  rand1: number,
  rand2: number,
): GachaPull | null {
  const pool = gachaPool(c, category);
  if (pool.length === 0) return null;
  const rareCount = Math.max(1, Math.floor(pool.length / 3));
  const commonGroup = pool.slice(0, pool.length - rareCount);
  const rareGroup = pool.slice(pool.length - rareCount);
  const useRare = commonGroup.length === 0 || rand1 * 100 < gachaRareChance(c);
  const group = useRare ? rareGroup : commonGroup;
  const item = group[Math.min(group.length - 1, Math.floor(rand2 * group.length))];
  // 마지막 남은 아이템(확정 지급)은 레어 연출을 하지 않는다
  return { item, rare: useRare && commonGroup.length > 0 };
}
