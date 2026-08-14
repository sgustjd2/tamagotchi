"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

import type { CalorieTier, StatusDelta } from "@/types/action";
import type { Character } from "@/types/character";
import { FOODS, LIFE_STAGES } from "@/lib/game/constants";
import { isStageUnlocked } from "@/lib/game/gating";
import { useGameStore } from "@/lib/store/useGameStore";
import { cn, formatDuration } from "@/lib/utils";
import { PixelIcon } from "@/components/pixel/PixelIcon";

function stageLabel(stage: (typeof LIFE_STAGES)[number]["stage"]): string {
  return LIFE_STAGES.find((s) => s.stage === stage)?.label ?? stage;
}

function effectHint(status?: StatusDelta): string {
  if (!status) return "";
  const parts: string[] = [];
  if (status.hunger) parts.push(`배고픔 +${status.hunger}`);
  if (status.health) parts.push(`건강 ${status.health > 0 ? "+" : ""}${status.health}`);
  if (status.mood) parts.push(`기분 ${status.mood > 0 ? "+" : ""}${status.mood}`);
  if (status.stress) parts.push(`스트레스 ${status.stress > 0 ? "+" : ""}${status.stress}`);
  if (status.focus) parts.push(`집중 +${status.focus}`);
  if (status.weight) parts.push(`몸무게 +${status.weight}kg`);
  return parts.join(" · ");
}

const CALORIE_META: Record<CalorieTier, { label: string; cls: string }> = {
  low: { label: "저칼로리", cls: "bg-mint/50 text-ink/70" },
  medium: { label: "보통", cls: "bg-butter/60 text-ink/70" },
  high: { label: "고칼로리", cls: "bg-coral/70 text-white" },
};

export function FoodSelector({
  character,
  now,
}: {
  character: Character;
  now: number;
}) {
  const [open, setOpen] = useState(false);
  const feed = useGameStore((s) => s.feed);

  // 모달 열림 동안 Esc 로 닫기 (키보드 접근성)
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const readyAt = character.cooldowns["feed"] ?? 0;
  const remaining = Math.max(0, readyAt - now);
  const onCooldown = remaining > 0;

  return (
    <>
      <button
        type="button"
        disabled={onCooldown}
        onClick={() => setOpen(true)}
        className="toy-btn relative flex w-full items-center gap-3 bg-blush/40 text-left disabled:opacity-60"
      >
        <span className="text-ink">
          <PixelIcon name="feed" size={26} />
        </span>
        <span className="flex-1">
          <span className="block text-base font-bold">밥 먹이기</span>
          <span className="block font-sans text-[11px] font-medium text-ink/55">
            {onCooldown
              ? `${formatDuration(remaining)} 후에 다시 줄 수 있어요`
              : "음식을 골라 배고픔을 채워요"}
          </span>
        </span>
        {onCooldown && (
          <span className="pill bg-black/10 text-ink/70 tabular-nums">
            {formatDuration(remaining)}
          </span>
        )}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/35 p-3 sm:items-center"
          onClick={() => setOpen(false)}
        >
          <div
            className="card w-full max-w-md p-5"
            role="dialog"
            aria-modal="true"
            aria-label="음식 선택"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-pixel text-lg font-bold">무엇을 먹일까?</h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md p-1 hover:bg-black/5"
                aria-label="닫기"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="scroll-hide grid max-h-[58vh] grid-cols-2 gap-2.5 overflow-y-auto pr-0.5">
              {FOODS.map((f) => {
                const cal = CALORIE_META[f.calorieTier];
                const locked = !isStageUnlocked(f.minStage, character.lifeStage);
                return (
                  <button
                    key={f.key}
                    type="button"
                    disabled={locked}
                    onClick={() => {
                      if (locked) return;
                      feed(f.key);
                      setOpen(false);
                    }}
                    className={cn(
                      "toy-btn flex flex-col items-start gap-1",
                      locked ? "bg-black/[0.04]" : "bg-white",
                    )}
                  >
                    <div className="flex w-full items-center justify-between">
                      <span className={cn("text-ink", locked && "opacity-35")}>
                        <PixelIcon name={f.key} size={24} />
                      </span>
                      {locked ? (
                        <span className="text-ink/45">
                          <PixelIcon name="lock" size={15} />
                        </span>
                      ) : (
                        <span className={cn("pill", cal.cls)}>{cal.label}</span>
                      )}
                    </div>
                    <span className={cn("text-sm font-bold", locked && "text-ink/45")}>
                      {f.label}
                      {!locked && f.junk && (
                        <span className="ml-1 text-[10px] text-coral">불량식품</span>
                      )}
                    </span>
                    <span className="font-sans text-[10px] font-medium leading-tight text-ink/55">
                      {locked
                        ? `${stageLabel(f.minStage!)}부터`
                        : effectHint(f.effect.status)}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="mt-3 text-center font-sans text-[11px] text-ink/45">
              배부른 상태에서 또 먹이면 과식으로 살이 더 쪄요. 고칼로리·불량식품일수록 페널티가 커요.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
