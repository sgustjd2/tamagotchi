import type {
  Character,
  CharacterStats,
  CharacterStatus,
  LifeStage,
} from "./character";

/** 상태/스탯 변화량 (부분 적용) */
export type StatusDelta = Partial<CharacterStatus>;
export type StatsDelta = Partial<CharacterStats>;

export interface ActionEffect {
  status?: StatusDelta;
  stats?: StatsDelta;
  exp?: number;
  message?: string;
}

export type ActionKind = "instant" | "session" | "food";

export interface ActionDef {
  key: string;
  label: string; // 한글 표시명
  emoji: string;
  desc: string;
  kind: ActionKind;
  cooldownMs: number;
  sessionMs?: number; // session 액션의 집중 시간 (예: 30분)
  minStage?: LifeStage; // 이 단계부터 해금 (없으면 항상 가능)
  /** 상태에 영향을 받지 않는 기본 효과 계산 (instant 액션) */
  effect?: (c: Character) => ActionEffect;
  category: "care" | "study" | "fitness" | "selfdev" | "fun" | "rest";
}

/** 칼로리 등급 — 과식 페널티(체중 증가폭)와 UI 배지에 사용 */
export type CalorieTier = "low" | "medium" | "high";

export interface FoodDef {
  key: string;
  label: string;
  emoji: string;
  calorieTier: CalorieTier;
  /** 불량식품(정크푸드) — 과식 시 건강·기분 추가 페널티 */
  junk?: boolean;
  /** 식사가 아닌 음료(커피·에너지드링크 등) — 연간 "식사" 카운터에서 제외 */
  isDrink?: boolean;
  /** 이 단계부터 먹을 수 있음(없으면 항상 가능) — 아기 단계엔 분유만 허용 */
  minStage?: LifeStage;
  effect: ActionEffect; // status delta + message
}
