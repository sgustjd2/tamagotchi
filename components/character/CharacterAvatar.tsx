"use client";

import { useEffect, useRef, useState } from "react";
import type { Character } from "@/types/character";
import { msUntilNextAge, stageLabel } from "@/lib/game/growth";
import { formatMoney } from "@/lib/game/ending";
import { currentHeight } from "@/lib/game/body";
import { bodyShapeForWeight } from "@/lib/game/weight";
import { seasonAt, skyPhaseAt } from "@/lib/game/sprite/roomAmbience";
import { paletteForColor } from "@/lib/game/sprite/characterPalettes";
import { equippedOf } from "@/lib/game/wardrobe";
import { playActionBeep } from "@/lib/sound/beeps";
import { DEGREE_LABEL } from "@/lib/game/degree";
import { useGameStore } from "@/lib/store/useGameStore";
import { useNow } from "@/lib/hooks/useNow";
import { formatDuration } from "@/lib/utils";
import { PixelRoom } from "@/components/game/PixelRoom";
import { PixelCharacter } from "@/components/game/PixelCharacter";
import { DioramaCard } from "@/components/three/DioramaCard";
import { CharacterSpeechBubble } from "@/components/game/CharacterSpeechBubble";
import { CharacterStatusIcon } from "@/components/game/CharacterStatusIcon";
import {
  actionStateDurationMs,
  getCharacterVisualState,
  jobTypeFromFamily,
  type ActionState,
} from "@/lib/game/sprite/characterVisualState";

/** 말풍선을 띄울 컨디션 상태 */
const BUBBLE_WARN = new Set(["hungry", "sick", "burned_out", "tired"]);

