"use client";

import { useState } from "react";
import type { Character } from "@/types/character";
import {
  canPullGacha,
  GACHA_CONFIG,
  type GachaCategory,
} from "@/lib/game/shopGacha";
import { formatMoney } from "@/lib/game/ending";
import { useGameStore } from "@/lib/store/useGameStore";
import { ShareMomentButton } from "@/components/common/ShareMomentButton";

/** 상점 공용 뽑기 버튼 — 옷/인테리어/자동차 패널 상단에 배치 */
export function GachaPullButton({
  character,
  category,
}: {
  character: Character;
  category: GachaCategory;
}) {
  const pullGacha = useGameStore((s) => s.pullGacha);
  const conf = GACHA_CONFIG[category];
  const gate = canPullGacha(character, category);
  // 마지막 레어 당첨 — 순간 카드 공유 버튼 노출용(세션 한정, 저장 안 함)
  const [lastRare, setLastRare] = useState<{ emoji: string; label: string; price: number } | null>(
    null,
  );

  const onPull = () => {
    const res = pullGacha(category);
    setLastRare(res.pull?.rare ? res.pull : null);
  };

  return (
    <div className="mb-3">
      <button
        type="button"
        disabled={!gate.ok}
        onClick={onPull}
        className="toy-btn flex w-full items-center justify-center gap-2 bg-butter/60 py-2.5 text-sm font-bold disabled:opacity-50"
      >
        <span>{conf.emoji}</span>
        <span>
          {conf.label} · {formatMoney(conf.price)}
        </span>
      </button>
      <p className="mt-1 text-center font-sans text-[11px] font-medium text-ink/50">
        {gate.ok
          ? "미소장 아이템 중 랜덤 · 행운이 높으면 레어 확률 ↑"
          : gate.reason}
      </p>
      {lastRare && (
        <ShareMomentButton
          character={character}
          moment={{
            emoji: lastRare.emoji,
            title: "레어 당첨!",
            subtitle: `${conf.label} — ${lastRare.label}`,
            lines: [`정가 ${formatMoney(lastRare.price)}`],
          }}
        />
      )}
    </div>
  );
}
