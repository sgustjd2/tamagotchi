// 컨디션/스탯 용어 사전 — 설명 없이 던져지던 지표 23종의 정의 단일 출처.
// StatBar 툴팁과 도움말 페이지가 모두 여기서 읽는다.
// 정의는 반드시 실제 코드의 역할(status.ts, review.ts, life.ts 등)과 일치시킬 것.

export interface GlossaryEntry {
  key: string;
  label: string;
  desc: string;
}

/** 컨디션(상태) 11종 — 시간이 흐르면 감쇠하고, 케어 행동으로 회복 */
export const STATUS_GLOSSARY: GlossaryEntry[] = [
  {
    key: "hunger",
    label: "배고픔",
    desc: "시간이 지나면 계속 줄어요. 30 미만이면 공부·업무 효율이 절반이 되고, 0이 되면 생명이 위험해요.",
  },
  {
    key: "energy",
    label: "체력",
    desc: "행동할 때마다 소모돼요. 30 미만이면 효율이 떨어져요. 재우기로 회복!",
  },
  {
    key: "mood",
    label: "기분",
    desc: "30 미만이면 효율이 떨어지고, 행복도(평생 평균)에 가장 크게 반영돼요.",
  },
  {
    key: "health",
    label: "건강",
    desc: "연간 결산 점수에 반영되고, 높을수록 사고·질병 위험이 줄어요. 체중이 적정 범위를 벗어나면 깎여요.",
  },
  {
    key: "focus",
    label: "집중력",
    desc: "80을 넘으면 공부 보상이 +20%. 공부·독서로 올라가요.",
  },
  {
    key: "cleanliness",
    label: "청결",
    desc: "25 미만이면 효율이 떨어져요. 씻기기로 회복!",
  },
  {
    key: "sleepQuality",
    label: "수면 질",
    desc: "연간 결산 점수에 반영돼요. 규칙적으로 재워 주면 올라가요.",
  },
  {
    key: "confidence",
    label: "자신감",
    desc: "칭찬·운동·성취로 올라가요. 연간 결산 등급이 좋으면 함께 올라요.",
  },
  {
    key: "stress",
    label: "스트레스",
    desc: "낮을수록 좋아요. 80을 넘으면 사고 위험이 커지고 결산 점수도 깎여요.",
  },
  {
    key: "burnout",
    label: "번아웃",
    desc: "낮을수록 좋아요. 높으면 행복도가 떨어지고 위험도 커져요. 휴식·여가로 해소!",
  },
  {
    key: "weight",
    label: "몸무게",
    desc: "나이별 적정 범위를 벗어나면 매시간 건강이 깎여요. 과식은 증가, 운동은 감소.",
  },
];

/** 능력치(스탯) — 레벨업 포인트로 배분하거나 행동으로 성장 */
export const STAT_GLOSSARY: GlossaryEntry[] = [
  {
    key: "intelligence",
    label: "지능",
    desc: "시험 점수와 직무역량의 핵심. 공부·독서로 성장해요.",
  },
  {
    key: "discipline",
    label: "성실성",
    desc: "시험·업무평가에 반영돼요. 꾸준한 공부·자기개발로 성장해요.",
  },
  {
    key: "creativity",
    label: "창의력",
    desc: "디자인·기획 같은 직군의 핵심 역량이자 시험에도 반영돼요. 독서로 성장해요.",
  },
  {
    key: "memory",
    label: "기억력",
    desc: "시험 점수에 반영돼요. 공부로 성장해요.",
  },
  {
    key: "communication",
    label: "소통",
    desc: "면접·업무평가에 반영되는 대인 역량이에요.",
  },
  {
    key: "stamina",
    label: "지구력",
    desc: "근력과 함께 단련된 몸을 만들어 사고 피해를 최대 40% 줄여요. 유산소 운동으로 성장해요.",
  },
  {
    key: "strength",
    label: "근력",
    desc: "지구력과 함께 사고 피해를 최대 40% 줄여요. 근력 운동으로 성장해요.",
  },
  {
    key: "fitness",
    label: "체력단련",
    desc: "운동 습관의 누적치예요. 꾸준히 운동할수록 쌓여요.",
  },
  {
    key: "careerPotential",
    label: "커리어 잠재력",
    desc: "업무평가·승진에 반영돼요. 자기개발로 키우고, 안 하면 매년 깎여요.",
  },
  {
    key: "employability",
    label: "취업력",
    desc: "취업 합격률에 직접 반영돼요. 이력서·포폴·면접 준비로 올라가요.",
  },
  {
    key: "luck",
    label: "행운",
    desc: "행동 대성공 확률과 뽑기 레어 확률을 올려요. 미니게임·뽑기로 조금씩 쌓여요.",
  },
];

const BY_LABEL = new Map(
  [...STATUS_GLOSSARY, ...STAT_GLOSSARY].map((e) => [e.label, e.desc]),
);

/** 라벨(한국어)로 정의 찾기 — StatBar 툴팁용 */
export function glossaryDesc(label: string): string | undefined {
  return BY_LABEL.get(label);
}
