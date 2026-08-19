"use client";

import type { Character } from "@/types/character";
import { useGameStore } from "@/lib/store/useGameStore";
import {
  DEGREE_HIRING_BONUS,
  DEGREE_LABEL,
  DEGREE_SALARY_MULT,
  DEGREE_YEARS,
  gradAdmission,
} from "@/lib/game/degree";

export function GradSchoolPanel({ character }: { character: Character }) {
  const enroll = useGameStore((s) => s.enrollGrad);
  const drop = useGameStore((s) => s.dropGrad);
  const degree = character.degree;
  const g = character.gradEnroll;
  const bonus = DEGREE_HIRING_BONUS[degree];

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-pixel text-sm font-bold text-ink/80">학위 / 대학원</h3>
        <span className="pill bg-grape/20 text-ink/70">
          {DEGREE_LABEL[degree]} · 취업률 {bonus >= 0 ? "+" : ""}
          {bonus}
        </span>
      </div>

      {g ? (
        <div className="mt-3">
          <p className="font-pixel text-[12px] font-bold text-grape">
            🎓 대학원생 — {DEGREE_LABEL[g.degree]} 과정
          </p>
          <p className="mt-1 font-sans text-[11px] leading-relaxed text-ink/55">
            졸업까지 약{" "}
            {Math.max(0, DEGREE_YEARS[g.degree] - (character.ageYears - g.startAge))}년.
            매년 등록금·생활비로 저축이 줄고 스트레스가 쌓이지만, 학업·지능이 크게 올라요.
          </p>
          <button
            type="button"
            onClick={() => drop()}
            className="mt-3 w-full rounded-xl border-2 border-ink/15 py-2 font-pixel text-[11px] font-bold text-ink/55 hover:border-ink/40"
          >
            자퇴하기 (학위는 {DEGREE_LABEL[degree]}로 유지)
          </button>
        </div>
      ) : (
        <GradEnrollCta character={character} onEnroll={enroll} />
      )}
    </div>
  );
}

function GradEnrollCta({
  character,
  onEnroll,
}: {
  character: Character;
  onEnroll: () => void;
}) {
  const adm = gradAdmission(character);
  if (!adm.target) {
    return (
      <p className="mt-3 rounded-xl bg-black/[0.03] px-4 py-2.5 text-center font-pixel text-[11px] text-ink/55">
        최종 학위({DEGREE_LABEL[character.degree]})까지 마쳤어요.
      </p>
    );
  }
  const t = adm.target;
  return (
    <div className="mt-3">
      <p className="font-sans text-[11px] leading-relaxed text-ink/55">
        <b className="text-ink/70">{DEGREE_LABEL[t]} 진학</b> 시 — 취업률 +
        {DEGREE_HIRING_BONUS[t]} · 초봉 ×{DEGREE_SALARY_MULT[t]} · {DEGREE_YEARS[t]}
        년 동안 등록금·생활비 부담(노예의 길).
      </p>
      <button
        type="button"
        disabled={!adm.ok}
        onClick={() => onEnroll()}
        className="toy-btn mt-3 w-full bg-grape text-ink disabled:bg-black/10 disabled:text-ink/40"
      >
        {adm.ok ? `${DEGREE_LABEL[t]} 진학하기` : adm.reason}
      </button>
    </div>
  );
}
