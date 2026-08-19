"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import type { CompanyTypeKey, JobFamilyKey } from "@/types/character";
import { ACTIONS, PREP_KEYS } from "@/lib/game/actions";
import { formatEffect } from "@/lib/game/effectLabel";
import {
  COMPANY_TYPES,
  JOB_FAMILIES,
  RARITY_META,
  gradeForScore,
  startingSalary,
} from "@/lib/game/jobs";
import {
  employmentChance,
  employmentReadiness,
  familyFitLabel,
} from "@/lib/game/employment";
import { useGameStore } from "@/lib/store/useGameStore";
import { useNow } from "@/lib/hooks/useNow";
import { cn } from "@/lib/utils";
import { CooldownButton } from "@/components/actions/CooldownButton";
import { JobPrepPanel } from "@/components/character/JobPrepPanel";
import { GradSchoolPanel } from "@/components/career/GradSchoolPanel";
import { UniversityPanel } from "@/components/career/UniversityPanel";
import { JobResultModal } from "@/components/job/JobResultModal";
import { NegotiationModal } from "@/components/negotiate/NegotiationModal";
import { YearlyReviewModal } from "@/components/review/YearlyReviewModal";
import { WorkPanel } from "@/components/work/WorkPanel";
import { BottomNav } from "@/components/common/BottomNav";
import { Toast } from "@/components/common/Toast";
import { OutcomeBurst } from "@/components/common/OutcomeBurst";
import { PixelIcon } from "@/components/pixel/PixelIcon";

const PREP_ICON: Record<string, string> = {
  resume: "resume",
  portfolio: "folder",
  interviewPrep: "speech",
  certStudy: "medal",
};

const PREP_ACTIONS = ACTIONS.filter((a) => PREP_KEYS.has(a.key));
const FAMILY_KEYS = Object.keys(JOB_FAMILIES) as JobFamilyKey[];
const COMPANY_KEYS = Object.keys(COMPANY_TYPES) as CompanyTypeKey[];

