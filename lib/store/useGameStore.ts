"use client";

import { create } from "zustand";
import {
  createJSONStorage,
  persist,
  type StateStorage,
} from "zustand/middleware";

import type {
  AssetKey,
  Character,
  CharacterAppearance,
  CharacterStats,
  CompanyTypeKey,
  Gender,
  JobFamilyKey,
  JobOutcome,
  JobState,
  HousingOptionKey,
  NegotiationResult,
  RoomItemKey,
  UniversityTierKey,
  WardrobeItemKey,
  YearlyReview,
} from "@/types/character";
import { getAction, PREP_KEYS, WORK_KEYS } from "@/lib/game/actions";
import {
  actionStateForActionKey,
  type ActionState,
} from "@/lib/game/sprite/characterVisualState";
import { createCharacter } from "@/lib/game/character";
import {
  ALLOCATABLE_STATS,
  allocateStatPoint,
  STAT_POINTS_PER_LEVEL,
} from "@/lib/game/statPoints";
import {
  COOLDOWN_SCALE,
  FOODS,
  GAME_YEAR_MS,
  NEGLECT_DEATH_MS,
  OFFLINE_DECAY_CAP_MS,
  OVEREAT_EXTRA_WEIGHT_BY_TIER,
  OVEREAT_HUNGER_THRESHOLD,
} from "@/lib/game/constants";
import { applyEffect, isActionReady, setCooldown } from "@/lib/game/engine";
import { isActionUnlocked, isStageUnlocked } from "@/lib/game/gating";
import {
  rollOutcome,
  scaleStatsDelta,
  type ActionOutcome,
  type OutcomeTier,
} from "@/lib/game/outcome";
import { runDueReviews } from "@/lib/game/review";
import {
  employmentChance,
  employmentReadiness,
  rollHire,
} from "@/lib/game/employment";
import { canNegotiate, negotiate } from "@/lib/game/negotiate";
import { formatMoney } from "@/lib/game/ending";
import {
  canChooseUniversity,
  UNIVERSITY_TIERS,
  universitySalaryMult,
} from "@/lib/game/university";
import { rollAppearance } from "@/lib/game/sprite/characterAppearance";
import { degreeSalaryMult, gradAdmission } from "@/lib/game/degree";
import { gradeForScore, jobTitle, startingSalary } from "@/lib/game/jobs";
import { applyDecay } from "@/lib/game/status";
import {
  StudyResult,
  buildStudySession,
  computeStudyResult,
  isStudyReady,
} from "@/lib/game/study";
import { canDoLeisure, leisureCooldownKey, leisureDef } from "@/lib/game/leisure";
import { formatEffect } from "@/lib/game/effectLabel";
import {
  canPlayMinigame,
  LUCK_CAP,
  LUCK_PER_PLAY,
  playDarts,
  playFishing,
  playGacha,
  playRoulette,
  playRps,
  playSlots,
  playTiming,
  type MinigameKind,
  type RpsChoice,
} from "@/lib/game/minigame";
import {
  canPullGacha,
  GACHA_CONFIG,
  pullShopGacha,
  type GachaCategory,
} from "@/lib/game/shopGacha";
import { wardrobeDef } from "@/lib/game/wardrobe";
import { applyMove, housingDef, planMove } from "@/lib/game/housing";
import {
  canStartSecondGen,
  inheritanceAmount,
  inheritedStatBonus,
  nextGenName,
} from "@/lib/game/legacy";
import { getOrCreateUserId } from "@/lib/storage/local";

export interface ActionResult {
  ok: boolean;
  message: string;
}

interface GameState {
  character: Character | null;
  hydrated: boolean;
  /** UI 토스트용: 마지막 메시지와 토큰(애니메이션 트리거) */
  toast: { message: string; token: number } | null;
  /** 아직 확인하지 않은 연간 리뷰 모달 큐 (비영속) */
  pendingReviews: YearlyReview[];
  /** 취업 지원 결과 모달 (비영속) */
  jobResult: JobOutcome | null;
  /** 연봉협상 결과 모달 (비영속) */
  negotiationResult: NegotiationResult | null;
  /** 대성공/잭팟 연출 트리거 (비영속) */
  outcomeFx: { tier: OutcomeTier; label: string; token: number } | null;
  /** 캐릭터 반응 포즈 펄스 (비영속) — 액션을 누르면 잠깐 그 행동 포즈를 취함 */
  charAction: { state: ActionState; token: number } | null;

  setHydrated: () => void;
  createNew: (
    name: string,
    color: string,
    gender: Gender,
    appearance?: CharacterAppearance,
  ) => void;
  reset: () => void;

