"use client";

import { useRef, useState } from "react";

import type { Character } from "@/types/character";
import { cn } from "@/lib/utils";
import { PixelIcon } from "@/components/pixel/PixelIcon";
import { ActionGrid } from "@/components/actions/ActionGrid";
import { FoodSelector } from "@/components/actions/FoodSelector";
import { StudyCard } from "@/components/actions/StudyCard";
import { StatsPanel } from "@/components/character/StatsPanel";
import { WeightCard } from "@/components/character/WeightCard";
import { CareerCard } from "@/components/dashboard/CareerCard";
import { MinigamePanel } from "@/components/minigame/MinigamePanel";
import { LeisurePanel } from "@/components/leisure/LeisurePanel";
import { WardrobePanel } from "@/components/wardrobe/WardrobePanel";
import { RoomShopPanel } from "@/components/room/RoomShopPanel";
import { HousingPanel } from "@/components/room/HousingPanel";
import { AssetPanel } from "@/components/room/AssetPanel";

type TabKey = "care" | "status" | "play" | "shop";

const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: "care", label: "케어", icon: "heart" },
  { key: "status", label: "상태", icon: "chart" },
  { key: "play", label: "놀이", icon: "play" },
  { key: "shop", label: "상점", icon: "coin" },
];

/**
 * 다마고치식 탭 패널 — 페이지 스크롤 대신 탭으로 화면을 전환하고,
 * 긴 목록은 탭 내부에서만 스크롤한다(부모가 min-h-0 flex 로 높이를 잡아줘야 함).
 */
export function DashboardTabs({
  character,
  now,
}: {
  character: Character;
  now: number;
}) {
  const [tab, setTab] = useState<TabKey>("care");
  const scrollRef = useRef<HTMLDivElement>(null);
  const switchTab = (key: TabKey) => {
    setTab(key);
    scrollRef.current?.scrollTo({ top: 0 });
  };
  // 비활성 탭은 언마운트하지 않고 CSS 로만 숨긴다 — StudyCard 의 집중 세션
  // visibilitychange 추적(hiddenMs)이 탭 전환으로 끊기지 않아야 하기 때문
  const panelCls = (key: TabKey) =>
    cn("flex-col gap-3", tab === key ? "flex" : "hidden");

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div className="grid shrink-0 grid-cols-4 gap-1.5">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => switchTab(t.key)}
            className={cn(
              "toy-btn flex items-center justify-center gap-1 whitespace-nowrap px-1 py-2 font-pixel text-[11px] font-bold sm:gap-1.5 sm:text-xs",
              tab === t.key ? "bg-butter" : "bg-white",
            )}
          >
            <PixelIcon name={t.icon} size={13} className="shrink-0" />
            {t.label}
          </button>
        ))}
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto pb-2">
        <div className={panelCls("care")}>
          <StudyCard character={character} now={now} />
          <div className="card p-4">
            <h3 className="mb-3 font-pixel text-sm font-bold text-ink/80">식사</h3>
            <FoodSelector character={character} now={now} />
          </div>
          <ActionGrid character={character} now={now} />
        </div>
        <div className={panelCls("status")}>
          <WeightCard character={character} />
          <CareerCard character={character} />
          <StatsPanel character={character} />
        </div>
        <div className={panelCls("play")}>
          <MinigamePanel character={character} />
          <LeisurePanel character={character} now={now} />
        </div>
        <div className={panelCls("shop")}>
          <WardrobePanel character={character} />
          <RoomShopPanel character={character} />
          <HousingPanel character={character} />
          <AssetPanel character={character} />
        </div>
      </div>
    </div>
  );
}
