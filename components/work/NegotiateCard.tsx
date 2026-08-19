"use client";

import type { Character } from "@/types/character";
import { canNegotiate, leverage, negotiationChance } from "@/lib/game/negotiate";
import { useGameStore } from "@/lib/store/useGameStore";

export function NegotiateCard({ character }: { character: Character }) {
  const negotiateSalary = useGameStore((s) => s.negotiateSalary);
  if (!character.job) return null;

  const gate = canNegotiate(character);
  const chancePct = Math.round(negotiationChance(character) * 100);
  const levPct = Math.round(leverage(character) * 100);

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <h3 className="font-pixel text-sm font-bold text-ink/80">연봉협상</h3>
        <span className="pill bg-black/[0.05] text-ink/70">협상력 {levPct}</span>
      </div>
      <p className="mt-1 font-sans text-[11px] text-ink/50">
        연 1회 직접 인상을 요구해요. 최근 업무평가·평판이 좋을수록 성공률이 올라가요.
        (연말 자동 인상과는 별개)
      </p>

      {gate.ok ? (
        <>
          <div className="mb-1 mt-3 flex justify-between font-pixel text-[11px] text-ink/60">
            <span>예상 성공률</span>
            <span className="tabular-nums">{chancePct}%</span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full border border-ink/15 bg-black/[0.06]">
            <div
              className="h-full bg-mint transition-all duration-500"
              style={{ width: `${chancePct}%` }}
            />
          </div>
          <button
            type="button"
            onClick={() => negotiateSalary()}
            className="toy-btn mt-4 w-full bg-grape text-ink"
          >
            연봉협상 시도 (예상 +3~9%)
          </button>
        </>
      ) : (
        <p className="mt-3 rounded-xl bg-black/[0.03] px-4 py-2.5 text-center font-pixel text-[11px] text-ink/55">
          {gate.reason}
        </p>
      )}
    </div>
  );
}