  tick: () => void;
  feed: (foodKey: string) => ActionResult;
  doAction: (key: string) => ActionResult;
  startStudy: () => ActionResult;
  completeStudy: () => StudyResult | null;
  cancelStudy: () => void;
  addHiddenMs: (ms: number) => void;
  ackReview: () => void;
  ackAllReviews: () => void;
  applyForJob: (family: JobFamilyKey, company: CompanyTypeKey) => ActionResult;
  ackJobResult: () => void;
  negotiateSalary: () => ActionResult;
  ackNegotiation: () => void;
  enrollGrad: () => ActionResult;
  dropGrad: () => ActionResult;
  allocateStat: (statKey: keyof CharacterStats) => ActionResult;
  chooseUniversity: (tier: UniversityTierKey) => ActionResult;
  doLeisure: (key: string) => ActionResult;
  playMinigame: (
    kind: MinigameKind,
    extra?: { choice?: RpsChoice; accuracy?: number },
  ) => ActionResult;
  pullGacha: (category: GachaCategory) => ActionResult;
  equipWardrobe: (kind: "outfit" | "accessory", key: WardrobeItemKey | null) => ActionResult;
  moveHousing: (key: HousingOptionKey) => ActionResult;
  startSecondGeneration: () => ActionResult;
}

const now = () => Date.now();
const HOUR = 60 * 60 * 1000;
/** 쿨타임 배율 적용 */
const cd = (ms: number) => Math.round(ms * COOLDOWN_SCALE);

/** 모달로 띄울 만한 마일스톤 리뷰인지 (단계전환/승진/시험/S·D/방치) */
function isMilestone(
  review: YearlyReview,
  allReviews: YearlyReview[],
): boolean {
  if (
    review.kind === "neglected" ||
    review.exam ||
    review.work?.promoted ||
    review.event ||
    review.incident ||
    review.death ||
    review.degreeChange ||
    review.grade === "S" ||
    review.grade === "D"
  ) {
    return true;
  }
  const i = allReviews.findIndex((r) => r.id === review.id);
  const prevStage = i > 0 ? allReviews[i - 1].stage : review.stage;
  return review.stage !== prevStage;
}

// 서버(SSR)에서는 localStorage 가 없으므로 안전한 no-op 스토리지를 사용
const noopStorage: StateStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