export default function CareerPage() {
  const router = useRouter();
  const hydrated = useGameStore((s) => s.hydrated);
  const character = useGameStore((s) => s.character);
  const doAction = useGameStore((s) => s.doAction);
  const applyForJob = useGameStore((s) => s.applyForJob);
  const tick = useGameStore((s) => s.tick);
  const now = useNow(1000);

  const [family, setFamily] = useState<JobFamilyKey | null>(null);
  const [company, setCompany] = useState<CompanyTypeKey | null>(null);

  useEffect(() => {
    if (hydrated && !character) router.replace("/create");
    else if (hydrated && character && character.deathAge != null) {
      router.replace("/dashboard"); // 엔딩은 대시보드에서
    }
  }, [hydrated, character, router]);

  // 나이/단계 갱신: 직접 접근/새로고침 시에도 stale 단계 가드 방지 (대시보드와 동일)
  useEffect(() => {
    if (!character) return;
    tick();
    const id = setInterval(() => tick(), 5000);
    const onVis = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [character?.id, tick]);

  if (!hydrated || !character) {
    return (
      <main className="flex min-h-screen items-center justify-center text-ink/60">
        <div className="animate-bob">
          <PixelIcon name="briefcase" size={44} />
        </div>
      </main>
    );
  }

  const back = (
    <Link href="/dashboard" className="font-pixel text-sm font-bold text-ink/55">
      ← 대시보드
    </Link>
  );

  // 이미 취업 — 직장 생활
  if (character.job) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-6 pb-[calc(6rem+env(safe-area-inset-bottom))]">
        <header className="mb-4 flex items-center justify-between">
          {back}
          <h1 className="font-pixel text-base font-bold">직장</h1>
          <span className="w-16" />
        </header>
        <WorkPanel character={character} now={now} />
        <YearlyReviewModal />
        <JobResultModal />
        <NegotiationModal />
        <Toast />
        <OutcomeBurst />
        <BottomNav />
      </main>
    );
  }

  // 대학생 — 대학 선택/재학 현황
  if (character.lifeStage === "university") {
    return (
      <main className="mx-auto max-w-2xl space-y-4 px-4 py-6 pb-[calc(6rem+env(safe-area-inset-bottom))]">
        <header className="flex items-center justify-between">
          {back}
          <h1 className="font-pixel text-base font-bold">대학</h1>
          <span className="w-16" />
        </header>
        <UniversityPanel character={character} />
        <YearlyReviewModal />
        <Toast />
        <OutcomeBurst />
        <BottomNav />
      </main>
    );
  }

  // 아직 취준생이 아님
  if (character.lifeStage !== "jobseeker") {
    return (
      <main className="mx-auto max-w-2xl px-4 py-6 pb-[calc(6rem+env(safe-area-inset-bottom))]">
        <header className="mb-4">{back}</header>
        <div className="card flex flex-col items-center gap-2 p-8 text-center">
          <span className="text-ink/40">
            <PixelIcon name="briefcase" size={40} />
          </span>
          <h1 className="font-pixel text-lg font-bold">아직 취업 단계가 아니에요</h1>
          <p className="font-sans text-sm text-ink/55">
            취준생(만 25세) 단계가 되면 취업을 준비할 수 있어요. 공부·자기개발로 스펙을 쌓아두세요!
          </p>
        </div>
        <BottomNav />
      </main>
    );
  }

  // 취준생 — 취업 준비/지원
  const readiness = employmentReadiness(character, family);
  const grade = gradeForScore(readiness);
  const applyReadyAt = character.cooldowns["jobApply"] ?? 0;
  const onApplyCooldown = applyReadyAt > now;
  const canApply = !!family && !!company && !onApplyCooldown;

  return (
    <main className="mx-auto max-w-2xl space-y-4 px-4 py-6 pb-[calc(6rem+env(safe-area-inset-bottom))]">
      <header className="flex items-center justify-between">
        {back}
        <h1 className="font-pixel text-base font-bold">취업</h1>
        <span className="w-16" />
      </header>

      <JobPrepPanel character={character} />

      <GradSchoolPanel character={character} />

      {/* 취업 준비 액션 */}
      <div className="card p-4">
        <h3 className="mb-3 font-pixel text-sm font-bold text-ink/80">취업 준비 활동</h3>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {PREP_ACTIONS.map((a) => (
            <CooldownButton
              key={a.key}
              icon={PREP_ICON[a.key] ?? "star"}
              label={a.label}
              desc={a.desc}
              effects={
                a.effect
                  ? formatEffect(a.effect(character), { exp: false })
                  : undefined
              }
              now={now}
              readyAt={character.cooldowns[a.key] ?? 0}
              accent="bg-grape/30"
              onClick={() => doAction(a.key)}
            />
          ))}
        </div>
      </div>

      {character.gradEnroll ? (
        <div className="card p-4 text-center font-pixel text-[12px] leading-relaxed text-ink/60">
          대학원 재학 중이에요. 졸업 후 취업에 지원할 수 있어요.
        </div>
      ) : (
        <>
      {/* 직업군 선택 */}
      <div className="card p-4">
        <h3 className="mb-3 font-pixel text-sm font-bold text-ink/80">직업군 선택</h3>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {FAMILY_KEYS.map((key) => {
            const f = JOB_FAMILIES[key];
            const active = family === key;
            const fit = familyFitLabel(character, key);
            const fitMeta =
              fit === "good"
                ? { label: "적합", cls: "text-mint" }
                : fit === "ok"
                  ? { label: "보통", cls: "text-ink/45" }
                  : { label: "도전", cls: "text-coral" };
            return (
              <button
                key={key}
                type="button"
                onClick={() => setFamily(key)}
                className={cn(
                  "flex flex-col gap-1 rounded-xl border-[3px] px-3 py-2 text-left transition-transform",
                  active
                    ? "border-ink bg-grape/30 -translate-y-0.5"
                    : "border-ink/15 bg-white hover:border-ink/40",
                )}
              >
                <span className="flex items-center gap-1.5">
                  <PixelIcon name={f.icon} size={16} />
                  <span className="font-pixel text-[12px] font-bold leading-tight">
                    {f.label}
                  </span>
                </span>
                <span className="flex items-center justify-between font-pixel text-[10px]">
                  <span className={RARITY_META[f.rarity].cls}>
                    {RARITY_META[f.rarity].label}
                  </span>
                  <span className={fitMeta.cls}>{fitMeta.label}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 회사 유형 선택 */}
      <div className="card p-4">
        <h3 className="mb-3 font-pixel text-sm font-bold text-ink/80">회사 유형 선택</h3>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {COMPANY_KEYS.map((key) => {
            const c = COMPANY_TYPES[key];
            const active = company === key;
            const chance = employmentChance(character, family, key);
            const salary = startingSalary(grade, key, family ?? undefined);
            return (
              <button
                key={key}
                type="button"
                onClick={() => setCompany(key)}
                className={cn(
                  "flex flex-col gap-1 rounded-xl border-[3px] p-3 text-left transition-transform",
                  active
                    ? "border-ink bg-sky/30 -translate-y-0.5"
                    : "border-ink/15 bg-white hover:border-ink/40",
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="font-pixel text-sm font-bold">{c.label}</span>
                  <span className="pill bg-black/[0.05] text-ink/70">합격 {chance}%</span>
                </div>
                <span className="font-sans text-[11px] text-ink/50">{c.desc}</span>
                <span className="font-pixel text-[11px] text-ink/60">
                  예상 초봉 {salary.toLocaleString()}만원
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 지원하기 */}
      <button
        type="button"
        disabled={!canApply}
        onClick={() => family && company && applyForJob(family, company)}
        className="toy-btn w-full bg-coral text-ink disabled:bg-black/10 disabled:text-ink/40"
      >
        {onApplyCooldown
          ? "잠시 후 다시 지원할 수 있어요"
          : !family || !company
            ? "직업군과 회사를 선택하세요"
            : "이 회사에 지원하기"}
      </button>
        </>
      )}

      <YearlyReviewModal />
      <JobResultModal />
      <Toast />
      <OutcomeBurst />
      <BottomNav />
    </main>
  );
}
