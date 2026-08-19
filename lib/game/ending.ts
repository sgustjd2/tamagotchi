import type { Character, ReviewGrade } from "@/types/character";
import { netWorth } from "./assets";
import { clamp } from "./clamp";
import { GRADE_ORDER, JOB_FAMILIES } from "./jobs";
import { INCIDENT_CAUSES } from "./life";

const ci = (s: number) => Math.min(Math.max(s, 0), 100);

const GRADE_PTS: Record<ReviewGrade, number> = { S: 100, A: 80, B: 60, C: 40, D: 20 };

function avgReviewScore(c: Character): number {
  const rs = (c.reviews ?? []).filter((r) => r.kind === "normal");
  if (rs.length === 0) return 50;
  return rs.reduce((a, r) => a + (GRADE_PTS[r.grade] ?? 50), 0) / rs.length;
}

/** 인생 종합 점수 (참고 지표) */
export function computeLifeScore(c: Character): number {
  const levelScore = ci(c.level * 4);
  const educationScore = ci(c.stats.academic);
  const careerScore = c.job
    ? (GRADE_ORDER.indexOf(c.job.grade) / (GRADE_ORDER.length - 1)) * 100
    : 0;
  const savingsScore = clamp((netWorth(c) / 50000) * 100, 0, 100); // 순자산 5억=100
  const happinessScore = c.happiness;
  const healthScore = c.status.health;
  const consistencyScore = avgReviewScore(c);
  const raw =
    levelScore * 0.1 +
    educationScore * 0.1 +
    careerScore * 0.2 +
    savingsScore * 0.2 +
    happinessScore * 0.2 +
    healthScore * 0.1 +
    consistencyScore * 0.1;
  return clamp(Math.round(raw), 0, 100);
}

/** 만원 → "X억 Y만원" */
export function formatMoney(manwon: number): string {
  const neg = manwon < 0;
  const v = Math.abs(Math.round(manwon));
  const eok = Math.floor(v / 10000);
  const man = v % 10000;
  let s: string;
  if (eok > 0) s = `${eok}억${man > 0 ? ` ${man.toLocaleString()}만` : ""}`;
  else s = `${v.toLocaleString()}만`;
  return `${neg ? "-" : ""}${s}원`;
}

export interface LifeEnding {
  title: string;
  subtitle: string;
}

// 요절 판정용 사인 — life.ts INCIDENTS 와 단일 출처 동기화(문구 변경 시 자동 추종)
const FATAL_INCIDENTS = INCIDENT_CAUSES;

/** 여러 지표(수명·저축·행복·직업) 조합으로 갈리는 열린 결말 */
export function lifeEnding(c: Character): LifeEnding {
  const age = c.deathAge ?? c.ageYears;
  const cause = c.deathCause ?? "노환";
  const s = netWorth(c); // 부자 판정은 저축 + 자산(차/집) 순자산 기준
  const h = c.happiness;
  const rarity = c.job ? JOB_FAMILIES[c.job.family].rarity : null;
  const isCeo = c.job?.grade === "ceo";

  const rich = s >= 50000;
  const comfortable = s >= 10000;
  const poor = s < 3000;
  const debt = s < 0;
  const happy = h >= 70;
  const unhappy = h < 40;

  // 1) 요절 (사고/병/굶주림으로 일찍)
  if (age < 45 && (FATAL_INCIDENTS.includes(cause) || cause === "굶주림")) {
    return {
      title: "굵고 짧게 산 인생",
      subtitle: `${age}세, ${cause}로 갑작스레 세상을 떠났어요.`,
    };
  }
  // 2) 전설
  if ((isCeo || rarity === "legendary") && (rich || comfortable)) {
    return { title: "전설이 된 인물", subtitle: "정상에서 부와 명예를 모두 거머쥐었어요." };
  }
  // 3) 빚더미
  if (debt) {
    return { title: "파란만장한 인생", subtitle: "빚을 남겼지만 끝까지 치열하게 살았어요." };
  }
  // 4) 부자 × 행복
  if (rich && happy) {
    return { title: "부와 행복을 다 가진 인생", subtitle: "남부럽지 않은 삶을 살았어요." };
  }
  // 5) 부자 × 불행
  if (rich && unhappy) {
    return { title: "외로운 부자", subtitle: "돈은 많았지만 마음은 가난했던 말년." };
  }
  // 6) 안정 × 행복
  if (comfortable && happy) {
    return { title: "안정되고 행복한 삶", subtitle: "잔잔하지만 단단한 인생이었어요." };
  }
  // 7) 가난 × 행복
  if (poor && happy) {
    return { title: "소소하지만 확실한 행복", subtitle: "가진 건 적어도 웃으며 살았어요." };
  }
  // 8) 매우 행복
  if (h >= 80) {
    return { title: "누구보다 행복했던 사람", subtitle: "마음만은 늘 부자였어요." };
  }
  // 9) 불행
  if (unhappy) {
    return { title: "지치고 쓸쓸했던 삶", subtitle: "쉼 없이 달렸지만 마음은 허전했어요." };
  }
  // 10) 천수 (한계까지)
  if (age >= 58) {
    return { title: "천수를 누린 인생", subtitle: `${age}세까지 무탈하게 살았어요.` };
  }
  // 11) 무직
  if (!c.job) {
    return { title: "자유로운 영혼", subtitle: "직업 없이 마이웨이로 살아온 인생." };
  }
  // 12) 기본
  return { title: "평범하지만 무탈했던 삶", subtitle: "크게 모나지 않게, 무사히 한 생을 마쳤어요." };
}
