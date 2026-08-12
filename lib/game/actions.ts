import type { ActionDef, StatsDelta } from "@/types/action";
import type { Character } from "@/types/character";
import { round2 } from "./clamp";
import { JOB_FAMILIES } from "./jobs";
import { weightEfficiencyMultiplier } from "./weight";

const MIN = 60 * 1000;
const HOUR = 60 * MIN;

/** 직무 핵심 스탯에 total 만큼 균등 분배 (직무별 편차 제거) */
function coreStatBoost(c: Character, total: number): StatsDelta {
  const out: Record<string, number> = {};
  if (!c.job) return out;
  const cs = JOB_FAMILIES[c.job.family].coreStats;
  if (cs.length === 0) return out;
  const per = round2(total / cs.length);
  cs.forEach((k) => {
    out[k] = (out[k] ?? 0) + per;
  });
  return out as StatsDelta;
}

/**
 * 액션 정의 목록.
 * - food: 밥 먹이기 (음식 선택은 FoodSelector + feed 로직에서 처리)
 * - session: 공부하기 (시작/완료 30분, study.ts 에서 보상 계산)
 * - instant: 즉시 보상 액션
 */
export const ACTIONS: ActionDef[] = [
  {
    key: "feed",
    label: "밥 먹이기",
    emoji: "🍚",
    desc: "음식을 골라 배고픔을 채워요.",
    kind: "food",
    cooldownMs: 3 * HOUR,
    category: "care",
  },
  {
    key: "snack",
    label: "간식 주기",
    emoji: "🍪",
    desc: "기분 전환! 대신 살짝 살이 붙어요.",
    kind: "instant",
    cooldownMs: 1 * HOUR,
    category: "fun",
    effect: () => ({
      status: { hunger: 10, mood: 8, weight: 0.15 },
      exp: 3,
      message: "간식을 먹고 기분이 좋아졌어요.",
    }),
  },
  {
    key: "study",
    label: "공부하기",
    emoji: "📖",
    desc: "30분 집중 세션. 끝나면 완료를 눌러 보상을 받아요.",
    kind: "session",
    cooldownMs: 30 * MIN,
    sessionMs: 30 * MIN,
    category: "study",
    minStage: "elementary",
  },
  {
    key: "cardio",
    label: "유산소 운동",
    emoji: "🏃",
    desc: "체중 감량 효과가 크고 지구력을 키워요.",
    kind: "instant",
    cooldownMs: 1 * HOUR,
    category: "fitness",
    minStage: "elementary",
    effect: (c: Character) => {
      const m = weightEfficiencyMultiplier(c);
      return {
        status: {
          weight: -0.45 * m,
          energy: -10,
          stress: -5,
          mood: 5,
          health: 2,
        },
        stats: { stamina: 1.8 * m, fitness: 0.6 * m },
        exp: 8,
        message: "유산소 운동으로 땀을 흠뻑 흘렸어요! 몸이 가벼워요.",
      };
    },
  },
  {
    key: "strength",
    label: "근력 운동",
    emoji: "🏋️",
    desc: "체중 감량은 적지만 근력을 크게 키워요.",
    kind: "instant",
    cooldownMs: 1 * HOUR,
    category: "fitness",
    minStage: "elementary",
    effect: (c: Character) => {
      const m = weightEfficiencyMultiplier(c);
      return {
        status: {
          weight: -0.15 * m,
          energy: -12,
          stress: -3,
          mood: 2,
          health: 2,
          confidence: 2,
        },
        stats: { strength: 1.8 * m, fitness: 0.6 * m },
        exp: 9,
        message: "근력 운동으로 몸을 다졌어요. 점점 탄탄해져요!",
      };
    },
  },
  {
    key: "selfDev",
    label: "자기개발",
    emoji: "🚀",
    desc: "커리어 잠재력과 성실성을 키워요.",
    kind: "instant",
    cooldownMs: 1 * HOUR,
    category: "selfdev",
    minStage: "high",
    effect: () => ({
      status: { energy: -5, stress: 3, focus: 2 },
      stats: { careerPotential: 2, discipline: 1 },
      exp: 10,
      message: "자기개발에 시간을 투자했어요. 미래의 나에게 투자!",
    }),
  },
  {
    key: "read",
    label: "독서",
    emoji: "📚",
    desc: "지능과 창의력을 키워요.",
    kind: "instant",
    cooldownMs: 1 * HOUR,
    category: "selfdev",
    minStage: "child",
    effect: () => ({
      status: { focus: 3, mood: 2 },
      stats: { intelligence: 1, creativity: 1, memory: 0.5 },
      exp: 6,
      message: "책을 읽으며 생각이 깊어졌어요.",
    }),
  },
  {
    key: "play",
    label: "놀아주기",
    emoji: "🎈",
    desc: "기분을 올리고 스트레스를 풀어요.",
    kind: "instant",
    cooldownMs: 1 * HOUR,
    category: "fun",
    effect: () => ({
      status: { mood: 15, stress: -10, energy: -5 },
      exp: 4,
      message: "신나게 놀았어요!",
    }),
  },
  {
    key: "praise",
    label: "칭찬하기",
    emoji: "💖",
    desc: "듬뿍 칭찬해 자신감을 키워요.",
    kind: "instant",
    cooldownMs: 1 * HOUR,
    category: "care",
    effect: () => ({
      status: { confidence: 6, mood: 5, stress: -2 },
      exp: 4,
      message: "칭찬을 듬뿍 받아 자신감이 자랐어요!",
    }),
  },
  {
    key: "bath",
    label: "씻기",
    emoji: "🛁",
    desc: "청결을 회복하고 기분도 좋아져요.",
    kind: "instant",
    cooldownMs: 4 * HOUR,
    category: "care",
    effect: () => ({
      status: { cleanliness: 55, mood: 5 },
      exp: 3,
      message: "깨끗하게 씻었어요. 뽀송뽀송!",
    }),
  },
  {
    key: "nap",
    label: "낮잠 자기",
    emoji: "😴",
    desc: "체력을 빠르게 회복해요.",
    kind: "instant",
    cooldownMs: 2 * HOUR,
    category: "rest",
    effect: () => ({
      status: { energy: 25, mood: 3, stress: -4 },
      exp: 2,
      message: "달콤한 낮잠으로 체력을 회복했어요.",
    }),
  },
  {
    key: "sleep",
    label: "수면",
    emoji: "🛏️",
    desc: "푹 자고 컨디션을 크게 회복해요.",
    kind: "instant",
    cooldownMs: 8 * HOUR,
    category: "rest",
    effect: () => ({
      status: { energy: 60, sleepQuality: 45, stress: -18, health: 3, focus: 10 },
      exp: 4,
      message: "푹 잤어요. 컨디션 최상!",
    }),
  },

  // --- 취업 준비 (jobseeker 단계, 커리어 화면 전용) ---
  {
    key: "resume",
    label: "이력서 수정",
    emoji: "📄",
    desc: "이력서를 다듬어 완성도를 높여요.",
    kind: "instant",
    cooldownMs: 2 * HOUR,
    category: "selfdev",
    minStage: "jobseeker",
    effect: () => ({
      status: { confidence: 2, stress: 1 },
      stats: { portfolioScore: 9, communication: 0.5, employability: 0.5 },
      exp: 8,
      message: "이력서를 다듬었어요.",
    }),
  },
  {
    key: "portfolio",
    label: "포트폴리오",
    emoji: "🗂️",
    desc: "포트폴리오를 한 단계 끌어올려요.",
    kind: "instant",
    cooldownMs: 3 * HOUR,
    category: "selfdev",
    minStage: "jobseeker",
    effect: () => ({
      status: { energy: -8, stress: 3, focus: -3 },
      stats: { portfolioScore: 13, creativity: 0.8, careerPotential: 0.5, employability: 0.8 },
      exp: 12,
      message: "포트폴리오를 끌어올렸어요.",
    }),
  },
  {
    key: "interviewPrep",
    label: "면접 연습",
    emoji: "💬",
    desc: "면접 연습으로 자신감을 키워요.",
    kind: "instant",
    cooldownMs: 2 * HOUR,
    category: "selfdev",
    minStage: "jobseeker",
    effect: () => ({
      status: { confidence: 3, stress: 2, energy: -5 },
      stats: { interviewScore: 12, communication: 0.8, employability: 0.5 },
      exp: 10,
      message: "면접 연습으로 자신감이 붙었어요.",
    }),
  },
  {
    key: "certStudy",
    label: "자격증 공부",
    emoji: "🎖️",
    desc: "자격증 공부로 스펙을 쌓아요.",
    kind: "instant",
    cooldownMs: 3 * HOUR,
    category: "selfdev",
    minStage: "jobseeker",
    effect: () => ({
      status: { focus: 3, stress: 2, energy: -6 },
      stats: { certificateScore: 13, academic: 0.6, intelligence: 0.4, employability: 0.8 },
      exp: 11,
      message: "자격증 공부로 스펙을 쌓았어요.",
    }),
  },

  // --- 업무 (employee 단계, 직장 화면 전용) ---
  {
    key: "focusWork",
    label: "집중 업무",
    emoji: "💻",
    desc: "직무 핵심 역량과 성과를 키워요.",
    kind: "instant",
    cooldownMs: 2 * HOUR,
    category: "study",
    minStage: "employee",
    effect: (c: Character) => ({
      status: { energy: -8, focus: 4, stress: 2 },
      stats: { performance: 2, ...coreStatBoost(c, 1.2) },
      exp: 12,
      message: "집중해서 업무를 처리했어요.",
    }),
  },
  {
    key: "writeDoc",
    label: "문서 작성",
    emoji: "📑",
    desc: "보고서·문서 능력을 키워요.",
    kind: "instant",
    cooldownMs: 2 * HOUR,
    category: "study",
    minStage: "employee",
    effect: () => ({
      status: { energy: -5, focus: 2 },
      stats: { performance: 1.5, communication: 0.5, discipline: 0.4 },
      exp: 10,
      message: "문서를 깔끔하게 정리했어요.",
    }),
  },
  {
    key: "meeting",
    label: "회의 참여",
    emoji: "🗣️",
    desc: "소통과 협업 능력을 키워요.",
    kind: "instant",
    cooldownMs: 90 * MIN,
    category: "selfdev",
    minStage: "employee",
    effect: () => ({
      status: { energy: -6, mood: 2, stress: 1, confidence: 2 },
      stats: { communication: 1, careerPotential: 0.3 },
      exp: 8,
      message: "회의에서 의견을 나눴어요.",
    }),
  },
  {
    key: "handleIssue",
    label: "이슈 대응",
    emoji: "🚨",
    desc: "문제를 해결하지만 스트레스가 쌓여요.",
    kind: "instant",
    cooldownMs: 3 * HOUR,
    category: "study",
    minStage: "employee",
    effect: () => ({
      status: { stress: 8, energy: -7, focus: 1 },
      stats: { performance: 2.5, intelligence: 0.5, careerPotential: 0.3 },
      exp: 12,
      message: "급한 이슈를 처리했어요. 휴!",
    }),
  },
  {
    key: "workSelfDev",
    label: "자기개발",
    emoji: "🚀",
    desc: "커리어 잠재력을 키워 승진에 대비해요.",
    kind: "instant",
    cooldownMs: 1 * HOUR,
    category: "selfdev",
    minStage: "employee",
    effect: () => ({
      status: { energy: -5, stress: 2, confidence: 2 },
      stats: { careerPotential: 2, discipline: 1 },
      exp: 10,
      message: "자기개발에 투자했어요.",
    }),
  },
  {
    key: "workRest",
    label: "휴식",
    emoji: "☕",
    desc: "번아웃과 스트레스를 풀어요.",
    kind: "instant",
    cooldownMs: 2 * HOUR,
    category: "rest",
    minStage: "employee",
    effect: () => ({
      status: { energy: 18, stress: -20, burnout: -10, mood: 4 },
      exp: 2,
      message: "잠시 쉬며 한숨 돌렸어요.",
    }),
  },
  {
    key: "overtime",
    label: "야근",
    emoji: "🌙",
    desc: "성과는 오르지만 번아웃이 쌓여요.",
    kind: "instant",
    cooldownMs: 4 * HOUR,
    category: "study",
    minStage: "employee",
    effect: () => ({
      status: { energy: -15, stress: 10, burnout: 12, health: -4, focus: -3 },
      stats: { performance: 3.5, careerPotential: 0.5 },
      exp: 14,
      message: "야근으로 성과를 냈지만 지쳤어요.",
    }),
  },
];

/** 취업 준비 액션 (대시보드 ActionGrid 에서 제외, 커리어 화면 전용) */
export const PREP_KEYS = new Set(["resume", "portfolio", "interviewPrep", "certStudy"]);

/** 업무 액션 (대시보드 ActionGrid 에서 제외, 직장 화면 전용) */
export const WORK_KEYS = new Set([
  "focusWork",
  "writeDoc",
  "meeting",
  "handleIssue",
  "workSelfDev",
  "overtime",
  "workRest",
]);

export const ACTION_MAP: Record<string, ActionDef> = Object.fromEntries(
  ACTIONS.map((a) => [a.key, a]),
);

export function getAction(key: string): ActionDef | undefined {
  return ACTION_MAP[key];
}
