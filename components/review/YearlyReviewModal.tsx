"use client";

import type { YearlyReview } from "@/types/character";
import { useGameStore } from "@/lib/store/useGameStore";
import { stageLabel } from "@/lib/game/growth";
import { DEGREE_LABEL } from "@/lib/game/degree";
import { GRADE_LABEL } from "@/lib/game/jobs";
import { formatMoney } from "@/lib/game/ending";
import { PixelIcon } from "@/components/pixel/PixelIcon";
import { gradeMeta } from "./gradeMeta";

function SavingsRow({ delta }: { delta: number }) {
  if (delta === 0) return null;
  const positive = delta > 0;
  return (
    <div
      className={`mt-3 flex items-center justify-between rounded-xl border-2 px-4 py-2.5 ${
        positive ? "border-mint/50 bg-mint/20" : "border-coral/40 bg-coral/15"
      }`}
    >
      <span className="flex items-center gap-1.5 font-pixel text-sm font-bold text-ink/75">
        <PixelIcon name="coin" size={15} /> 저축 변동
      </span>
      <span
        className={`font-pixel text-sm font-bold tabular-nums ${positive ? "text-ink" : "text-coral"}`}
      >
        {positive ? "+" : ""}
        {formatMoney(delta)}
      </span>
    </div>
  );
}

const COUNTER_META: {
  key: keyof YearlyReview["counters"];
  label: string;
  icon: string;
}[] = [
  { key: "study", label: "공부", icon: "study" },
  { key: "exercise", label: "운동", icon: "exercise" },
  { key: "selfDev", label: "자기개발", icon: "selfDev" },
  { key: "meals", label: "식사", icon: "feed" },
];

export function YearlyReviewModal() {
  const pending = useGameStore((s) => s.pendingReviews);
  const ack = useGameStore((s) => s.ackReview);
  const review = pending[0];
  if (!review) return null;

  const remaining = pending.length - 1;

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
      <div className="max-h-[calc(100dvh-1rem)] w-full max-w-md animate-pop overflow-y-auto rounded-t-2xl border-[3px] border-ink bg-white p-6 shadow-[6px_6px_0_0_rgba(46,39,34,0.25)] sm:rounded-2xl">
        {review.kind === "neglected" ? (
          <NeglectedBody review={review} />
        ) : (
          <NormalBody review={review} />
        )}

        <button
          type="button"
          onClick={ack}
          className="toy-btn mt-5 w-full bg-coral text-ink"
        >
          {remaining > 0 ? `확인 (${remaining}건 더)` : "확인"}
        </button>
      </div>
    </div>
  );
}

