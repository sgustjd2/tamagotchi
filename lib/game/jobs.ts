import type {
  CharacterStats,
  CompanyTypeKey,
  JobFamilyKey,
  JobGrade,
} from "@/types/character";

export type JobRarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

export interface JobFamily {
  label: string;
  icon: string; // PixelIcon 이름
  coreStats: (keyof CharacterStats)[];
  statBar: number; // 합격 기준선(핵심 스탯 평균이 이보다 높을수록 유리)
  salaryMult: number; // 직무 연봉 배율
  rarity: JobRarity; // 직군 등급(높을수록 합격 확률 페널티 ↑ + 연봉·엔딩 가중) — employment.rarityHiringMod 참조
  riskLevel: number; // 직업 위험도(연간 사고/질병 확률 기여)
  heightBar?: number; // 선호 신장(cm) — 있으면 키가 클수록 합격 유리(employment.heightFitMod)
  hireMod: number; // 직군 자체 채용 난이도 보정 — 쉬운 직군(+) / 고경쟁 직군(−)
  desc: string;
}

export const JOB_FAMILIES: Record<JobFamilyKey, JobFamily> = {
  // 전문직·고난이도 (스탯 높아야 붙고, 연봉 높음)
  medical: { label: "전문직/의료", icon: "heart", coreStats: ["intelligence", "discipline", "memory"], statBar: 75, salaryMult: 1.5, rarity: "legendary", riskLevel: 0.025, hireMod: -5, desc: "고난이도·고연봉 전문직" },
  management: { label: "경영/전략", icon: "star", coreStats: ["careerPotential", "intelligence", "communication"], statBar: 62, salaryMult: 1.25, rarity: "epic", riskLevel: 0.018, hireMod: -3, desc: "기획·전략·리더십" },
  research: { label: "연구직", icon: "code", coreStats: ["intelligence", "memory", "creativity"], statBar: 65, salaryMult: 1.2, rarity: "epic", riskLevel: 0.012, hireMod: -3, desc: "연구·실험·논문" },
  data: { label: "데이터/AI", icon: "chart", coreStats: ["intelligence", "memory", "discipline"], statBar: 62, salaryMult: 1.25, rarity: "epic", riskLevel: 0.01, hireMod: 0, desc: "통계·모델링·인사이트" },
  finance: { label: "회계/재무", icon: "coin", coreStats: ["intelligence", "discipline", "memory"], statBar: 60, salaryMult: 1.2, rarity: "rare", riskLevel: 0.012, hireMod: 0, desc: "회계·재무·정확성" },
  legal: { label: "법무/컴플라이언스", icon: "resume", coreStats: ["intelligence", "discipline", "memory"], statBar: 60, salaryMult: 1.15, rarity: "rare", riskLevel: 0.01, hireMod: 0, desc: "법무·규정·정확성" },
  dev: { label: "개발/IT", icon: "code", coreStats: ["intelligence", "discipline", "creativity"], statBar: 58, salaryMult: 1.2, rarity: "rare", riskLevel: 0.012, hireMod: 0, desc: "코딩·설계·협업" },
  // 중간 난이도
  pm: { label: "기획/PM", icon: "star", coreStats: ["careerPotential", "communication", "creativity"], statBar: 50, salaryMult: 1.1, rarity: "uncommon", riskLevel: 0.014, hireMod: 3, desc: "기획·문서·실행" },
  civil: { label: "공무원", icon: "briefcase", coreStats: ["discipline", "intelligence"], statBar: 50, salaryMult: 0.95, rarity: "uncommon", riskLevel: 0.006, hireMod: 3, desc: "안정·정년보장·꾸준함" },
  marketing: { label: "마케팅/콘텐츠", icon: "chart", coreStats: ["creativity", "communication"], statBar: 45, salaryMult: 1.05, rarity: "uncommon", riskLevel: 0.014, hireMod: 5, desc: "마케팅·창의·트렌드" },
  design: { label: "디자인", icon: "palette", coreStats: ["creativity", "intelligence"], statBar: 45, salaryMult: 1.05, rarity: "uncommon", riskLevel: 0.012, hireMod: 5, desc: "감각·UX·디테일" },
  hr: { label: "인사/총무", icon: "heart", coreStats: ["communication", "discipline"], statBar: 42, salaryMult: 1.0, rarity: "common", riskLevel: 0.01, hireMod: 8, desc: "인사·운영·공감" },
  // 진입 쉬움 (낮은 스탯도 도전 가능, 연봉 낮음, 일부 위험)
  production: { label: "생산/품질/구매", icon: "exercise", coreStats: ["discipline", "fitness", "strength"], statBar: 35, salaryMult: 0.95, rarity: "common", riskLevel: 0.05, hireMod: 8, desc: "공정·품질·현장(위험)" },
  sales: { label: "영업/영업관리", icon: "bolt", coreStats: ["communication", "careerPotential"], statBar: 35, salaryMult: 1.0, rarity: "common", riskLevel: 0.03, hireMod: 12, desc: "영업·협상·외근" },
  cs: { label: "고객지원/CS", icon: "speech", coreStats: ["communication"], statBar: 28, salaryMult: 0.9, rarity: "common", riskLevel: 0.016, hireMod: 15, desc: "응대·공감·감정노동" },
  // 피지컬 스포츠 — 키가 클수록 유리(농구·배구 등). 부상 위험 ↑
  athlete: { label: "스포츠/운동선수", icon: "exercise", coreStats: ["fitness", "stamina", "strength", "discipline"], statBar: 48, salaryMult: 1.2, rarity: "rare", riskLevel: 0.03, heightBar: 183, hireMod: 0, desc: "농구·배구 등 피지컬 스포츠 (키·단련될수록 유리)" },
};

