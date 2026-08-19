import type { ActionEffect } from "@/types/action";
import type { ActiveSession, Character } from "@/types/character";
import { round2 } from "./clamp";
import { learningEfficiency } from "./status";
import { COOLDOWN_SCALE } from "./constants";

const MIN = 60 * 1000;

/**
 * 완료 가능 시점 이후 100% 보상 윈도우 / 70% 윈도우.
 * 세션 길이가 COOLDOWN_SCALE 로 줄어들므로(30분→90초) 윈도우도 같이 스케일해야
 * perfect/ok/late 티어가 실제로 갈린다(원시값이면 유예가 세션보다 길어 티어가 죽는다).
 */
export const STUDY_PERFECT_WINDOW_MS = Math.round(10 * MIN * COOLDOWN_SCALE); // 30초
export const STUDY_OK_WINDOW_MS = Math.round(30 * MIN * COOLDOWN_SCALE); // 90초

/** 세션 동안 이만큼 이상 페이지가 숨겨져 있었으면 집중 실패 — 잠깐의 탭 전환은 허용 */
export const STUDY_HIDDEN_FAIL_MS = 30 * 1000;

const STUDY_BASE = {
  intelligence: 2,
  discipline: 1.5,
  memory: 1, // 시험(examScore)에 반영
  focusStatus: 3, // status.focus 회복
  exp: 12,
};

export type StudyTier = "perfect" | "ok" | "late" | "distracted";

export interface StudyResult {
  effect: ActionEffect;
  tier: StudyTier;
  efficiency: number;
  rewardRate: number; // 0~1.2
}

export function buildStudySession(
  startedAt: number,
  sessionMs: number,
): ActiveSession {
  return {
    actionType: "study",
    startedAt,
    availableCompleteAt: startedAt + sessionMs,
    expiresAt: startedAt + sessionMs + STUDY_OK_WINDOW_MS,
    hiddenMs: 0,
  };
}

export function isStudyReady(session: ActiveSession, now: number): boolean {
  return now >= session.availableCompleteAt;
}

/** 완료 시점/집중 상태에 따른 보상 배율과 효과를 계산 */
export function computeStudyResult(
  c: Character,
  session: ActiveSession,
  now: number,
): StudyResult {
  const afterReady = now - session.availableCompleteAt;

  let tier: StudyTier;
  let rewardRate: number;
  if (session.hiddenMs >= STUDY_HIDDEN_FAIL_MS) {
    tier = "distracted";
    rewardRate = 0.3;
  } else if (afterReady <= STUDY_PERFECT_WINDOW_MS) {
    tier = "perfect";
    rewardRate = 1;
  } else if (afterReady <= STUDY_OK_WINDOW_MS) {
    tier = "ok";
    rewardRate = 0.7;
  } else {
    tier = "late";
    rewardRate = 0.3;
  }

  const efficiency = learningEfficiency(c);
  const factor = round2(rewardRate * efficiency);

  const effect: ActionEffect = {
    stats: {
      intelligence: round2(STUDY_BASE.intelligence * factor),
      discipline: round2(STUDY_BASE.discipline * factor),
      memory: round2(STUDY_BASE.memory * factor),
    },
    status: {
      focus: round2(STUDY_BASE.focusStatus * factor),
      stress: 4, // 공부는 약간의 스트레스
      energy: -6,
    },
    exp: Math.round(STUDY_BASE.exp * factor),
    message: studyMessage(tier),
  };

  return { effect, tier, efficiency, rewardRate };
}

function studyMessage(tier: StudyTier): string {
  switch (tier) {
    case "perfect":
      return "완벽한 집중! 공부 보상 100%를 받았어요.";
    case "ok":
      return "조금 늦었지만 잘했어요. 보상 70%.";
    case "late":
      return "너무 늦게 완료했어요. 보상 30%.";
    case "distracted":
      return "공부 중 자리를 너무 오래 비웠어요. 보상 30%.";
  }
}