function NormalBody({ review }: { review: YearlyReview }) {
  const g = gradeMeta(review.grade);
  return (
    <>
      <div className="flex flex-col items-center text-center">
        <div
          className={`flex h-16 w-16 items-center justify-center rounded-2xl border-[3px] border-ink font-pixel text-3xl font-bold ${g.badge}`}
        >
          {review.grade}
        </div>
        <h3 className="mt-3 font-pixel text-lg font-bold">
          만 {review.age}살 한 해 결산
        </h3>
        <p className="font-pixel text-xs text-ink/55">
          {stageLabel(review.stage)} · {g.label} · 종합 {review.score}점
        </p>
      </div>

      <div className="mt-4 grid grid-cols-4 gap-2">
        {COUNTER_META.map((m) => (
          <div
            key={m.key}
            className="flex flex-col items-center gap-0.5 rounded-xl border-2 border-ink/10 bg-black/[0.03] py-2 text-ink/80"
          >
            <PixelIcon name={m.icon} size={18} />
            <span className="font-pixel text-sm font-bold tabular-nums">
              {review.counters[m.key]}
            </span>
            <span className="font-pixel text-[10px] text-ink/50">{m.label}</span>
          </div>
        ))}
      </div>

      {review.exam && (
        <div className="mt-3 flex items-center justify-between rounded-xl border-2 border-ink/15 bg-sky/30 px-4 py-2.5">
          <span className="flex items-center gap-1.5 font-pixel text-sm font-bold text-ink/75">
            <PixelIcon name="study" size={15} /> 시험
          </span>
          <span className="font-pixel text-sm font-bold">
            {review.exam.tier} · {review.exam.score}점
          </span>
        </div>
      )}

      {review.work && (
        <div className="mt-3 space-y-2">
          <div className="flex items-center justify-between rounded-xl border-2 border-ink/15 bg-mint/20 px-4 py-2.5">
            <span className="flex items-center gap-1.5 font-pixel text-sm font-bold text-ink/75">
              <PixelIcon name="briefcase" size={15} /> 업무 성과
            </span>
            <span className="font-pixel text-sm font-bold">{review.work.workPerformance}점</span>
          </div>
          <div className="flex items-center justify-between rounded-xl border-2 border-ink/15 bg-butter/30 px-4 py-2.5">
            <span className="font-pixel text-sm font-bold text-ink/75">연봉</span>
            <span className="font-pixel text-sm font-bold tabular-nums">
              {review.work.salaryBefore.toLocaleString()} → {review.work.salaryAfter.toLocaleString()}만
              {review.work.raisePct !== 0
                ? ` (${review.work.raisePct > 0 ? "+" : ""}${review.work.raisePct}%)`
                : ""}
            </span>
          </div>
          {review.work.promoted && review.work.gradeTo && review.work.gradeFrom && (
            <div className="rounded-xl border-2 border-ink/15 bg-grape/25 px-4 py-2.5 text-center font-pixel text-sm font-bold text-ink">
              승진! {GRADE_LABEL[review.work.gradeFrom]} → {GRADE_LABEL[review.work.gradeTo]}
            </div>
          )}
          {review.work.promoHeld && review.work.holdReasons && (
            <p className="rounded-xl bg-coral/15 px-4 py-2 text-[11px] text-coral">
              승진 보류: {review.work.holdReasons.join(", ")}
            </p>
          )}
        </div>
      )}

      {review.degreeChange && (
        <div className="mt-3 rounded-xl border-2 border-ink/15 bg-grape/25 px-4 py-2.5 text-center font-pixel text-sm font-bold text-ink">
          🎓 {DEGREE_LABEL[review.degreeChange.to]} 취득!
        </div>
      )}

      {review.event && (
        <div className="mt-3 rounded-xl border-2 border-ink/15 bg-butter/30 px-4 py-2.5">
          <div className="font-pixel text-sm font-bold text-ink">
            {review.event.emoji} {review.event.label}
          </div>
          <p className="mt-0.5 text-[12px] text-ink/60">{review.event.detail}</p>
          {review.event.savingsDelta != null && (
            <p
              className={`mt-0.5 font-pixel text-[11px] font-bold tabular-nums ${
                review.event.savingsDelta > 0 ? "text-ink/70" : "text-coral"
              }`}
            >
              저축 {review.event.savingsDelta > 0 ? "+" : ""}
              {formatMoney(review.event.savingsDelta)}
            </p>
          )}
        </div>
      )}

      {review.incident && (
        <p className="mt-3 rounded-xl border-2 border-coral/40 bg-coral/15 px-4 py-2.5 text-center text-[12px] font-semibold text-coral">
          {review.incident.cause}! 건강이 {review.incident.healthHit} 깎였어요.
        </p>
      )}

      {review.salaryBonusForfeited && (
        <p className="mt-3 rounded-xl bg-coral/15 px-4 py-2 text-[11px] text-coral">
          성인이 되어 1년간 자기개발이 전혀 없었어요. 커리어 경쟁력이 떨어졌어요.
        </p>
      )}

      <SavingsRow delta={review.savingsDelta} />
    </>
  );
}

function NeglectedBody({ review }: { review: YearlyReview }) {
  return (
    <div className="flex flex-col items-center text-center">
      <span className="text-ink/55">
        <PixelIcon name="sleep" size={44} />
      </span>
      <h3 className="mt-3 font-pixel text-lg font-bold">
        약 {review.neglectedYears}년간 돌보지 못했어요
      </h3>
      <p className="mt-1 text-xs text-ink/55">
        그동안 성장이 멈추고 능력치가 조금 떨어졌어요. 다시 꾸준히 돌봐주세요!
      </p>
      {review.degreeChange && (
        <div className="mt-3 w-full rounded-xl border-2 border-ink/15 bg-grape/25 px-4 py-2.5 font-pixel text-sm font-bold text-ink">
          🎓 그 사이 {DEGREE_LABEL[review.degreeChange.to]} 취득!
        </div>
      )}
      <div className="w-full">
        <SavingsRow delta={review.savingsDelta} />
      </div>
    </div>
  );
}
