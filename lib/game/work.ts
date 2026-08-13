import type { ActionEffect } from "@/types/action";
import type {
  Character,
  ReviewGrade,
  WorkReview,
  YearCounters,
} from "@/types/character";
import { clamp, round2 } from "./clamp";
import { PROMO_THRESHOLD, RAISE_PCT, YEARLY_TARGETS } from "./constants";
import { applyEffect } from "./engine";
import { JOB_FAMILIES, jobTitle, nextGrade, startingSalary } from "./jobs";

const ci = (s: number) => Math.min(Math.max(s, 0), 100);

interface ScoreStatus {
  hunger: number;
  energy: number;
  focus: number;
  health: number;
  mood: number;
  stress: number;
  burnout: number;
  sleepQuality: number;
}

/**
 * 채점에 쓸 컨디션. 다년 오프라인 점프(neutral)면 누적 감쇠된 status 대신 중립값 사용
 * (비직장인 scoreYear 의 neutralStatus 와 대칭 — 직장인만 불이익 받는 비대칭 방지).
 */
function effStatus(c: Character, neutral: boolean): ScoreStatus {
  if (neutral) {
    return {
      hunger: 50,
      energy: 50,
      focus: 50,
      health: 50,
      mood: 50,
      stress: 50,
      burnout: 30,
      sleepQuality: 50,
    };
  }
  const s = c.status;
  return {
    hunger: s.hunger,
    energy: s.energy,
    focus: s.focus,
    health: s.health,
    mood: s.mood,
    stress: s.stress,
    burnout: s.burnout,
    sleepQuality: s.sleepQuality,
  };
}

/** 직무 핵심 스탯 평균 (job 없으면 0) */
export function jobCoreStatAvg(c: Character): number {
  if (!c.job) return 0;
  const cs = JOB_FAMILIES[c.job.family].coreStats;
  if (cs.length === 0) return 0;
  return round2(cs.reduce((a, k) => a + ci(c.stats[k]), 0) / cs.length);
}

/** 직무 역량 = 핵심 스탯 평균 + 누적 성과(performance) 블렌드 */
export function competency(c: Character): number {
  return round2((jobCoreStatAvg(c) + ci(c.stats.performance)) / 2);
}

export function reputationScore(c: Character): number {
  return round2((ci(c.stats.careerPotential) + ci(c.stats.communication)) / 2);
}

export function leadershipScore(c: Character): number {
  return round2(
    (ci(c.stats.careerPotential) +
      ci(c.stats.communication) +
      ci(c.stats.discipline)) /
      3,
  );
}

/** 업무 실패 요인 배수 (PRD 12.3) — 악조건이 겹치면 곱으로 누적 */
export function failMult(c: Character, neutral = false): number {
  const s = effStatus(c, neutral);
  let m = 1;
  if (s.hunger < 30) m *= 0.8;
  if (s.energy < 30) m *= 0.75;
  if (s.stress > 80) m *= 0.8;
  if (s.burnout > 80) m *= 0.85;
  return m;
}

/** 업무 성과 (PRD 12.2) — rand 0~1 주입 */
export function workPerformance(c: Character, rand: number, neutral = false): number {
  const s = effStatus(c, neutral);
  const base =
    competency(c) * 0.4 +
    s.focus * 0.2 +
    ci(c.stats.discipline) * 0.15 +
    s.health * 0.1 +
    s.mood * 0.05 +
    rand * 100 * 0.1;
  return clamp(Math.round(base * failMult(c, neutral)), 0, 100);
}

/** 업무평가 종합 점수 (PRD 13, 0~100) */
export function evaluationScore(
  c: Character,
  counters: YearCounters,
  rand: number,
  neutral = false,
): number {
  const s = effStatus(c, neutral);
  const perf = workPerformance(c, rand, neutral);
  const comp = competency(c);
  const att = clamp(100 - s.stress * 0.5, 0, 100);
  const collab = ci(c.stats.communication);
  const growth = ci(c.stats.careerPotential);
  const rel = clamp(100 - s.burnout * 0.6, 0, 100);
  // 건강관리 = 건강 상태 + 수면의 질 + 그 해 운동·식사 실천(케어 루프가 평가에 직결되도록)
  const practice =
    (Math.min(counters.exercise / YEARLY_TARGETS.exercise, 1) * 0.5 +
      Math.min(counters.meals / YEARLY_TARGETS.meals, 1) * 0.5) *
    100;
  const hmgmt = s.health * 0.6 + s.sleepQuality * 0.2 + practice * 0.2;
  const sdev = Math.min(counters.selfDev / YEARLY_TARGETS.selfDev, 1) * 100;
  const raw =
    perf * 0.25 +
    comp * 0.2 +
    att * 0.15 +
    collab * 0.1 +
    growth * 0.1 +
    rel * 0.05 +
    hmgmt * 0.1 +
    sdev * 0.05;
  return clamp(Math.round(raw), 0, 100);
}

/** 업무평가 등급 (PRD 13 컷 — review.ts gradeOf 와 다름, 혼용 금지) */
export function workGradeOf(score: number): ReviewGrade {
  return score >= 90
    ? "S"
    : score >= 80
      ? "A"
      : score >= 70
        ? "B"
        : score >= 60
          ? "C"
          : "D";
}

