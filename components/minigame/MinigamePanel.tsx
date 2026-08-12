"use client";

import { useEffect, useRef, useState } from "react";

import type { Character } from "@/types/character";
import {
  LUCK_CAP,
  MINIGAME_ENERGY_COST,
  MINIGAME_MIN_AGE,
  type MinigameKind,
  type RpsChoice,
} from "@/lib/game/minigame";
import { useGameStore } from "@/lib/store/useGameStore";

const GAMES: { kind: MinigameKind; emoji: string; label: string; desc: string }[] = [
  {
    kind: "slots",
    emoji: "🎰",
    label: "슬롯머신",
    desc: "7️⃣7️⃣7️⃣ 잭팟을 노려요 · 당첨금은 저축으로",
  },
  {
    kind: "gacha",
    emoji: "🎁",
    label: "행운 뽑기",
    desc: "랜덤 캡슐 · 희귀 캡슐엔 스탯 포인트",
  },
  {
    kind: "roulette",
    emoji: "🎡",
    label: "룰렛",
    desc: "돌리면 스트레스가 확 풀려요",
  },
  {
    kind: "fishing",
    emoji: "🎣",
    label: "낚시",
    desc: "월척을 노려보세요",
  },
  {
    kind: "darts",
    emoji: "🎯",
    label: "다트",
    desc: "불스아이면 스탯 포인트",
  },
  {
    kind: "rps",
    emoji: "✊",
    label: "가위바위보",
    desc: "이기면 자신감이 쑥",
  },
  {
    kind: "timing",
    emoji: "⏱️",
    label: "타이밍 챌린지",
    desc: "정확히 멈추면 대성공",
  },
];

const RPS_LABEL: Record<RpsChoice, string> = {
  rock: "✊ 바위",
  paper: "✋ 보",
  scissors: "✌️ 가위",
};

/** 타이밍 바 한 바퀴 길이(ms) — 짧을수록 어렵다 */
const TIMING_CYCLE_MS = 1200;

export function MinigamePanel({ character }: { character: Character }) {
  const playMinigame = useGameStore((s) => s.playMinigame);
  const [expanded, setExpanded] = useState<"rps" | "timing" | null>(null);
  const [timingStart, setTimingStart] = useState<number | null>(null);
  const [timingProgress, setTimingProgress] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (expanded !== "timing" || timingStart == null) return;
    const tick = () => {
      const elapsed = (Date.now() - timingStart) % TIMING_CYCLE_MS;
      setTimingProgress(elapsed / TIMING_CYCLE_MS);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [expanded, timingStart]);

  // 미취학 아동에겐 잠금 티저 — 탭이 텅 비어 보이지 않게. 실제 게이트는 canPlayMinigame 에도 있음
  if (character.ageYears < MINIGAME_MIN_AGE) {
    return (
      <div className="card p-4">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="font-pixel text-sm font-bold text-ink/80">미니게임</h3>
          <span className="pill bg-black/10 text-ink/50">🔒 {MINIGAME_MIN_AGE}살부터</span>
        </div>
        <div className="flex items-center justify-center gap-2.5 rounded-xl bg-black/[0.04] py-3 text-xl opacity-40 grayscale">
          {GAMES.map((g) => (
            <span key={g.kind} aria-hidden>
              {g.emoji}
            </span>
          ))}
        </div>
        <p className="mt-2 text-center font-sans text-[11px] font-medium text-ink/50">
          {MINIGAME_MIN_AGE}살이 되면 미니게임 {GAMES.length}종이 열려요 — 지금은 케어 탭에서
          놀아주기로 함께 놀아요!
        </p>
      </div>
    );
  }
  const lacking = character.status.energy < MINIGAME_ENERGY_COST;
  const luckMaxed = character.stats.luck >= LUCK_CAP;

  const openGame = (kind: MinigameKind) => {
    setExpanded(null);
    if (kind === "rps") {
      setExpanded("rps");
      return;
    }
    if (kind === "timing") {
      setExpanded("timing");
      setTimingStart(Date.now());
      return;
    }
    playMinigame(kind);
  };

  const pickRps = (choice: RpsChoice) => {
    playMinigame("rps", { choice });
    setExpanded(null);
  };

  const stopTiming = () => {
    // 중앙(50%)에 가까울수록 정확도가 높다
    const accuracy = Math.max(0, 1 - Math.abs(timingProgress - 0.5) * 2);
    playMinigame("timing", { accuracy });
    setExpanded(null);
    setTimingStart(null);
  };

  return (
    <div className="card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-pixel text-sm font-bold text-ink/80">미니게임</h3>
        <span className="pill bg-butter/60 text-ink">
          🍀 행운 {luckMaxed ? "MAX" : Math.round(character.stats.luck)}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        {GAMES.map((g) => (
          <button
            key={g.kind}
            type="button"
            disabled={lacking}
            onClick={() => openGame(g.kind)}
            className="toy-btn flex min-h-[68px] w-full flex-col items-start gap-1 bg-grape/30 text-left disabled:opacity-50"
          >
            <span className="text-lg leading-none">{g.emoji}</span>
            <span className="text-sm font-bold">{g.label}</span>
            <span className="font-sans text-[11px] font-medium leading-tight text-ink/55">
              {g.desc}
            </span>
          </button>
        ))}
      </div>

      {expanded === "rps" && (
        <div className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-grape/10 p-3">
          {(["rock", "paper", "scissors"] as RpsChoice[]).map((choice) => (
            <button
              key={choice}
              type="button"
              onClick={() => pickRps(choice)}
              className="toy-btn flex-1 py-2 text-sm font-bold"
            >
              {RPS_LABEL[choice]}
            </button>
          ))}
        </div>
      )}

      {expanded === "timing" && (
        <div className="mt-3 rounded-xl bg-grape/10 p-3">
          <div className="relative h-3 overflow-hidden rounded-full bg-white/60">
            <span className="absolute inset-y-0 left-[42%] w-[16%] bg-butter/80" />
            <span
              className="absolute inset-y-0 w-[3px] bg-ink"
              style={{ left: `${timingProgress * 100}%` }}
            />
          </div>
          <button
            type="button"
            onClick={stopTiming}
            className="toy-btn mt-2 w-full py-2 text-sm font-bold"
          >
            정지!
          </button>
        </div>
      )}

      <p className="mt-2 font-sans text-[11px] font-medium text-ink/50">
        {lacking
          ? `체력이 부족해요. (체력 ${MINIGAME_ENERGY_COST} 필요)`
          : `쿨타임 없음 · 1회당 체력 -${MINIGAME_ENERGY_COST}${luckMaxed ? " · 행운이 최대예요!" : " · 플레이할수록 행운이 쌓여요"}`}
      </p>
    </div>
  );
}