export function CharacterAvatar({ character }: { character: Character }) {
  const female = character.gender === "female";
  const jobType = jobTypeFromFamily(character.job?.family);

  // 실시간 다음 생일 카운트다운(시간이 실제로 흐르고 있다는 걸 눈으로 확인)
  const now = useNow(1000);
  const msToNextAge = msUntilNextAge(character.bornAt, character.ageYears, now);

  // 액션 펄스: 버튼을 누르면 잠깐 그 행동 포즈를 취하고, 시간이 지나면 평상시로
  const fx = useGameStore((s) => s.charAction);
  const [live, setLive] = useState<ActionState | null>(null);
  const lastToken = useRef(0);
  useEffect(() => {
    if (!fx || fx.token === lastToken.current) return;
    lastToken.current = fx.token;
    setLive(fx.state);
    playActionBeep(fx.state); // 액션 클릭 직후라 유저 제스처 안에서 재생됨
    const id = setTimeout(() => setLive(null), actionStateDurationMs(fx.state));
    return () => clearTimeout(id);
  }, [fx]);

  // 🎨 컬러 도트 모드 — 캐릭터 생성 때 고른 기기 색으로 도트를 칠한다(기본은 단색 LCD)
  const [colorMode, setColorMode] = useState(false);
  useEffect(() => {
    setColorMode(localStorage.getItem("lifegotchi:colorMode") === "1");
  }, []);
  const toggleColorMode = () =>
    setColorMode((v) => {
      localStorage.setItem("lifegotchi:colorMode", v ? "0" : "1");
      return !v;
    });

  // 🧊 3D 복셀 방 — 기본 켬. WebGL 미지원이면 자동으로 2D 픽셀 방으로 폴백
  const [mode3d, setMode3d] = useState(false); // SSR 은 2D로 시작(하이드레이션 안전)
  useEffect(() => {
    setMode3d(localStorage.getItem("lifegotchi:room3d") !== "0");
  }, []);
  const toggleMode3d = () =>
    setMode3d((v) => {
      localStorage.setItem("lifegotchi:room3d", v ? "0" : "1");
      return !v;
    });

  // 진행 중인 공부 세션은 펄스가 없을 때도 계속 공부 포즈
  const sessionAction: ActionState | undefined =
    character.activeSession?.actionType === "study" ? "studying" : undefined;
  const actionState = live ?? sessionAction;

  const vs = getCharacterVisualState({
    lifeStage: character.lifeStage,
    mood: character.status.mood,
    hunger: character.status.hunger,
    energy: character.status.energy,
    health: character.status.health,
    burnout: character.status.burnout,
    cleanliness: character.status.cleanliness,
    actionState,
    jobType,
  });

  // 행동 중(펄스)일 땐 경고 말풍선 대신 행동 라벨을 우선
  const showBubble = !!live || BUBBLE_WARN.has(vs.state) || vs.state === "happy";
  const night = vs.pose === "lie";

  // 실제 시각·계절 → 창밖 분위기 / 체중 → 체형 / 행복도 70+ → 고양이
  const sky = skyPhaseAt(now);
  const season = seasonAt(now);
  const bodyShape = bodyShapeForWeight(character.status.weight, character.ageYears);
  const pet = character.happiness >= 70 ? ("cat" as const) : undefined;
  const family = {
    spouse: character.marriedAtAge != null,
    children: character.childrenBornAges?.length ?? 0,
  };

  return (
    <div className="flex w-full flex-col items-center gap-2 md:gap-3">
      {/* 모바일은 한 화면 레이아웃에 맞춰 방을 조금 작게(높이 절약) */}
      <div className="relative w-full max-w-[190px] md:max-w-[250px]">
        {showBubble && (
          <div className="absolute -top-2 left-1/2 z-10 -translate-x-1/2">
            <CharacterSpeechBubble
              text={vs.label}
              tone={BUBBLE_WARN.has(vs.state) ? "warn" : "default"}
            />
          </div>
        )}
        {mode3d ? (
          <DioramaCard
            stage={character.lifeStage}
            color={character.color}
            night={night}
            items={character.roomItems}
            pose={vs.pose}
            outfit={equippedOf(character).outfit ?? null}
            accessory={equippedOf(character).accessory ?? null}
            family={family}
            pet={pet}
            appearance={character.appearance}
            gender={character.gender}
            happy={vs.state === "happy"}
            onUnavailable={() => setMode3d(false)}
          />
        ) : (
          <PixelRoom
            stage={character.lifeStage}
            jobType={jobType}
            night={night}
            sky={sky}
            season={season}
            pet={pet}
            family={family}
            items={character.roomItems}
            width={250}
          >
            <PixelCharacter
              lifeStage={character.lifeStage}
              mood={character.status.mood}
              hunger={character.status.hunger}
              energy={character.status.energy}
              health={character.status.health}
              burnout={character.status.burnout}
              cleanliness={character.status.cleanliness}
              actionState={actionState}
              jobType={jobType}
              gender={character.gender}
              appearance={character.appearance}
              bodyShape={bodyShape}
              wardrobe={equippedOf(character)}
              palette={colorMode ? paletteForColor(character.color, vs.tone) : undefined}
              size={128}
            />
          </PixelRoom>
        )}
        {/* 3D/2D 토글 — 방 좌상단 작은 버튼 */}
        <button
          type="button"
          onClick={toggleMode3d}
          className="absolute left-1.5 top-1.5 z-10 rounded-lg border-2 border-ink/25 bg-white/80 px-1.5 py-0.5 font-pixel text-[10px] font-bold text-ink/60 hover:bg-white"
          title={mode3d ? "2D 픽셀 방으로 보기" : "3D 복셀 방으로 보기"}
        >
          {mode3d ? "🧊 3D" : "▦ 2D"}
        </button>
        {/* 컬러/단색 토글 — 2D 모드에서만 의미 있음 */}
        {!mode3d && (
          <button
            type="button"
            onClick={toggleColorMode}
            className="absolute right-1.5 top-1.5 z-10 rounded-lg border-2 border-ink/25 bg-white/80 px-1.5 py-0.5 font-pixel text-[10px] font-bold text-ink/60 hover:bg-white"
            title={colorMode ? "단색 LCD로 보기" : "내 기기 색으로 칠하기"}
          >
            {colorMode ? "🎨 컬러" : "▦ 단색"}
          </button>
        )}
      </div>

      <div className="text-center">
        <div className="font-pixel text-lg font-bold">{character.name}</div>
        <div className="mt-0.5 flex items-center justify-center gap-2 font-pixel text-xs text-ink/55">
          <span>
            만 {character.ageYears}살 · {stageLabel(character.lifeStage)}
          </span>
          <CharacterStatusIcon state={vs.state} />
        </div>
        {msToNextAge != null && (
          <div className="mt-0.5 font-pixel text-[10px] tabular-nums text-ink/40">
            다음 생일까지 {formatDuration(msToNextAge)}
          </div>
        )}
        <div className="mt-1.5 flex flex-wrap justify-center gap-2">
          <span className={`pill ${female ? "bg-blush/50" : "bg-sky/40"} text-ink/70`}>
            {female ? "♀ 여아" : "♂ 남아"} · {currentHeight(character)}cm
          </span>
          {(character.gradEnroll || character.degree !== "highschool") && (
            <span className="pill bg-grape/20 text-ink/70">
              {character.gradEnroll
                ? `🎓 ${DEGREE_LABEL[character.gradEnroll.degree]}과정`
                : DEGREE_LABEL[character.degree]}
            </span>
          )}
          <span className="pill bg-butter/40 text-ink/70">
            저축 {formatMoney(character.savings)}
          </span>
          <span className="pill bg-blush/40 text-ink/70">행복 {character.happiness}</span>
          {(character.generation ?? 1) >= 2 && (
            <span className="pill bg-grape/25 text-ink/70">{character.generation}세대</span>
          )}
          {character.marriedAtAge != null && (
            <span className="pill bg-coral/20 text-ink/70">
              💍 기혼
              {(character.childrenBornAges?.length ?? 0) > 0 &&
                ` · 👶 ${character.childrenBornAges!.length}`}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
