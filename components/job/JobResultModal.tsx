"use client";

import { useGameStore } from "@/lib/store/useGameStore";
import { COMPANY_TYPES, JOB_FAMILIES } from "@/lib/game/jobs";
import { PixelIcon } from "@/components/pixel/PixelIcon";
import { ShareMomentButton } from "@/components/common/ShareMomentButton";

export function JobResultModal() {
  const result = useGameStore((s) => s.jobResult);
  const character = useGameStore((s) => s.character);
  const ack = useGameStore((s) => s.ackJobResult);
  if (!result) return null;

  const fam = JOB_FAMILIES[result.family];
  const comp = COMPANY_TYPES[result.company];

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={result.success ? "취업 합격 결과" : "취업 불합격 결과"}
        className="w-full max-w-md animate-pop rounded-t-2xl border-[3px] border-ink bg-white p-6 shadow-[6px_6px_0_0_rgba(46,39,34,0.25)] sm:rounded-2xl"
      >
        <div className="flex flex-col items-center text-center">
          <div
            className={`flex h-16 w-16 items-center justify-center rounded-2xl border-[3px] border-ink ${
              result.success ? "bg-mint" : "bg-coral text-ink"
            }`}
          >
            <PixelIcon name={result.success ? "briefcase" : "speech"} size={30} />
          </div>
          <h3 className="mt-3 font-pixel text-xl font-bold">
            {result.success ? "합격!" : "불합격"}
          </h3>
          <p className="font-pixel text-xs text-ink/55">
            {comp.label} · {fam.label} · 합격률 {result.chance}%
          </p>
        </div>

        {result.success && result.job ? (
          <div className="mt-4 space-y-2">
            <Row label="직무" value={result.job.title} />
            <Row label="회사" value={comp.label} />
            <Row
              label="초봉"
              value={`${result.job.salaryManwon.toLocaleString()}만원`}
              strong
            />
          </div>
        ) : (
          <p className="mt-4 rounded-xl bg-black/[0.03] px-4 py-3 text-center text-[13px] text-ink/65">
            이번엔 인연이 아니었어요. 이력서·포폴·면접을 더 다듬고 다시 도전해요!
          </p>
        )}

        {result.success && result.job && character && (
          <ShareMomentButton
            character={character}
            moment={{
              emoji: "💼",
              title: "합격!",
              subtitle: `${comp.label} · ${result.job.title}`,
              lines: [`초봉 ${result.job.salaryManwon.toLocaleString()}만원`],
            }}
          />
        )}

        <button
          type="button"
          onClick={ack}
          className="toy-btn mt-3 w-full bg-coral text-ink"
        >
          확인
        </button>
      </div>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-xl border-2 border-ink/10 bg-black/[0.03] px-4 py-2.5">
      <span className="font-pixel text-xs text-ink/60">{label}</span>
      <span className={`font-pixel ${strong ? "text-base" : "text-sm"} font-bold`}>
        {value}
      </span>
    </div>
  );
}
