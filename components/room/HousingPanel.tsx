"use client";

// 주거 패널 — 본가 → 월세 → 전세 → 매매. 현실적인 대출 구조 포함:
// 전세자금대출(80%·연3.8%) / 주담대(LTV70%·연4.2%), 매년 이자+원금 자동 상환,
// 자가는 집값이 매년 오른다. 이사하면 기존 보증금/집을 회수해 정산.

import type { Character } from "@/types/character";
import { cn } from "@/lib/utils";
import {
  HOUSING_OPTIONS,
  housingDef,
  housingEquity,
  planMove,
} from "@/lib/game/housing";
import { formatMoney } from "@/lib/game/ending";
import { useGameStore } from "@/lib/store/useGameStore";
import { CollapsibleCard } from "@/components/common/CollapsibleCard";

export function HousingPanel({ character }: { character: Character }) {
  const moveHousing = useGameStore((s) => s.moveHousing);
  const h = character.housing;
  const cur = housingDef(h.option);
  const equity = housingEquity(h);

  return (
    <CollapsibleCard
      title="주거"
      badge={
        <span className="pill bg-grape/20 text-ink/70">
          {cur.emoji} {cur.label}
        </span>
      }
    >
      {/* 현재 주거 요약 — 보증금/시세/대출 */}
      {(h.deposit > 0 || h.homeValue > 0 || h.loanBalance > 0) && (
        <div className="mb-2 rounded-xl bg-black/[0.03] px-3 py-2 text-[11px] text-ink/60">
          {h.homeValue > 0 && <div>집 시세 {formatMoney(h.homeValue)} (연 +2%)</div>}
          {h.deposit > 0 && <div>보증금 {formatMoney(h.deposit)} (이사 시 회수)</div>}
          {h.loanBalance > 0 && (
            <div className="font-bold text-coral">
              대출 잔액 {formatMoney(h.loanBalance)} · 연{" "}
              {((cur.loanRate ?? 0) * 100).toFixed(1)}% 이자 + 연봉의 12% 자동 상환
            </div>
          )}
          <div className="mt-0.5 font-pixel font-bold text-ink/70">
            주거 순자산 {formatMoney(equity)}
          </div>
        </div>
      )}
      <p className="mb-3 text-xs text-ink/55">
        모자란 돈은 한도 내에서 자동으로 대출을 받아요. 전세/자가는 매년 행복도 +1/+2.
      </p>

      <ul className="flex flex-col gap-1.5">
        {HOUSING_OPTIONS.map((opt) => {
          const isCurrent = opt.key === h.option;
          const plan = planMove(character, opt.key);
          return (
            <li
              key={opt.key}
              className={cn(
                "flex items-center justify-between gap-2 rounded-xl px-3 py-2",
                isCurrent ? "bg-grape/15" : "bg-black/[0.03]",
              )}
            >
              <div className="flex min-w-0 items-center gap-2">
                <span className="text-base leading-none">{opt.emoji}</span>
                <div className="min-w-0">
                  <div className="font-pixel text-[11px] font-bold text-ink/80">
                    {opt.label}
                  </div>
                  <div className="text-[11px] leading-tight text-ink/50">{opt.desc}</div>
                  {!isCurrent && plan.ok && (
                    <div className="font-pixel text-[10px] font-bold text-ink/60">
                      필요 현금 {formatMoney(Math.max(0, plan.cashNeeded - plan.equityBack))}
                      {plan.loan > 0 && ` + 대출 ${formatMoney(plan.loan)}`}
                    </div>
                  )}
                  {!isCurrent && !plan.ok && plan.reason && (
                    <div className="font-pixel text-[10px] font-bold text-coral">
                      {plan.reason}
                    </div>
                  )}
                </div>
              </div>
              {isCurrent ? (
                <span className="pill shrink-0 bg-grape/40 text-ink">거주 중</span>
              ) : (
                <button
                  type="button"
                  onClick={() => moveHousing(opt.key)}
                  disabled={!plan.ok}
                  className={cn(
                    "tap-44 pill shrink-0 font-bold transition-colors",
                    plan.ok
                      ? "bg-grape text-ink hover:brightness-105"
                      : "cursor-not-allowed bg-black/10 text-ink/40",
                  )}
                >
                  이사
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </CollapsibleCard>
  );
}