export function workEvalEffect(grade: ReviewGrade): ActionEffect {
  switch (grade) {
    case "S":
      return { stats: { careerPotential: 3 }, status: { confidence: 5, mood: 4 } };
    case "A":
      return { stats: { careerPotential: 2 }, status: { confidence: 3 } };
    case "B":
      return { stats: { careerPotential: 1 } };
    case "C":
      return { status: { mood: -3, stress: 4 } };
    case "D":
      return { status: { confidence: -4, mood: -5, stress: 5, burnout: 5 } };
  }
}

/** 만원 100단위 인상 적용 */
export function applyRaise(salary: number, pct: number): number {
  return Math.round((salary * (1 + pct / 100)) / 100) * 100;
}

/**
 * 승진 점수 (PRD 15) + 같은 직급 근속 보정.
 * 스탯이 애매한 캐릭터가 만년 사원으로 고착되지 않게, 같은 직급에서
 * 해를 넘길수록 +2/년(최대 +10) — 결혼/출산의 누적 상승형과 같은 패턴.
 * reviewAge 생략 시 현재 나이 기준(WorkPanel 진행률 표시 경로).
 */
export function promotionScore(
  c: Character,
  recentEvalScore: number,
  counters: YearCounters,
  neutral = false,
  reviewAge = c.ageYears,
): number {
  const sdev = Math.min(counters.selfDev / YEARLY_TARGETS.selfDev, 1) * 100;
  const sinceAge = c.job?.promotedAtAge ?? c.job?.hiredAtAge ?? reviewAge;
  const tenure = Math.min(10, Math.max(0, (reviewAge - sinceAge - 1) * 2));
  const raw =
    recentEvalScore * 0.35 +
    jobCoreStatAvg(c) * 0.25 +
    leadershipScore(c) * 0.15 +
    reputationScore(c) * 0.1 +
    sdev * 0.1 +
    effStatus(c, neutral).health * 0.05 +
    tenure;
  return clamp(Math.round(raw), 0, 100);
}

/**
 * 승진 보류 사유 (있으면 보류) — PRD 15.
 * C등급은 보류에서 제외 — 평가는 승진 점수의 35%로 이미 반영되는데
 * C까지 무조건 보류하면 이중 처벌이라 보통 캐릭터가 영구 정체됐음. D만 보류.
 */
export function promotionHold(
  c: Character,
  thisGrade: ReviewGrade,
  counters: YearCounters,
  neutral = false,
): string[] {
  const s = effStatus(c, neutral);
  const reasons: string[] = [];
  if (thisGrade === "D") reasons.push("평가 부진");
  if (s.burnout > 85) reasons.push("번아웃");
  if (counters.selfDev === 0) reasons.push("자기개발 부족");
  if (s.health < 30) reasons.push("건강 악화");
  return reasons;
}

/**
 * 연간 업무평가 처리: 평가 → 연봉 인상 → 승진 심사 → job 갱신 + 효과 적용.
 * 직장인(job 보유) 전용. neutral = 다년 오프라인 점프 보호.
 */
export function processWorkReview(
  c: Character,
  reviewAge: number,
  rand: number,
  neutral = false,
): { character: Character; work: WorkReview | null } {
  const job = c.job;
  if (!job) return { character: c, work: null };

  const counters = c.yearCounters;
  const evalScore = evaluationScore(c, counters, rand, neutral);
  const wPerf = workPerformance(c, rand, neutral);
  const grade = workGradeOf(evalScore);

  // 1) 연봉 인상 — 협상 역효과(괘씸죄) 플래그가 있으면 이번 1회만 -0.5%p
  const backfire = c.negotiateBackfire === true;
  const pct = RAISE_PCT[grade] - (backfire ? 0.5 : 0);
  const salaryBefore = job.salaryManwon;
  let salaryAfter = applyRaise(salaryBefore, pct);

  // 2) 승진 심사
  const reasons = promotionHold(c, grade, counters, neutral);
  const pScore = promotionScore(c, evalScore, counters, neutral, reviewAge);
  const next = nextGrade(job.grade);
  const promoted =
    next != null && reasons.length === 0 && pScore >= PROMO_THRESHOLD[job.grade];

  const oldGrade = job.grade;
  let newGrade = oldGrade;
  if (promoted && next) {
    newGrade = next;
    salaryAfter = Math.max(
      salaryAfter,
      startingSalary(newGrade, job.company, job.family),
    );
  }

  const newJob = {
    ...job,
    grade: newGrade,
    title: jobTitle(job.family, newGrade),
    salaryManwon: salaryAfter,
    lastEvalGrade: grade,
    lastRaisePct: pct,
    promotedAtAge: promoted ? reviewAge : job.promotedAtAge,
  };

  let character = applyEffect(c, workEvalEffect(grade));
  character = { ...character, job: newJob };
  if (backfire) character = { ...character, negotiateBackfire: false }; // 1회 소비 후 클리어

  const work: WorkReview = {
    evalScore,
    grade,
    workPerformance: wPerf,
    raisePct: pct,
    salaryBefore,
    salaryAfter,
    promoted,
    gradeFrom: promoted ? oldGrade : undefined,
    gradeTo: promoted ? newGrade : undefined,
    promoHeld:
      next != null && reasons.length > 0 && pScore >= PROMO_THRESHOLD[oldGrade],
    holdReasons: reasons.length > 0 ? reasons : undefined,
  };

  return { character, work };
}
