import type { Character, JobState, NegotiationResult, ReviewGrade } from "@/types/character";
import { clamp } from "./clamp";
import { startingSalary } from "./jobs";
import { applyRaise, competency, reputationScore } from "./work";

const ci = (s: number) => Math.min(Math.max(s, 0), 100);

/** 업무평가 등급 → 협상력 기여(0~1) */
const GRADE_LEVERAGE: Record<ReviewGrade, number> = {
  S: 1.0,
  A: 0.8,
  B: 0.55,
  C: 0.3,
  D: 0.1,
};

/**
 * 협상력(0~1) — 직전 업무평가 등급 + 평판 + 직무역량 + 소통.
 * 자신감이 태도 보정(±10%), 번아웃/건강 악화 시 감점.
 * (work.ts 의 reputationScore/competency 재사용)
 */
export function leverage(c: Character): number {
  if (!c.job) return 0;
  const lEval = c.job.lastEvalGrade ? GRADE_LEVERAGE[c.job.lastEvalGrade] : 0.25;
  let lev =
    0.4 * lEval +
    0.2 * (reputationScore(c) / 100) +
    0.2 * (competency(c) / 100) +
    0.2 * (ci(c.stats.communication) / 100);
  // 자신감(칭찬·성취로 관리) — 당당한 태도가 협상력을 ±10% 보정
  lev *= 1 + ((ci(c.status.confidence) - 50) / 100) * 0.2;
  if (c.status.burnout > 80 || c.status.health < 30) lev *= 0.7;
  return clamp(lev, 0, 1);
}

/**
 * 이미 동급 시세보다 높이 받을수록 추가 협상 난이도↑ (복리 폭증 자정 장치).
 * 시세의 약 2배에 이르면 성공률이 바닥(0.05)으로 수렴 → 승진 없이 협상만으로
 * 연봉이 무한히 불어나지 않게 한다(자동인상은 별개).
 */
function overAsk(job: JobState): number {
  const market = startingSalary(job.grade, job.company, job.family);
  if (market <= 0) return 0;
  const excess = clamp((job.salaryManwon - market) / market, 0, 1);
  return excess * 0.75;
}

/** 협상 성공 확률(0.05~0.92) */
export function negotiationChance(c: Character): number {
  if (!c.job) return 0;
  return clamp(0.2 + leverage(c) * 0.7 - overAsk(c.job), 0.05, 0.92);
}

/**
 * 협상 가능 여부 — 직장인 + 첫 평가 이후(intern/newbie 제외) + 게임나이 기준 연 1회.
 * 쿨다운은 시계가 아닌 나이 기반: 9분/년·오프라인 다년 점프에서도 '연 1회'가 정확.
 */
export function canNegotiate(c: Character): { ok: boolean; reason?: string } {
  const job = c.job;
  if (!job) return { ok: false, reason: "취업 후에 협상할 수 있어요." };
  if (job.grade === "intern" || job.grade === "newbie") {
    return { ok: false, reason: "정규 직급(사원~) 부터 협상할 수 있어요." };
  }
  if (!job.lastEvalGrade) {
    return { ok: false, reason: "첫 업무평가를 받은 뒤 시도할 수 있어요." };
  }
  const last = job.lastNegotiatedAtAge ?? job.hiredAtAge;
  if (c.ageYears <= last) {
    return { ok: false, reason: "올해는 이미 협상했어요. 내년에 다시 도전!" };
  }
  return { ok: true };
}

/**
 * 협상 1회 처리. rand·rand2 주입(결정성, Math.random 은 store 에서만).
 * 성공: 3~9% 인상. 실패: 인상 0. 역효과(저성과+큰 빗나감): 다음 평가 1회 페널티 플래그.
 */
export function negotiate(
  c: Character,
  rand: number,
  rand2: number,
): NegotiationResult {
  const job = c.job!;
  const lev = leverage(c);
  const successP = negotiationChance(c);
  const before = job.salaryManwon;

  if (rand < successP) {
    const raisePct = clamp(Math.round(3 + lev * 5 + rand2 * 2), 3, 9);
    const after = Math.max(applyRaise(before, raisePct), 0);
    return {
      outcome: "success",
      salaryBefore: before,
      salaryAfter: after,
      raisePct,
      leverage: lev,
      successP,
      atAge: c.ageYears,
    };
  }

  // 실패. 저협상력인데 크게 빗나가면 역효과(괘씸죄)
  const backfire = rand - successP >= 0.3 && lev < 0.4;
  return {
    outcome: backfire ? "backfire" : "fail",
    salaryBefore: before,
    salaryAfter: before,
    raisePct: 0,
    leverage: lev,
    successP,
    atAge: c.ageYears,
  };
}
