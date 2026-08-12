"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { CharacterAvatar } from "@/components/character/CharacterAvatar";
import { DashboardTabs } from "@/components/dashboard/DashboardTabs";
import { StatBar } from "@/components/common/StatBar";
import { Toast } from "@/components/common/Toast";
import { OutcomeBurst } from "@/components/common/OutcomeBurst";
import { BottomNav } from "@/components/common/BottomNav";
import { SaveNotice } from "@/components/common/SaveNotice";
import { YearlyReviewModal } from "@/components/review/YearlyReviewModal";
import { CareerCard } from "@/components/dashboard/CareerCard";
import { EndingScreen } from "@/components/EndingScreen";
import { NeglectEndingScreen } from "@/components/NeglectEndingScreen";
import { PixelIcon } from "@/components/pixel/PixelIcon";
import { NotificationBell } from "@/components/common/NotificationBell";
import { SoundToggle } from "@/components/common/SoundToggle";
import { nextStageInfo } from "@/lib/game/growth";
import { useGameStore } from "@/lib/store/useGameStore";
import { useNow } from "@/lib/hooks/useNow";
import { useCareNotifications } from "@/lib/hooks/useCareNotifications";

export default function DashboardPage() {
  const router = useRouter();
  const hydrated = useGameStore((s) => s.hydrated);
  const character = useGameStore((s) => s.character);
  const tick = useGameStore((s) => s.tick);
  const now = useNow(1000);
  const { permission, requestPermission } = useCareNotifications(character);

  // 캐릭터가 없으면 생성 화면으로
  useEffect(() => {
    if (hydrated && !character) router.replace("/create");
  }, [hydrated, character, router]);

  // 시간 경과 반영: 마운트 시 1번 + 주기적 + 다시 보일 때
  useEffect(() => {
    if (!character) return;
    tick();
    const id = setInterval(() => tick(), 5000);
    const onVis = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [character?.id, tick]);

  if (!hydrated || !character) {
    return (
      <main className="flex min-h-screen items-center justify-center text-ink/60">
        <div className="animate-bob">
          <PixelIcon name="heart" size={44} />
        </div>
      </main>
    );
  }

  // 방치 사망 → 전용 엔딩
  if (character.deathAge != null && character.deathCause === "방치") {
    return <NeglectEndingScreen character={character} />;
  }

  // 일반 사망 → 인생 결산 엔딩
  if (character.deathAge != null) {
    return <EndingScreen character={character} />;
  }

  const next = nextStageInfo(character.ageYears);

  return (
    // 다마고치처럼 한 화면 고정(h-dvh) — 페이지 스크롤 없이 탭 안에서만 스크롤
    <main className="mx-auto flex h-dvh max-w-5xl flex-col gap-2.5 px-4 pb-[calc(4.25rem+env(safe-area-inset-bottom))] pt-3">
      {/* 상단 바 */}
      <header className="flex shrink-0 items-center justify-between gap-2">
        <Link href="/" className="font-pixel text-sm font-bold text-ink/55">
          ← LifeGotchi
        </Link>
        <div className="flex items-center gap-2">
          <SoundToggle />
          <NotificationBell permission={permission} onRequest={requestPermission} />
          {next && (
            <span className="pill bg-white text-ink/60">
              다음: {next.label}까지 {next.inYears}살
            </span>
          )}
          <Link
            href="/history"
            className="pill hidden bg-white text-ink/60 hover:bg-cream lg:inline-flex"
          >
            성장기록
          </Link>
        </div>
      </header>

      <div className="shrink-0">
        <SaveNotice />
      </div>

      {/* 위(모바일)/왼쪽(데스크톱): 캐릭터 방 — 아래/오른쪽: 탭 패널 */}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-2.5 md:grid-cols-5 md:gap-4">
        <div className="flex min-h-0 shrink-0 flex-col md:col-span-2">
          <div className="card flex min-h-0 flex-col items-center overflow-y-auto p-3 md:flex-1 md:p-5">
            <CharacterAvatar character={character} />
            {/* 상시 컨디션 — 탭을 오가지 않아도 케어 판단이 가능하게, 전체 지표를 여기 한 곳에 */}
            <div className="mt-2 grid w-full max-w-[300px] shrink-0 grid-cols-2 gap-x-4 gap-y-1.5">
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
              <StatBar label="번아웃" value={character.status.burnout} higherIsBetter={false} />
            </div>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col md:col-span-3">
          <DashboardTabs character={character} now={now} />
        </div>
      </div>

      <YearlyReviewModal />
      <Toast />
      <OutcomeBurst />
      <BottomNav />
    </main>
  );
}
