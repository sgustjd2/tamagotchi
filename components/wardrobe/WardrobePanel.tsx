"use client";

// 옷장 패널 — 옷/액세서리를 사서 소장하고, 입히면 위 캐릭터 스프라이트가 바로 바뀐다.
// 의상은 성장 단계 기본 복장(교복/정장 등)을 대체하고, 액세서리는 덧착용.

import type { Character, WardrobeItemKey } from "@/types/character";
import { cn } from "@/lib/utils";
import { WARDROBE_ITEMS, type WardrobeKind } from "@/lib/game/wardrobe";
import { formatMoney } from "@/lib/game/ending";
import { useGameStore } from "@/lib/store/useGameStore";
import { CollapsibleCard } from "@/components/common/CollapsibleCard";
import { GachaPullButton } from "@/components/common/GachaPullButton";

const KIND_LABEL: Record<WardrobeKind, string> = {
  outfit: "의상",
  accessory: "액세서리",
};

export function WardrobePanel({ character }: { character: Character }) {
  const equipWardrobe = useGameStore((s) => s.equipWardrobe);

  const equippedFor = (kind: WardrobeKind): WardrobeItemKey | null | undefined =>
    kind === "outfit" ? character.equippedOutfit : character.equippedAccessory;

  return (
    <CollapsibleCard
      title="옷장"
      badge={
        <span className="pill bg-butter/40 text-ink/70">
          {character.wardrobe.length}/{WARDROBE_ITEMS.length} 소장
        </span>
      }
    >
      <p className="mb-3 text-xs text-ink/55">
        옷은 뽑기로 획득해요. 입히면 캐릭터 복장이 바로 바뀌어요. 의상 1벌 + 액세서리 1개 착용.
      </p>
      <GachaPullButton character={character} category="wardrobe" />

      {(["outfit", "accessory"] as WardrobeKind[]).map((kind) => {
        const items = WARDROBE_ITEMS.filter((w) => w.kind === kind);
        const equipped = equippedFor(kind);
        return (
          <div key={kind} className="mb-2 last:mb-0">
            <div className="mb-1 flex items-center justify-between">
              <span className="font-pixel text-[11px] font-bold text-ink/60">
                {KIND_LABEL[kind]}
              </span>
              {equipped && (
                <button
                  type="button"
                  onClick={() => equipWardrobe(kind, null)}
                  className="font-pixel text-[10px] font-bold text-ink/45 underline hover:text-ink/70"
                >
                  {kind === "outfit" ? "기본 복장으로" : "빼기"}
                </button>
              )}
            </div>
            <ul className="flex flex-col gap-1.5">
              {items.map((w) => {
                const owned = character.wardrobe.includes(w.key);
                const isOn = equipped === w.key;
                return (
                  <li
                    key={w.key}
                    className={cn(
                      "flex items-center justify-between gap-2 rounded-xl px-3 py-2",
                      isOn ? "bg-mint/25" : "bg-black/[0.03]",
                    )}
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="text-base leading-none">{w.emoji}</span>
                      <div className="min-w-0">
                        <div className="font-pixel text-[11px] font-bold text-ink/80">
                          {w.label}
                        </div>
                        <div className="truncate text-[11px] text-ink/50">{w.desc}</div>
                      </div>
                    </div>
                    {owned ? (
                      <button
                        type="button"
                        onClick={() => equipWardrobe(kind, isOn ? null : w.key)}
                        className={cn(
                          "tap-44 pill shrink-0 font-bold transition-colors",
                          isOn
                            ? "bg-mint text-ink"
                            : "bg-white text-ink/60 hover:bg-cream",
                        )}
                      >
                        {isOn ? "착용 중" : "입기"}
                      </button>
                    ) : (
                      <span className="pill shrink-0 bg-black/10 text-ink/45">
                        {character.ageYears < w.minAge
                          ? `${w.minAge}살부터 뽑혀요`
                          : `미소장 · 정가 ${formatMoney(w.price)}`}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </CollapsibleCard>
  );
}
