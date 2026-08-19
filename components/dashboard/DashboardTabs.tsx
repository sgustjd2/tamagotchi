"use client";

import { useEffect, useRef } from "react";

import type { Character } from "@/types/character";
import { cn } from "@/lib/utils";
import { PixelIcon } from "@/components/pixel/PixelIcon";
import { StatBar } from "@/components/common/StatBar";
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

export type TabKey = "care" | "status" | "play" | "shop";

export const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: "care", label: "케어", icon: "heart" },
  { key: "status", label: "상태", icon: "chart" },
  { key: "play", label: "놀이", icon: "play" },
  { key: "shop", label: "상점", icon: "coin" },
];

/**
 * 다마고치식 탭 패널 — 페이지 스크롤 대신 탭으로 화면을 전환하고,
 * 긴 목록은 탭 내부에서만 스크롤한다(부모가 min-h-0 flex 로 높이를 잡아줘야 함).
 * 탭 상태는 부모(기기 셸 A/B/C 버튼과 공유)가 소유하는 제어 컴포넌트.
 * scrollSignal 이 바뀌면 같은 탭이어도 맨 위로 스크롤(B 버튼 = 확인).
 */
export function DashboardTabs({
  character,
  now,
  tab,
  onTabChange,
  scrollSignal = 0,
}: {
  character: Character;
  now: number;
  tab: TabKey;
  onTabChange: (key: TabKey) => void;
  scrollSignal?: number;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const switchTab = (key: TabKey) => {
    onTabChange(key);
    scrollRef.current?.scrollTo({ top: 0 });
  };
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [tab, scrollSignal]);
  // 비활성 탭은 언마운트하지 않고 CSS 로만 숨긴다 — StudyCard 의 집중 세션
  // visibilitychange 추적(hiddenMs)이 탭 전환으로 끊기지 않아야 하기 때문
  const panelCls = (key: TabKey) =>
    cn("flex-col gap-3", tab === key ? "flex" : "hidden");

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      {/* 탭 버튼 — 호버 시 살짝 앞으로 기울어지는 입체 카드 느낌(perspective 틸트) */}
      <div className="grid shrink-0 grid-cols-4 gap-1.5 [perspective:500px]">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => switchTab(t.key)}
            className={cn(
              "toy-btn relative flex items-center justify-center gap-1 whitespace-nowrap px-1 py-2 font-pixel text-[11px] font-bold transition-transform duration-150 sm:gap-1.5 sm:text-xs",
              "hover:[transform:rotateX(10deg)_translateY(-2px)]",
              tab === t.key ? "bg-butter" : "bg-white",
            )}
          >
            <PixelIcon name={t.icon} size={13} className="shrink-0" />
            {t.label}
            {/* 미배분 스탯 포인트가 있으면 상태 탭에 도트 배지 — 배분 UI 발견성 */}
            {t.key === "status" && character.statPoints > 0 && (
              <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border border-ink bg-coral" />
            )}
          </button>
        ))}
      </div>

      <div ref={scrollRef} className="scroll-hide min-h-0 flex-1 overflow-y-auto pb-2">
        <div className={panelCls("care")}>
          {/* 모바일 전용 핵심 컨디션 4종 — 데스크톱은 왼쪽 캐릭터 패널이 담당 */}
          <div className="card p-3 md:hidden">
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
              <StatBar label="배고픔" value={character.status.hunger} />
              <StatBar label="체력" value={character.status.energy} />
              <StatBar label="기분" value={character.status.mood} />
              <StatBar label="건강" value={character.status.health} />
            </div>
          </div>
          <StudyCard character={character} now={now} />
          <div className="card p-4">
            <h3 className="mb-3 font-pixel text-sm font-bold text-ink/80">식사</h3>
            <FoodSelector character={character} now={now} />
          </div>
          <ActionGrid character={character} now={now} />
        </div>
        <div className={panelCls("status")}>
          {/* 모바일 전용 전체 컨디션 — 데스크톱 왼쪽 패널과 동일 구성 */}
          <div className="card p-3 md:hidden">
            <h3 className="mb-2 font-pixel text-sm font-bold text-ink/80">컨디션</h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
              <StatBar label="배고픔" value={character.status.hunger} />
              <StatBar label="체력" value={character.status.energy} />
              <StatBar label="기분" value={character.status.mood} />
              <StatBar label="건강" value={character.status.health} />
              <StatBar label="집중력" value={character.status.focus} />
              <StatBar label="청결" value={character.status.cleanliness} />
              <StatBar label="수면 질" value={character.status.sleepQuality} />
              <StatBar label="자신감" value={character.status.confidence} />
              <StatBar
                label="스트레스"
                value={character.status.stress}
                higherIsBetter={false}
              />
              <StatBar
                label="번아웃"
                value={character.status.burnout}
                higherIsBetter={false}
              />
            </div>
          </div>
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