export const RARITY_META: Record<
  JobRarity,
  { label: string; cls: string; order: number }
> = {
  common: { label: "일반", cls: "text-ink/50", order: 0 },
  uncommon: { label: "고급", cls: "text-mint", order: 1 },
  rare: { label: "희귀", cls: "text-sky", order: 2 },
  epic: { label: "에픽", cls: "text-grape", order: 3 },
  legendary: { label: "전설", cls: "text-coral", order: 4 },
};

export interface CompanyType {
  label: string;
  icon: string;
  salaryMult: number;
  chanceMod: number; // employmentChance 보정(음수=어려움)
  desc: string;
}

export const COMPANY_TYPES: Record<CompanyTypeKey, CompanyType> = {
  large: { label: "대기업", icon: "briefcase", salaryMult: 1.3, chanceMod: -15, desc: "높은 초봉 · 높은 강도" },
  midsize: { label: "중견기업", icon: "briefcase", salaryMult: 1.1, chanceMod: -5, desc: "안정적" },
  small: { label: "중소기업", icon: "briefcase", salaryMult: 0.9, chanceMod: 8, desc: "빠른 성장 · 변동" },
  startup: { label: "스타트업", icon: "bolt", salaryMult: 1.05, chanceMod: -3, desc: "고성장 · 고리스크" },
  public: { label: "공공기관", icon: "star", salaryMult: 0.95, chanceMod: -12, desc: "안정 · 저성장" },
  freelance: { label: "프리랜서", icon: "folder", salaryMult: 0.85, chanceMod: 12, desc: "자유 · 수입 변동" },
};

// 승진 사다리 (단일 출처)
export const GRADE_ORDER: JobGrade[] = [
  "intern",
  "newbie",
  "staff",
  "junior",
  "assistant",
  "manager",
  "deputy",
  "director",
  "executive",
  "ceo",
];

export function nextGrade(g: JobGrade): JobGrade | null {
  const i = GRADE_ORDER.indexOf(g);
  return i >= 0 && i < GRADE_ORDER.length - 1 ? GRADE_ORDER[i + 1] : null;
}

export const BASE_SALARY: Record<JobGrade, number> = {
  intern: 2400,
  newbie: 3000,
  staff: 3600,
  junior: 4200,
  assistant: 5000,
  manager: 6200,
  deputy: 7500,
  director: 9000,
  executive: 12000,
  ceo: 20000,
};

export const GRADE_LABEL: Record<JobGrade, string> = {
  intern: "인턴",
  newbie: "신입",
  staff: "사원",
  junior: "주임",
  assistant: "대리",
  manager: "과장",
  deputy: "차장",
  director: "부장",
  executive: "임원",
  ceo: "대표",
};

export function gradeForScore(score: number): JobGrade {
  return score >= 75 ? "staff" : score >= 55 ? "newbie" : "intern";
}

/** 초봉(만원) = 직급 기본 × 회사 배율 × 직무 배율, 100만원 단위 반올림 */
export function startingSalary(
  grade: JobGrade,
  company: CompanyTypeKey,
  family?: JobFamilyKey,
): number {
  const famMult = family ? JOB_FAMILIES[family].salaryMult : 1;
  return (
    Math.round(
      (BASE_SALARY[grade] * COMPANY_TYPES[company].salaryMult * famMult) / 100,
    ) * 100
  );
}

export function jobTitle(family: JobFamilyKey, grade: JobGrade): string {
  return `${JOB_FAMILIES[family].label} ${GRADE_LABEL[grade]}`;
}
