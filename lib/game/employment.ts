import type {
  Character,
  CompanyTypeKey,
  JobFamilyKey,
} from "@/types/character";
import { clamp } from "./clamp";
import { currentHeight } from "./body";
import { degreeHiringMod } from "./degree";
import { universityHiringMod } from "./university";
import { COMPANY_TYPES, JOB_FAMILIES, RARITY_META } from "./jobs";

// 0~100 정규화 (누적 스탯이 100 넘으면 만점 고착 방지 — exam.ts ci 패턴)
const ci = (s: number) => Math.min(Math.max(s, 0), 100);

/**
 * 취업 준비도 점수 (PRD 10.3 + employability).
 * educationScore = academic 재사용. portfolio/interview/certificate 는 취업 준비 스탯.
 * 가중치 합 = 1.0.
 */
export function employmentScore(c: Character): number {
  const education = ci(c.stats.academic);
  const portfolio = ci(c.stats.portfolioScore);
  const interview = ci(c.stats.interviewScore);
  const certificate = ci(c.stats.certificateScore);
  const employability = ci(c.stats.employability);
  const communication = ci(c.stats.communication);
  const confidence = c.status.confidence; // 이미 0~100
  const health = c.status.health; // 이미 0~100
  const raw =
    education * 0.22 +
    portfolio * 0.18 +
    interview * 0.18 +
    certificate * 0.1 +
    employability * 0.1 +
    communication * 0.08 +
    confidence * 0.09 +
    health * 0.05;
  return clamp(Math.round(raw), 0, 100);
}

/** 선택한 직업군의 핵심 스탯 평균 */
export function familyCoreAvg(c: Character, family: JobFamilyKey): number {
  const cs = JOB_FAMILIES[family].coreStats;
  if (cs.length === 0) return 0;
  return cs.reduce((a, k) => a + ci(c.stats[k]), 0) / cs.length;
}

/**
 * 직업군 적합도 보너스. 핵심 스탯 평균이 그 직무 기준선(statBar)보다
 * 높을수록 큰 보너스, 낮으면 큰 페널티(능력치에 강하게 연동).
 */
export function familyFitBonus(c: Character, family: JobFamilyKey | null): number {
  if (!family) return 0;
  const diff = familyCoreAvg(c, family) - JOB_FAMILIES[family].statBar;
  return clamp(Math.round(diff * 0.8), -15, 22);
}

export type FamilyFit = "good" | "ok" | "hard";

/** 직업군 적합도 라벨 (UI 가이드) */
export function familyFitLabel(c: Character, family: JobFamilyKey): FamilyFit {
  const diff = familyCoreAvg(c, family) - JOB_FAMILIES[family].statBar;
  if (diff >= 5) return "good";
  if (diff >= -12) return "ok";
  return "hard";
}

/** 직업군 적합도까지 반영한 종합 준비도 (0~100) */
export function employmentReadiness(
  c: Character,
  family: JobFamilyKey | null,
): number {
  return clamp(employmentScore(c) + familyFitBonus(c, family), 0, 100);
}

/** 직군 등급(레어도)에 따른 합격 확률 페널티 — 높은 등급일수록 취업이 어렵다 */
export function rarityHiringMod(family: JobFamilyKey | null): number {
  if (!family) return 0;
  return -3 * RARITY_META[JOB_FAMILIES[family].rarity].order; // 일반 0 ~ 전설 -12
}

/**
 * 신장 적합 보정 — heightBar 가 있는 직군(예: 운동선수)에서만.
 * 키가 기준보다 클수록 합격 유리(+), 작을수록 큰 페널티(−). 그 외 직군은 0.
 */
export function heightFitMod(c: Character, family: JobFamilyKey | null): number {
  if (!family) return 0;
  const bar = JOB_FAMILIES[family].heightBar;
  if (bar == null) return 0;
  return clamp(Math.round((currentHeight(c) - bar) * 1.0), -30, 18);
}

/** 회사 유형 난이도 + 직업군 적합도 + 직군 등급 + 신장 + 학위 보정 후 합격 확률(%) */
export function employmentChance(
  c: Character,
  family: JobFamilyKey | null,
  company: CompanyTypeKey,
): number {
  return clamp(
    employmentReadiness(c, family) +
      rarityHiringMod(family) +
      heightFitMod(c, family) +
      degreeHiringMod(c) +
      universityHiringMod(c) +
      COMPANY_TYPES[company].chanceMod +
      (family ? JOB_FAMILIES[family].hireMod : 0),
    15,
    92,
  );
}

/** rand(0~1) 주입 — 결정성/테스트. Math.random 은 store 에서만. floor 로 균등 분포. */
export function rollHire(
  chance: number,
  rand: number,
): { hired: boolean; roll: number } {
  const roll = Math.floor(rand * 100); // 0~99 균등
  return { hired: roll < chance, roll };
}

/** 취업 준비도 항목 (UI 표시용) */
export function employmentBreakdown(
  c: Character,
): { label: string; value: number }[] {
  return [
    { label: "학업", value: ci(c.stats.academic) },
    { label: "포트폴리오", value: ci(c.stats.portfolioScore) },
    { label: "면접", value: ci(c.stats.interviewScore) },
    { label: "자격증", value: ci(c.stats.certificateScore) },
    { label: "취업력", value: ci(c.stats.employability) },
    { label: "소통", value: ci(c.stats.communication) },
    { label: "자신감", value: c.status.confidence },
    { label: "건강", value: c.status.health },
  ];
}