const browserStorage = createJSONStorage(() =>
  typeof window !== "undefined" ? window.localStorage : noopStorage,
);

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => {
      const pushToast = (message: string) =>
        set((s) => ({ toast: { message, token: (s.toast?.token ?? 0) + 1 } }));

      // 대성공/잭팟이면 화면 연출 트리거(토스트 외 보이는 도파민)
      const fireFx = (o: ActionOutcome | null) => {
        if (!o || (o.tier !== "jackpot" && o.tier !== "great")) return;
        set((s) => ({
          outcomeFx: { tier: o.tier, label: o.label, token: (s.outcomeFx?.token ?? 0) + 1 },
        }));
      };

      // 액션 누르면 캐릭터가 잠깐 그 행동 포즈를 취하도록 펄스
      const pulseAction = (state: ActionState) =>
        set((s) => ({
          charAction: { state, token: (s.charAction?.token ?? 0) + 1 },
        }));

      // 레벨업 시 토스트 메시지에 덧붙일 안내(스탯 포인트 지급) — 토스트는 한 번에 하나뿐이라 합쳐서 표시
      const levelUpSuffix = (before: Character, after: Character): string => {
        if (after.level <= before.level) return "";
        const gained = (after.level - before.level) * STAT_POINTS_PER_LEVEL;
        return ` 🎉 레벨 업! Lv.${after.level} (스탯 포인트 +${gained})`;
      };

      return {
        character: null,
        hydrated: false,
        toast: null,
        pendingReviews: [],
        jobResult: null,
        negotiationResult: null,
        outcomeFx: null,
        charAction: null,

        setHydrated: () => set({ hydrated: true }),

      createNew: (name, color, gender, appearance) => {
        const userId = getOrCreateUserId();
        set({
          character:
            appearance !== undefined
              ? createCharacter(userId, name, color, gender, now(), appearance)
              : createCharacter(userId, name, color, gender, now()),
          pendingReviews: [],
          jobResult: null,
          negotiationResult: null,
          toast: null,
        });
      },

      reset: () =>
        set({
          character: null,
          toast: null,
          pendingReviews: [],
          jobResult: null,
          negotiationResult: null,
        }),

      tick: () => {
        const c = get().character;
        if (!c) return;
        if (c.deathAge != null) return; // 사망 시 상태 동결(엔딩)

        // 방치 사망: NEGLECT_DEATH_MS 이상 앱을 열지 않은 경우
        // applyDecay 이전에 체크하여 시간 점프 없이 방치 사망으로 처리
        const elapsed = now() - c.lastTickAt;
        if (elapsed > NEGLECT_DEATH_MS) {
          set({
            character: {
              ...c,
              deathAge: c.ageYears,
              deathCause: "방치",
            },
          });
          return;
        }

        // 오프라인 복귀 정산: 감쇠는 캡까지만 적용해 "자리 비움 → 굶주림 즉사"를 막는다
        // (나이는 bornAt 기준이라 실시간 유지, 방치 사망 규칙은 위에서 이미 처리됨)
        const decayBase =
          elapsed > OFFLINE_DECAY_CAP_MS
            ? { ...c, lastTickAt: now() - OFFLINE_DECAY_CAP_MS }
            : c;
        const decayed = applyDecay(decayBase, now());

        // 10분 이상 자리 비웠다면 복귀 요약 토스트 1건
        if (elapsed >= 10 * 60 * 1000) {
          const dHunger = Math.round(c.status.hunger - decayed.status.hunger);
          const dEnergy = Math.round(c.status.energy - decayed.status.energy);
          const awayMin = Math.round(elapsed / 60000);
          const away =
            awayMin >= 60 ? `${Math.floor(awayMin / 60)}시간 ${awayMin % 60}분` : `${awayMin}분`;
          pushToast(`⏰ 자리 비운 ${away} — 배고픔 -${dHunger} · 체력 -${dEnergy}`);
        }

        // 굶주림 사망: 배고픔이 0 이하로 떨어지면 즉사
        if (decayed.status.hunger <= 0) {
          set({
            character: {
              ...decayed,
              deathAge: decayed.ageYears,
              deathCause: "굶주림",
            },
          });
          return;
        }

        const { character, reviews } = runDueReviews(decayed, now());

        // 레벨업/저축 변동 알림(한 tick 에 둘 다 나면 토스트 하나로 합침)
        const toastParts: string[] = [];
        if (character.level > c.level) {
          const gained = (character.level - c.level) * STAT_POINTS_PER_LEVEL;
          toastParts.push(`🎉 레벨 업! Lv.${character.level} (스탯 포인트 +${gained})`);
        }
        const savingsDelta = reviews.reduce((sum, r) => sum + r.savingsDelta, 0);
        if (savingsDelta !== 0) {
          const sign = savingsDelta > 0 ? "+" : "";
          toastParts.push(`💰 저축 ${sign}${formatMoney(savingsDelta)}`);
        }
        if (toastParts.length > 0) pushToast(toastParts.join(" · "));

        if (reviews.length > 0) {
          set((s) => {
            const existing = new Set(s.pendingReviews.map((r) => r.id));
            // 마일스톤만 모달로 (평범한 해는 성장기록에만 — 9분/년이라 매년 팝업하면 피곤)
            const fresh = reviews.filter(
              (r) => !existing.has(r.id) && isMilestone(r, character.reviews),
            );
            return { character, pendingReviews: [...s.pendingReviews, ...fresh] };
          });
        } else {
          set({ character });
        }
      },

      feed: (foodKey) => {
        const c = get().character;
        if (!c) return { ok: false, message: "캐릭터가 없어요." };
        const t = now();
        if (!isActionReady(c, "feed", t)) {
          return { ok: false, message: "아직 배가 불러요. 잠시 후에 주세요." };
        }
        const food = FOODS.find((f) => f.key === foodKey);
        if (!food) return { ok: false, message: "알 수 없는 음식이에요." };
        if (!isStageUnlocked(food.minStage, c.lifeStage)) {
          return { ok: false, message: "아직 먹을 수 없는 음식이에요." };
        }

        let next = applyEffect(c, food.effect);
        let shownEffect = food.effect; // 토스트에 보여줄 실제 적용 효과

        // 과식 처리: 이미 배부른 상태에서 또 먹으면 체중 추가 증가(칼로리 등급이 높을수록 크게)
        let message = food.effect.message ?? "잘 먹었어요!";
        if (c.status.hunger >= OVEREAT_HUNGER_THRESHOLD) {
          const extra = {
            weight: OVEREAT_EXTRA_WEIGHT_BY_TIER[food.calorieTier],
            mood: food.junk ? 1 : 2,
            health: food.junk ? -1.5 : 0,
          };
          next = applyEffect(next, { status: extra });
          // 과식 페널티까지 합산한 수치를 토스트에 표시
          const merged: Record<string, number> = {
            ...(food.effect.status as Record<string, number> | undefined),
          };
          for (const [k, v] of Object.entries(extra)) {
            merged[k] = (merged[k] ?? 0) + v;
          }
          shownEffect = {
            ...food.effect,
            status: merged as typeof food.effect.status,
          };
          message = food.junk
            ? "불량식품을 과식했어요! 살도 찌고 속도 안 좋아요…"
            : "과식했어요! 살이 조금 더 붙었어요.";
        }

        const isMeal = !food.isDrink;
        next = {
          ...next,
          cooldowns: setCooldown(next, "feed", t, cd(getAction("feed")!.cooldownMs)),
          yearCounters: {
            ...next.yearCounters,
            meals: next.yearCounters.meals + (isMeal ? 1 : 0),
          },
        };

        set({ character: next });
        const feedDetail = formatEffect(shownEffect);
        pushToast(
          message + (feedDetail ? ` (${feedDetail})` : "") + levelUpSuffix(c, next),
        );
        pulseAction("playing"); // 냠냠 반응
        return { ok: true, message };
      },

      doAction: (key) => {
        const c = get().character;
        if (!c) return { ok: false, message: "캐릭터가 없어요." };
        const def = getAction(key);
        if (!def || def.kind !== "instant" || !def.effect) {
          return { ok: false, message: "지원하지 않는 액션이에요." };
        }
        if (!isActionUnlocked(key, c.lifeStage)) {
          return { ok: false, message: "아직 이 단계에서는 할 수 없어요." };
        }
        if (WORK_KEYS.has(key) && !c.job) {
          return { ok: false, message: "취업 후에 할 수 있어요." };
        }
        const t = now();
        if (!isActionReady(c, key, t)) {
          return { ok: false, message: "아직 쿨타임이에요." };
        }

        // 능력치 활동이면 확률로 상승폭 변동(대성공/부진, 컨디션 연동)
        const baseEffect = def.effect(c);
        let outcome: ActionOutcome | null = null;
        let effect = baseEffect;
        if (baseEffect.stats && Object.keys(baseEffect.stats).length > 0) {
          outcome = rollOutcome(c, Math.random());
          effect = { ...baseEffect, stats: scaleStatsDelta(baseEffect.stats, outcome.mult) };
        }
        let next = applyEffect(c, effect);

        // 액션별 부가 처리
        const counters = { ...next.yearCounters };
        let lastExerciseAt = next.lastExerciseAt;
        if (key === "cardio" || key === "strength") {
          counters.exercise += 1;
          lastExerciseAt = t;
        } else if (
          key === "selfDev" ||
          key === "read" ||
          key === "workSelfDev" ||
          PREP_KEYS.has(key)
        ) {
          counters.selfDev += 1;
        }

        next = {
          ...next,
          lastExerciseAt,
          yearCounters: counters,
          cooldowns: setCooldown(next, key, t, cd(def.cooldownMs)),
        };

        set({ character: next });
        const baseMsg = baseEffect.message ?? `${def.label} 완료!`;
        const message =
          outcome && outcome.tier !== "good" ? `${outcome.label} ${baseMsg}` : baseMsg;
        // 실제 적용된 변화량(대성공 배수 반영)을 토스트에 함께 표시
        const detail = formatEffect(effect);
        pushToast(message + (detail ? ` (${detail})` : "") + levelUpSuffix(c, next));
        fireFx(outcome);
        pulseAction(actionStateForActionKey(key)); // 누른 행동에 맞는 포즈
        return { ok: true, message };
      },

      startStudy: () => {
        const c = get().character;
        if (!c) return { ok: false, message: "캐릭터가 없어요." };
        if (c.activeSession) {
          return { ok: false, message: "이미 공부 중이에요." };
        }
        if (!isActionUnlocked("study", c.lifeStage)) {
          return { ok: false, message: "아직 공부할 단계가 아니에요." };
        }
        const def = getAction("study")!;
        const t = now();
        if (!isActionReady(c, "study", t)) {
          return { ok: false, message: "아직 공부 쿨타임이에요." };
        }
        const sessionMs = cd(def.sessionMs ?? 30 * 60 * 1000);
        const session = buildStudySession(t, sessionMs);
        set({ character: { ...c, activeSession: session } });
        pulseAction("studying");
        return {
          ok: true,
          message: `공부를 시작했어요. ${Math.round(sessionMs / 1000)}초 집중!`,
        };
      },

      completeStudy: () => {
        const c = get().character;
        if (!c || !c.activeSession) return null;
        const t = now();
        if (!isStudyReady(c.activeSession, t)) return null;

        const result = computeStudyResult(c, c.activeSession, t);
        const outcome = rollOutcome(c, Math.random(), true); // 완만(공부는 이미 시간/효율 배수)
        const scaledEffect = {
          ...result.effect,
          stats: scaleStatsDelta(result.effect.stats, outcome.mult),
        };
        let next = applyEffect(c, scaledEffect);
        next = {
          ...next,
          activeSession: null,
          // 세션 종료 후 다음 공부까지 쿨타임(연타 방지) — feed/doAction 과 동일 컨벤션
          cooldowns: setCooldown(next, "study", t, cd(getAction("study")!.cooldownMs)),
          yearCounters: {
            ...next.yearCounters,
            study: next.yearCounters.study + 1,
          },
        };
        set({ character: next });
        const baseMsg = result.effect.message ?? "공부 완료!";
        pushToast(
          (outcome.tier !== "good" ? `${outcome.label} ${baseMsg}` : baseMsg) +
            levelUpSuffix(c, next),
        );
        fireFx(outcome);
        return result;
      },

      cancelStudy: () => {
        const c = get().character;
        if (!c) return;
        set({ character: { ...c, activeSession: null } });
        pushToast("공부를 중단했어요.");
      },

      addHiddenMs: (ms) => {
        const c = get().character;
        if (!c || !c.activeSession) return;
        set({
          character: {
            ...c,
            activeSession: {
              ...c.activeSession,
              hiddenMs: c.activeSession.hiddenMs + ms,
            },
          },
        });
      },

      ackReview: () =>
        set((s) => ({ pendingReviews: s.pendingReviews.slice(1) })),

      ackAllReviews: () => set({ pendingReviews: [] }),

      applyForJob: (family, company) => {
        const c = get().character;
        if (!c) return { ok: false, message: "캐릭터가 없어요." };
        if (c.lifeStage !== "jobseeker" || c.job) {
          return { ok: false, message: "지금은 취업 지원 단계가 아니에요." };
        }
        if (c.gradEnroll) {
          return { ok: false, message: "대학원 재학 중에는 지원할 수 없어요. 졸업 후에!" };
        }
        const t = now();
        if (!isActionReady(c, "jobApply", t)) {
          return { ok: false, message: "아직 지원 쿨타임이에요." };
        }
        const chance = employmentChance(c, family, company);
        const { hired, roll } = rollHire(chance, Math.random());

        if (hired) {
          const grade = gradeForScore(employmentReadiness(c, family));
          // 학위 + 출신 대학 보너스 반영(석/박사·명문대일수록 초봉 ↑), 100만원 단위 반올림
          const salary =
            Math.round(
              (startingSalary(grade, company, family) *
                degreeSalaryMult(c) *
                universitySalaryMult(c)) /
                100,
            ) * 100;
          const job: JobState = {
            family,
            company,
            grade,
            title: jobTitle(family, grade),
            salaryManwon: salary,
            hiredAt: t,
            hiredAtAge: c.ageYears,
          };
          let next = applyEffect(c, {
            status: { confidence: 8, mood: 10, stress: -5 },
            stats: { careerPotential: 3, employability: 2 },
            exp: 80,
          });
          next = {
            ...next,
            job,
            jobApplications: c.jobApplications + 1,
            cooldowns: setCooldown(next, "jobApply", t, cd(HOUR)),
          };
          set({
            character: next,
            jobResult: { success: true, family, company, chance, roll, job },
          });
          pushToast("합격! 출근을 준비해요." + levelUpSuffix(c, next));
          return { ok: true, message: "합격!" };
        }

        let next = applyEffect(c, {
          status: { stress: 10, confidence: -5, mood: -6 },
          stats: { careerPotential: 1 },
        });
        next = {
          ...next,
          jobApplications: c.jobApplications + 1,
          cooldowns: setCooldown(next, "jobApply", t, cd(HOUR)),
        };
        set({
          character: next,
          jobResult: { success: false, family, company, chance, roll },
        });
        pushToast("아쉽게 불합격… 다시 도전해요.");
        return { ok: true, message: "불합격" };
      },

      ackJobResult: () => set({ jobResult: null }),

      negotiateSalary: () => {
        const c = get().character;
        if (!c) return { ok: false, message: "캐릭터가 없어요." };
        const gate = canNegotiate(c);
        if (!gate.ok) {
          return { ok: false, message: gate.reason ?? "지금은 협상할 수 없어요." };
        }
        const result = negotiate(c, Math.random(), Math.random());
        const job = c.job!;
        let next: Character;
        if (result.outcome === "success") {
          next = applyEffect(c, { status: { confidence: 6, mood: 5 } });
          next = {
            ...next,
            job: {
              ...job,
              salaryManwon: result.salaryAfter,
              lastNegotiatedAtAge: c.ageYears,
              lastNegotiatePct: result.raisePct,
            },
          };
          pushToast(`연봉협상 성공! +${result.raisePct}%`);
        } else if (result.outcome === "backfire") {
          next = applyEffect(c, {
            status: { confidence: -6, stress: 10 },
            stats: { careerPotential: -1 },
          });
          next = {
            ...next,
            job: { ...job, lastNegotiatedAtAge: c.ageYears },
            negotiateBackfire: true,
          };
          pushToast("협상이 역효과를 냈어요…");
        } else {
          next = applyEffect(c, {
            status: { confidence: -3, stress: 6, mood: -3 },
          });
          next = { ...next, job: { ...job, lastNegotiatedAtAge: c.ageYears } };
          pushToast("협상 결렬… 내년에 다시.");
        }
        set({ character: next, negotiationResult: result });
        return { ok: true, message: result.outcome };
      },

      ackNegotiation: () => set({ negotiationResult: null }),

      enrollGrad: () => {
        const c = get().character;
        if (!c) return { ok: false, message: "캐릭터가 없어요." };
        if (c.deathAge != null) return { ok: false, message: "이미 생을 마쳤어요." };
        const adm = gradAdmission(c);
        if (!adm.ok || !adm.target) {
          return { ok: false, message: adm.reason ?? "지금은 진학할 수 없어요." };
        }
        const target = adm.target;
        set({
          character: { ...c, gradEnroll: { degree: target, startAge: c.ageYears } },
        });
        pushToast(
          target === "master"
            ? "석사 과정 입학! 대학원 노예 라이프 시작…"
            : "박사 과정 입학! 끝까지 버텨봐요.",
        );
        return { ok: true, message: "입학" };
      },

      dropGrad: () => {
        const c = get().character;
        if (!c || c.deathAge != null || !c.gradEnroll) {
          return { ok: false, message: "대학원 재학 중이 아니에요." };
        }
        set({ character: { ...c, gradEnroll: null } });
        pushToast("대학원을 자퇴했어요. 학위는 이전 단계로 남아요.");
        return { ok: true, message: "자퇴" };
      },

      allocateStat: (statKey) => {
        const c = get().character;
        if (!c) return { ok: false, message: "캐릭터가 없어요." };
        if (c.statPoints <= 0) {
          return { ok: false, message: "사용할 수 있는 스탯 포인트가 없어요." };
        }
        const next = allocateStatPoint(c, statKey);
        set({ character: next });
        const label = ALLOCATABLE_STATS.find((s) => s.key === statKey)?.label ?? statKey;
        pushToast(`${label} +1!`);
        return { ok: true, message: "배분 완료" };
      },

      chooseUniversity: (tier) => {
        const c = get().character;
        if (!c) return { ok: false, message: "캐릭터가 없어요." };
        if (!canChooseUniversity(c)) {
          return { ok: false, message: "지금은 대학을 선택할 수 없어요." };
        }
        const bar = UNIVERSITY_TIERS[tier].academicBar;
        if (c.stats.academic < bar) {
          return {
            ok: false,
            message: `학업 ${bar} 이상 필요해요. (현재 ${Math.round(c.stats.academic)})`,
          };
        }
        set({
          character: {
            ...c,
            university: { tier, enrolledAtAge: c.ageYears, loanBalance: 0 },
          },
        });
        pushToast(`${UNIVERSITY_TIERS[tier].label} 입학!`);
        return { ok: true, message: "입학" };
      },

      pullGacha: (category) => {
        const c = get().character;
        if (!c) return { ok: false, message: "캐릭터가 없어요." };
        if (c.deathAge != null) return { ok: false, message: "이미 생을 마쳤어요." };
        const gate = canPullGacha(c, category);
        if (!gate.ok) return { ok: false, message: gate.reason ?? "지금은 뽑을 수 없어요." };
        const conf = GACHA_CONFIG[category];
        const pull = pullShopGacha(c, category, Math.random(), Math.random())!;

        // 뽑기 설렘 + 행운 적립(미니게임과 동일 규칙)
        let next = applyEffect(c, {
          status:
            category === "car"
              ? { mood: 8, confidence: 4 }
              : { mood: 4, confidence: 2 },
          stats: { luck: c.stats.luck < LUCK_CAP ? LUCK_PER_PLAY : 0 },
        });
        next = {
          ...next,
          savings: next.savings - conf.price,
          happiness: Math.min(100, next.happiness + (category === "car" ? 2 : 1)),
        };
        if (category === "wardrobe") {
          const key = pull.item.key as WardrobeItemKey;
          const def = wardrobeDef(key)!;
          next = {
            ...next,
            wardrobe: [...next.wardrobe, key],
            // 새 옷은 바로 입어보는 게 국룰
            ...(def.kind === "outfit"
              ? { equippedOutfit: key }
              : { equippedAccessory: key }),
          };
        } else if (category === "room") {
          next = { ...next, roomItems: [...next.roomItems, pull.item.key as RoomItemKey] };
        } else {
          next = { ...next, assets: [...next.assets, pull.item.key as AssetKey] };
        }
        set({ character: next });

        const profit = pull.item.price > conf.price ? ` 정가 ${formatMoney(pull.item.price)} — 이득!` : "";
        pushToast(
          `${conf.emoji} 뽑기 결과: ${pull.item.emoji} ${pull.item.label} 당첨!${profit} (-${formatMoney(conf.price)})` +
            levelUpSuffix(c, next),
        );
        if (pull.rare) {
          fireFx({ tier: "great", mult: 1, label: `✨ ${pull.item.label}!` });
        }
        pulseAction("playing");
        return { ok: true, message: pull.item.label };
      },

      doLeisure: (key) => {
        const c = get().character;
        if (!c) return { ok: false, message: "캐릭터가 없어요." };
        if (c.deathAge != null) return { ok: false, message: "이미 생을 마쳤어요." };
        const t = now();
        const gate = canDoLeisure(c, key, t);
        if (!gate.ok) return { ok: false, message: gate.reason ?? "지금은 할 수 없어요." };
        const def = leisureDef(key)!;
        let next = applyEffect(c, def.effect);
        next = {
          ...next,
          savings: c.savings - def.cost,
          happiness: Math.min(100, c.happiness + def.happinessDelta),
          cooldowns: setCooldown(next, leisureCooldownKey(key), t, cd(def.cooldownMs)),
        };
        set({ character: next });
        const leisureDetail = formatEffect(def.effect);
        pushToast(
          `${def.emoji} ${def.effect.message ?? `${def.label} 완료!`} (-${formatMoney(def.cost)}${leisureDetail ? ` · ${leisureDetail}` : ""})` +
            levelUpSuffix(c, next),
        );
        pulseAction("playing");
        return { ok: true, message: "여가 완료" };
      },

      playMinigame: (kind, extra) => {
        const c = get().character;
        if (!c) return { ok: false, message: "캐릭터가 없어요." };
        if (c.deathAge != null) return { ok: false, message: "이미 생을 마쳤어요." };
        const gate = canPlayMinigame(c);
        if (!gate.ok) return { ok: false, message: gate.reason ?? "지금은 할 수 없어요." };
        const result =
          kind === "slots" ? playSlots(c, Math.random())
          : kind === "gacha" ? playGacha(c, Math.random(), Math.random())
          : kind === "roulette" ? playRoulette(c, Math.random())
          : kind === "fishing" ? playFishing(c, Math.random())
          : kind === "darts" ? playDarts(c, Math.random())
          : kind === "rps" ? playRps(c, extra?.choice ?? "rock", Math.random())
          : playTiming(c, extra?.accuracy ?? 0);
        let next = applyEffect(c, result.effect);
        next = {
          ...next,
          savings: next.savings + result.savingsDelta,
          statPoints: next.statPoints + result.statPointsDelta,
        };
        set({ character: next });
        const message = result.effect.message ?? "미니게임 완료!";
        const detail = formatEffect(result.effect);
        pushToast(message + (detail ? ` (${detail})` : "") + levelUpSuffix(c, next));
        if (result.fx) {
          set((s) => ({
            outcomeFx: {
              tier: result.fx!.tier,
              label: result.fx!.label,
              token: (s.outcomeFx?.token ?? 0) + 1,
            },
          }));
        }
        pulseAction("playing");
        return { ok: true, message };
      },

      equipWardrobe: (kind, key) => {
        const c = get().character;
        if (!c) return { ok: false, message: "캐릭터가 없어요." };
        if (key != null && !c.wardrobe.includes(key)) {
          return { ok: false, message: "가지고 있지 않은 아이템이에요." };
        }
        if (key != null && wardrobeDef(key)?.kind !== kind) {
          return { ok: false, message: "부위가 맞지 않아요." };
        }
        set({
          character: {
            ...c,
            ...(kind === "outfit" ? { equippedOutfit: key } : { equippedAccessory: key }),
          },
        });
        if (key != null) {
          const def = wardrobeDef(key)!;
          pushToast(`${def.emoji} ${def.label}${kind === "outfit" ? "을(를) 입었어요!" : " 착용!"}`);
        } else {
          pushToast(kind === "outfit" ? "기본 복장으로 돌아왔어요." : "액세서리를 뺐어요.");
        }
        return { ok: true, message: "착용 변경" };
      },

      moveHousing: (key) => {
        const c = get().character;
        if (!c) return { ok: false, message: "캐릭터가 없어요." };
        if (c.deathAge != null) return { ok: false, message: "이미 생을 마쳤어요." };
        const plan = planMove(c, key);
        if (!plan.ok) return { ok: false, message: plan.reason ?? "이사할 수 없어요." };
        const def = housingDef(key);
        let next = applyMove(c, key);
        next = applyEffect(next, { status: { mood: 8, energy: -5 } }); // 이사는 설레지만 힘들다
        next = { ...next, happiness: Math.min(100, next.happiness + 2) };
        set({ character: next });
        pushToast(
          plan.loan > 0
            ? `${def.emoji} ${def.label}(으)로 이사! 대출 ${formatMoney(plan.loan)}과 함께 새 출발.`
            : `${def.emoji} ${def.label}(으)로 이사 완료! 내 돈으로 당당하게.`,
        );
        pulseAction("playing");
        return { ok: true, message: "이사 완료" };
      },

      startSecondGeneration: () => {
        const c = get().character;
        if (!c) return { ok: false, message: "캐릭터가 없어요." };
        if (!canStartSecondGen(c)) {
          return { ok: false, message: "자녀가 있을 때만 2세대를 시작할 수 있어요." };
        }
        const userId = getOrCreateUserId();
        const inherited = inheritanceAmount(c);
        const gender: Gender = Math.random() < 0.5 ? "male" : "female";
        const base = createCharacter(userId, nextGenName(c), c.color, gender, now());
        const child: Character = {
          ...base,
          savings: inherited,
          stats: { ...base.stats, ...inheritedStatBonus(c.stats) },
          generation: (c.generation ?? 1) + 1,
          legacy: { parentName: c.name, inheritedManwon: inherited },
        };
        set({
          character: child,
          pendingReviews: [],
          jobResult: null,
          negotiationResult: null,
          toast: null,
        });
        pushToast(
          `👶 ${child.name} 탄생! ${c.name}의 유산 ${formatMoney(inherited)}과 재능을 물려받았어요.`,
        );
        return { ok: true, message: "2세대 시작" };
      },
      };
    },
    {
      name: "lifegotchi:character",
      version: 19,
      storage: browserStorage,
      // 첫 클라이언트 렌더가 서버 렌더와 일치하도록 자동 하이드레이션을 끄고
      // StoreHydrator 에서 마운트 후 수동으로 rehydrate 한다.
      skipHydration: true,
      partialize: (s) => ({ character: s.character }),
      // 구버전 세이브 호환(필드 누락 보정). 항상 ?? 로 보정하므로 idempotent.
      migrate: (persisted) => {
        const stored = (persisted ?? {}) as { character?: Character | null };
        const c = stored.character;
        if (!c) return { character: null } as unknown as GameState;
        const gender: Gender = c.gender === "female" ? "female" : "male";
        const merged: Character = {
          ...c,
          color: c.color || "blush",
          gender,
          // 구버전 세이브: 성별 평균 키로 보정(결정적)
          heightPotential: c.heightPotential ?? (gender === "female" ? 162 : 175),
          // 학위: 구버전은 나이로 추정(취준생 이상이면 학사)
          degree: c.degree ?? ((c.ageYears ?? 0) >= 25 ? "bachelor" : "highschool"),
          gradEnroll: c.gradEnroll ?? null,
          university: c.university ?? null,
          avatar: c.avatar || "🐣",
          appearance: c.appearance ?? rollAppearance(),
          statPoints: c.statPoints ?? 0,
          stats: {
            ...c.stats,
            academic: c.stats?.academic ?? 5,
            portfolioScore: c.stats?.portfolioScore ?? 0,
            interviewScore: c.stats?.interviewScore ?? 0,
            certificateScore: c.stats?.certificateScore ?? 0,
            performance: c.stats?.performance ?? 0,
            // 유산소/근력 분리(구버전은 fitness 값을 물려받아 시작, 없으면 5)
            stamina: c.stats?.stamina ?? c.stats?.fitness ?? 5,
            strength: c.stats?.strength ?? c.stats?.fitness ?? 5,
            // v19: 행운 스탯(미니게임)
            luck: c.stats?.luck ?? 5,
          },
          reviews: c.reviews ?? [],
          // 기존 값 보존(없는 구버전 세이브만 ageYears 로 폴백 → 리뷰 폭탄 방지)
          lastReviewedAge: c.lastReviewedAge ?? c.ageYears ?? 0,
          job: c.job ?? null,
          jobApplications: c.jobApplications ?? 0,
          savings: c.savings ?? 0,
          roomItems: c.roomItems ?? [],
          // v18: 구버전 home 자산 → 주거 시스템으로 이관, assets 는 자동차만 유지
          assets: ((c.assets ?? []) as string[]).filter((a) =>
            a.startsWith("car"),
          ) as Character["assets"],
          housing:
            c.housing ??
            (() => {
              const old = (c.assets ?? []) as string[];
              if (old.includes("homeRiver"))
                return { option: "aptRiver" as const, deposit: 0, loanBalance: 0, homeValue: 200000 };
              if (old.includes("homeOwned"))
                // 구버전 매입가(8억)를 시세로 보존 — 현행 정가(6억)로 낮추면 마이그레이션만으로 순자산이 깎임
                return { option: "aptOwned" as const, deposit: 0, loanBalance: 0, homeValue: 80000 };
              if (old.includes("homeJeonse"))
                return { option: "jeonseOfficetel" as const, deposit: 30000, loanBalance: 0, homeValue: 0 };
              return { option: "parents" as const, deposit: 0, loanBalance: 0, homeValue: 0 };
            })(),
          wardrobe: c.wardrobe ?? [],
          equippedOutfit: c.equippedOutfit ?? null,
          equippedAccessory: c.equippedAccessory ?? null,
          happiness: c.happiness ?? 50,
          negotiateBackfire: c.negotiateBackfire ?? false,
          // 시간 배율이 바뀌어도 현재 나이를 유지하도록 bornAt 재기준 + decay 시계 리셋
          // ageYears=0이면 기존 bornAt 보존(리셋 시 0살 고착 방지); ageYears>0이면 재기준
          bornAt: (c.ageYears ?? 0) > 0
            ? Date.now() - (c.ageYears ?? 0) * GAME_YEAR_MS
            : (c.bornAt ?? Date.now()),
          lastTickAt: Date.now(),
          // 같은 시계를 쓰는 절대 타임스탬프 필드도 함께 정규화(옛 epoch 잔존 → 즉시 페널티/완료 방지)
          lastExerciseAt: Date.now(),
          cooldowns: {},
          activeSession: null,
        };
        return { character: merged } as unknown as GameState;
      },
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      },
    },
  ),
);
