"use client";

import { useGameStore } from "@/lib/store/useGameStore";
import { PixelIcon } from "@/components/pixel/PixelIcon";

const META = {
  success: {
    title: "협상 성공!",
    icon: "coin",
    badge: "bg-mint",
    body: "당당하게 요구한 만큼 받았어요.",
  },
  fail: {
    title: "협상 결렬",
    icon: "speech",
    badge: "bg-butter",
    body: "이번엔 받아들여지지 않았어요. 내년에 다시 도전해요!",
  },
  backfire: {
    title: "괘씸죄…",
    icon: "bolt",
    badge: "bg-coral text-ink",
    body: "무리한 요구가 안 좋은 인상을 남겼어요. 다음 평가에 살짝 불리해요.",
  },
} as const;

export function NegotiationModal() {
  const result = useGameStore((s) => s.negotiationResult);
  const ack = useGameStore((s) => s.ackNegotiation);
  if (!result) return null;

  const m = META[result.outcome];

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="연봉협상 결과"
        className="w-full max-w-md animate-pop rounded-t-2xl border-[3px] border-ink bg-white p-6 shadow-[6px_6px_0_0_rgba(46,39,34,0.25)] sm:rounded-2xl"
      >
        <div className="flex flex-col items-center text-center">
          <div
            className={`flex h-16 w-16 items-center justify-center rounded-2xl border-[3px] border-ink ${m.badge}`}
          >
            <PixelIcon name={m.icon} size={30} />
          </div>
          <h3 className="mt-3 font-pixel text-xl font-bold">{m.title}</h3>
          <p className="font-pixel text-xs text-ink/55">
            만 {result.atAge}세 · 성공률 {Math.round(result.successP * 100)}%
          </p>
        </div>

        {result.outcome === "success" ? (
          <div className="mt-4 space-y-2">
            <Row
              label="연봉"
              value={`${result.salaryBefore.toLocaleString()} → ${result.salaryAfter.toLocaleString()}만원`}
              strong
            />
            <Row label="인상률" value={`+${result.raisePct}%`} />
          </div>
        ) : (
          <p className="mt-4 rounded-xl bg-black/[0.03] px-4 py-3 text-center text-[13px] text-ink/65">
            {m.body}
          </p>
        )}

        <button
          type="button"
          onClick={ack}
          className="toy-btn mt-5 w-full bg-coral text-ink"
        >
          확인
        </button>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border-2 border-ink/10 bg-black/[0.03] px-4 py-2.5">
      <span className="font-pixel text-xs text-ink/60">{label}</span>
      <span className={`font-pixel ${strong ? "text-base" : "text-sm"} font-bold`}>
        {value}
      </span>
    </div>
  );
}
