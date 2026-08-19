"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { RankingPanel } from "@/components/ranking/RankingPanel";
import { BottomNav } from "@/components/common/BottomNav";
import { SlimShell } from "@/components/common/SlimShell";
import { Toast } from "@/components/common/Toast";
import { YearlyReviewModal } from "@/components/review/YearlyReviewModal";
import { PixelIcon } from "@/components/pixel/PixelIcon";
import { useGameStore } from "@/lib/store/useGameStore";
import { useGameTick } from "@/lib/hooks/useGameTick";

export default function RankingPage() {
  const router = useRouter();
  const hydrated = useGameStore((s) => s.hydrated);
  const character = useGameStore((s) => s.character);
  useGameTick();

  useEffect(() => {
    if (hydrated && !character) router.replace("/create");
  }, [hydrated, character, router]);

  if (!hydrated || !character) {
    return (
      <main className="flex min-h-screen items-center justify-center text-ink/60">
        <div className="animate-bob">
          <PixelIcon name="star" size={44} />
        </div>
      </main>
    );
  }

  return (
    <SlimShell title="랭킹">
      <RankingPanel character={character} />

      <YearlyReviewModal />
      <Toast />
      <BottomNav />
    </SlimShell>
  );
}
