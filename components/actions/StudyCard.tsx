"use client";

import { useEffect, useRef } from "react";

import type { Character } from "@/types/character";
import { useGameStore } from "@/lib/store/useGameStore";
import { efficiencyReasons, learningEfficiency } from "@/lib/game/status";
import {
  STUDY_PERFECT_WINDOW_MS,
  isStudyReady,
} from "@/lib/game/study";
import { isActionReady } from "@/lib/game/engine";
import { getAction } from "@/lib/game/actions";
import { COOLDOWN_SCALE } from "@/lib/game/constants";
import {
  isActionUnlocked,
  studyContentForStage,
  unlockStageLabel,
} from "@/lib/game/gating";
import { formatDuration } from "@/lib/utils";
import { PixelIcon } from "@/components/pixel/PixelIcon";

// 실제 세션 길이(초) — 표시 문구는 항상 여기서 파생(하드코딩 "30분" 금지)
const STUDY_SESSION_SEC = Math.round(
  ((getAction("study")?.sessionMs ?? 30 * 60 * 1000) * COOLDOWN_SCALE) / 1000,
);
const PERFECT_SEC = Math.round(STUDY_PERFECT_WINDOW_MS / 1000);

export function StudyCard({
  character,
  now,
}: {
  character: Character;
  now: number;
}) {
  const startStudy = useGameStore((s) => s.startStudy);
  const completeStudy = useGameStore((s) => s.completeStudy);
  const cancelStudy = useGameStore((s) => s.cancelStudy);
  const addHiddenMs = useGameStore((s) => s.addHiddenMs);

  const session = character.activeSession;
  const hiddenSince = useRef<number | null>(null);

  // 세션 동안 페이지가 숨겨진 시간 추적 (집중 실패 판정용)
  useEffect(() => {
    if (!session) return;
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        hiddenSince.current = Date.now();
      } else if (hiddenSince.current != null) {
        addHiddenMs(Date.now() - hiddenSince.current);
        hiddenSince.current = null;
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      if (hiddenSince.current != null) {
        addHiddenMs(Date.now() - hiddenSince.current);
        hiddenSince.current = null;
      }
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [session, addHiddenMs]);

  const eff = learningEfficiency(character);
  const reasons = efficiencyReasons(character);
  const content = studyContentForStage(character.lifeStage);

  // --- 단계 미해금 (아기·유아) ---
  if (!isActionUnlocked("study", character.lifeStage)) {
    return (
      <div className="card flex items-center gap-3 p-5">
        <span className="text-ink/40">
          <PixelIcon name="study" size={28} />
        </span>
        <div className="flex-1">
          <h3 className="font-pixel text-sm font-bold text-ink/70">공부하기</h3>
          <p className="font-sans text-[11px] text-ink/50">
            {unlockStageLabel("study")} 할 수 있어요. 지금은 밥·잠·놀이로 쑥쑥!
          </p>
        </div>
        <span className="text-ink/45">
          <PixelIcon name="lock" size={18} />
        </span>
      </div>
    );
  }

  // --- 세션 없음: 시작 가능 / 쿨타임 ---
  if (!session) {
    const ready = isActionReady(character, "study", now);
    const remaining = Math.max(0, (character.cooldowns["study"] ?? 0) - now);
    return (
      <div className="card relative overflow-hidden p-5">
        <Header eff={eff} reasons={reasons} content={content} />
        <button
          type="button"
          disabled={!ready}
          onClick={() => startStudy()}
          className="toy-btn mt-3 w-full bg-sky text-ink disabled:bg-black/10 disabled:text-ink/40"
        >
          {ready
            ? `공부 시작 · ${STUDY_SESSION_SEC}초 집중`
            : `쿨타임 ${formatDuration(remaining)}`}
        </button>
        <p className="mt-2 text-center text-[11px] text-ink/50">
          시작 후 {STUDY_SESSION_SEC}초가 지나면 완료 버튼이 열려요. {PERFECT_SEC}초
          안에 완료하면 100% 보상!
        </p>
      </div>
    );
  }

  // --- 세션 진행 중 ---
  const ready = isStudyReady(session, now);
  const total = session.availableCompleteAt - session.startedAt;
  const elapsed = Math.min(total, now - session.startedAt);
  const ratio = total > 0 ? elapsed / total : 1;

  if (!ready) {
    const remaining = session.availableCompleteAt - now;
    return (
      <div className="card relative overflow-hidden p-5">
        <Header eff={eff} reasons={reasons} content={content} />
        <div className="mt-3 flex items-center justify-between text-sm font-bold">
          <span className="text-ink/70">집중 중…</span>
          <span className="tabular-nums">{formatDuration(remaining)} 남음</span>
        </div>
        <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-black/10">
          <div
            className="h-full rounded-full bg-sky transition-all duration-700"
            style={{ width: `${ratio * 100}%` }}
          />
        </div>
        <p className="mt-2 text-center text-[11px] text-ink/50">
          페이지를 너무 오래 떠나 있으면 집중이 흐트러져요 (보상 감소).
        </p>
        <button
          type="button"
          onClick={() => cancelStudy()}
          className="mt-3 w-full rounded-xl py-2 text-xs font-semibold text-ink/50 hover:bg-black/5"
        >
          공부 중단
        </button>
      </div>
    );
  }

  // --- 완료 가능 ---
  const sinceReady = now - session.availableCompleteAt;
  const inPerfect = sinceReady <= STUDY_PERFECT_WINDOW_MS;
  const perfectLeft = STUDY_PERFECT_WINDOW_MS - sinceReady;
  return (
    <div className="card relative overflow-hidden p-5 ring-2 ring-mint">
      <Header eff={eff} reasons={reasons} content={content} />
      <button
        type="button"
        onClick={() => completeStudy()}
        className="toy-btn mt-3 flex w-full items-center justify-center gap-2 bg-mint text-ink"
      >
        <PixelIcon name="check" size={18} /> 공부 완료하기!
      </button>
      <p className="mt-2 text-center text-[11px] font-semibold text-ink/60">
        {inPerfect
          ? `지금 완료하면 100% 보상! (${formatDuration(perfectLeft)} 남음)`
          : "보상이 줄어들고 있어요. 빨리 완료하세요!"}
      </p>
    </div>
  );
}

function Header({
  eff,
  reasons,
  content,
}: {
  eff: number;
  reasons: string[];
  content: string;
}) {
  return (
    <div className="flex items-start justify-between">
      <div>
        <h3 className="flex items-center gap-1.5 font-pixel text-sm font-bold text-ink/80">
          <PixelIcon name="study" size={16} /> 공부하기
        </h3>
        <p className="font-sans text-[11px] text-ink/55">{content}</p>
      </div>
      <div className="text-right">
        <span className="pill bg-grape/30 text-ink">효율 {Math.round(eff * 100)}%</span>
        {reasons.length > 0 && (
          <p className="mt-1 text-[10px] text-coral">{reasons.join(", ")} 때문에 ↓</p>
        )}
      </div>
    </div>
  );
}
