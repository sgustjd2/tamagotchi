"use client";

// 복셀 3D 디오라마 — 방+캐릭터+소유 가구를 three.js 박스 조합으로 그린다.
// 외부 모델/텍스처 없이 코드 생성. R3F v8(React 18) + three 0.170 고정.
// 반드시 DioramaCard 의 dynamic(ssr:false) 뒤에서만 임포트할 것(SSR 크래시 방지).

import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import type { Group, Mesh } from "three";
import type { LifeStage, RoomItemKey } from "@/types/character";
import { STAGE_CONFIG } from "@/lib/game/sprite/characterStageConfig";
import { CHARACTER_PALETTES } from "@/lib/game/sprite/characterPalettes";
import { THEME_TINT } from "@/components/game/PixelRoom";

// ---------------------------------------------------------------------------
// 색 유틸 — 밤 모드는 남색으로 22% 섞고 밝기를 낮춘다(스펙 paletteMapping)
// ---------------------------------------------------------------------------

function mixHex(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (sa: number, sb: number) => Math.round(sa + (sb - sa) * t);
  const r = ch((pa >> 16) & 255, (pb >> 16) & 255);
  const g = ch((pa >> 8) & 255, (pb >> 8) & 255);
  const bl = ch(pa & 255, pb & 255);
  return `#${((r << 16) | (g << 8) | bl).toString(16).padStart(6, "0")}`;
}

function scaleHex(a: string, f: number): string {
  const p = parseInt(a.slice(1), 16);
  const s = (v: number) => Math.min(255, Math.round(v * f));
  const r = s((p >> 16) & 255);
  const g = s((p >> 8) & 255);
  const b = s(p & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

const NIGHT_TINT = "#6B7A9E";
const nightify = (c: string, f: number) => scaleHex(mixHex(c, NIGHT_TINT, 0.22), f);

// ---------------------------------------------------------------------------
// 박스 한 개 — 디오라마의 유일한 기본 단위
// ---------------------------------------------------------------------------

function B({
  p,
  s,
  c,
  rx = 0,
  ry = 0,
  opacity,
}: {
  p: [number, number, number];
  s: [number, number, number];
  c: string;
  rx?: number;
  ry?: number;
  opacity?: number;
}) {
  return (
    <mesh position={p} rotation={[rx, ry, 0]}>
      <boxGeometry args={s} />
      <meshLambertMaterial color={c} transparent={opacity != null} opacity={opacity ?? 1} />
    </mesh>
  );
}

// ---------------------------------------------------------------------------
// 복셀 캐릭터 — 성장 티어별 박스 치수(디자인 스펙 수치 그대로)
// 각 파트: [w, h, d, x, y, z]
// ---------------------------------------------------------------------------

type Part = [number, number, number, number, number, number];
interface TierSpec {
  legs: Part[];
  body: Part;
  arms: Part[];
  head: Part;
  hair: Part[];
  eyes: Part[];
  cheeks: Part[];
}

const TIERS: Record<"tiny" | "small" | "mid" | "full", TierSpec> = {
  tiny: {
    legs: [
      [0.2, 0.18, 0.24, 0.14, 0.09, 0.02],
      [0.2, 0.18, 0.24, -0.14, 0.09, 0.02],
    ],
    body: [0.6, 0.4, 0.45, 0, 0.38, 0],
    arms: [
      [0.16, 0.26, 0.2, 0.38, 0.42, 0],
      [0.16, 0.26, 0.2, -0.38, 0.42, 0],
    ],
    head: [0.95, 0.8, 0.85, 0, 0.98, 0],
    hair: [[1.0, 0.28, 0.9, 0, 1.32, 0]],
    eyes: [
      [0.12, 0.15, 0.06, 0.2, 0.98, 0.455],
      [0.12, 0.15, 0.06, -0.2, 0.98, 0.455],
    ],
    cheeks: [
      [0.13, 0.08, 0.05, 0.32, 0.83, 0.44],
      [0.13, 0.08, 0.05, -0.32, 0.83, 0.44],
    ],
  },
  small: {
    legs: [
      [0.28, 0.3, 0.3, 0.18, 0.15, 0],
      [0.28, 0.3, 0.3, -0.18, 0.15, 0],
    ],
    body: [0.75, 0.55, 0.5, 0, 0.575, 0],
    arms: [
      [0.22, 0.4, 0.26, 0.5, 0.62, 0],
      [0.22, 0.4, 0.26, -0.5, 0.62, 0],
    ],
    head: [1.1, 0.9, 1.0, 0, 1.3, 0],
    hair: [
      [1.16, 0.32, 1.06, 0, 1.68, 0],
      [1.16, 0.2, 0.08, 0, 1.56, 0.52],
    ],
    eyes: [
      [0.13, 0.16, 0.06, 0.24, 1.3, 0.53],
      [0.13, 0.16, 0.06, -0.24, 1.3, 0.53],
    ],
    cheeks: [
      [0.14, 0.09, 0.05, 0.36, 1.1, 0.51],
      [0.14, 0.09, 0.05, -0.36, 1.1, 0.51],
    ],
  },
  mid: {
    legs: [
      [0.3, 0.42, 0.34, 0.2, 0.21, 0],
      [0.3, 0.42, 0.34, -0.2, 0.21, 0],
    ],
    body: [0.85, 0.7, 0.55, 0, 0.77, 0],
    arms: [
      [0.24, 0.5, 0.28, 0.56, 0.85, 0],
      [0.24, 0.5, 0.28, -0.56, 0.85, 0],
    ],
    head: [1.15, 0.95, 1.05, 0, 1.6, 0],
    hair: [
      [1.21, 0.34, 1.11, 0, 2.0, 0],
      [1.21, 0.2, 0.08, 0, 1.87, 0.55],
    ],
    eyes: [
      [0.13, 0.17, 0.06, 0.26, 1.6, 0.555],
      [0.13, 0.17, 0.06, -0.26, 1.6, 0.555],
    ],
    cheeks: [
      [0.15, 0.09, 0.05, 0.38, 1.38, 0.53],
      [0.15, 0.09, 0.05, -0.38, 1.38, 0.53],
    ],
  },
  full: {
    legs: [
      [0.32, 0.5, 0.36, 0.22, 0.25, 0],
      [0.32, 0.5, 0.36, -0.22, 0.25, 0],
    ],
    body: [0.95, 0.85, 0.6, 0, 0.925, 0],
    arms: [
      [0.26, 0.6, 0.3, 0.62, 1.0, 0],
      [0.26, 0.6, 0.3, -0.62, 1.0, 0],
    ],
    head: [1.25, 1.05, 1.1, 0, 1.9, 0],
    hair: [
      [1.31, 0.36, 1.16, 0, 2.34, 0],
      [1.31, 0.22, 0.08, 0, 2.16, 0.57],
    ],
    eyes: [
      [0.14, 0.18, 0.06, 0.28, 1.9, 0.58],
      [0.14, 0.18, 0.06, -0.28, 1.9, 0.58],
    ],
    cheeks: [
      [0.16, 0.1, 0.05, 0.42, 1.72, 0.575],
      [0.16, 0.1, 0.05, -0.42, 1.72, 0.575],
    ],
  },
};

const SKIN = "#FFDFC4";
const HAIR = "#6B4A38";
const INK = "#2E2722";
const CHEEK = "#FFB7C5";

function VoxelCharacter({
  tier,
  clothes,
  night,
}: {
  tier: keyof typeof TIERS;
  clothes: string;
  night: boolean;
}) {
  const g = useRef<Group>(null);
  const eyeL = useRef<Mesh>(null);
  const eyeR = useRef<Mesh>(null);
  const armL = useRef<Mesh>(null);
  const armR = useRef<Mesh>(null);
  const nextBlink = useRef(2);
  const blinkUntil = useRef(0);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const grp = g.current;
    if (grp) {
      // 숨쉬기(부피 보존 스쿼시) + 살짝 둥실
      const br = Math.sin((2 * Math.PI * t) / 2.2);
      grp.scale.set(1 - 0.01 * br, 1 + 0.02 * br, 1 - 0.01 * br);
      grp.position.y = 0.03 * Math.sin((2 * Math.PI * t) / 2.8 + Math.PI / 2);
    }
    // 팔 스윙(좌우 미러)
    const sway = 0.05 * Math.sin((2 * Math.PI * t) / 2.2);
    if (armL.current) armL.current.rotation.z = sway;
    if (armR.current) armR.current.rotation.z = -sway;
    // 깜빡임: 3~5초 간격, 120ms
    if (t > nextBlink.current) {
      blinkUntil.current = t + 0.12;
      nextBlink.current = t + 3 + Math.random() * 2;
    }
    const blinking = t < blinkUntil.current ? 0.1 : 1;
    if (eyeL.current) eyeL.current.scale.y = blinking;
    if (eyeR.current) eyeR.current.scale.y = blinking;
  });

  const spec = TIERS[tier];
  const f = night ? 0.75 : 1;
  const col = (c: string) => (night ? nightify(c, f) : c);
  const part = (p: Part, c: string, ref?: React.Ref<Mesh>) => (
    <mesh key={`${p.join()}${c}`} ref={ref} position={[p[3], p[4], p[5]]}>
      <boxGeometry args={[p[0], p[1], p[2]]} />
      <meshLambertMaterial color={col(c)} />
    </mesh>
  );

  return (
    <group ref={g} position={[0.2, 0, -1.2]}>
      {spec.legs.map((p) => part(p, "#5C4A3D"))}
      {part(spec.body, clothes)}
      {part(spec.arms[0], clothes, armL)}
      {part(spec.arms[1], clothes, armR)}
      {part(spec.head, SKIN)}
      {spec.hair.map((p) => part(p, HAIR))}
      {part(spec.eyes[0], INK, eyeL)}
      {part(spec.eyes[1], INK, eyeR)}
      {spec.cheeks.map((p) => part(p, CHEEK))}
      {/* 가짜 접지 그림자 */}
      <B p={[0, 0.011, 0]} s={[1.4, 0.02, 1.0]} c={INK} opacity={0.08} />
    </group>
  );
}

// ---------------------------------------------------------------------------
// 방 본체 + 소유 가구 8종 (디자인 스펙 좌표 그대로)
// ---------------------------------------------------------------------------

function Room({ wall, wallSide, floor, night }: { wall: string; wallSide: string; floor: string; night: boolean }) {
  const wood = night ? nightify("#C89B72", 0.6) : "#C89B72";
  const woodDark = night ? nightify("#9C744F", 0.6) : "#9C744F";
  const cream = night ? nightify("#FFF8F0", 0.6) : "#FFF8F0";
  const pane = night ? "#3E4A6B" : "#AEDFF7";
  return (
    <group>
      {/* 바닥 + 벽(뒷벽은 창 구멍 4분할) */}
      <B p={[0, -0.25, 0]} s={[10, 0.5, 10]} c={floor} />
      <B p={[-4.85, 2.5, 0]} s={[0.3, 5, 10]} c={wallSide} />
      <B p={[-2.35, 2.5, -4.85]} s={[5.3, 5, 0.3]} c={wall} />
      <B p={[3.85, 2.5, -4.85]} s={[2.3, 5, 0.3]} c={wall} />
      <B p={[1.5, 0.95, -4.85]} s={[2.4, 1.9, 0.3]} c={wall} />
      <B p={[1.5, 4.35, -4.85]} s={[2.4, 1.3, 0.3]} c={wall} />
      {/* 창: 하늘 판 + 십자 창살 */}
      <B p={[1.5, 2.8, -4.86]} s={[2.4, 1.8, 0.06]} c={pane} />
      <B p={[1.5, 2.8, -4.82]} s={[0.06, 1.8, 0.05]} c={cream} />
      <B p={[1.5, 2.8, -4.82]} s={[2.4, 0.06, 0.05]} c={cream} />
      {/* 침대 */}
      <B p={[-3.5, 0.25, -2.9]} s={[2.2, 0.5, 3.6]} c={wood} />
      <B p={[-3.5, 0.85, -4.57]} s={[2.2, 1.2, 0.25]} c={wood} />
      <B p={[-3.5, 0.65, -2.95]} s={[2.0, 0.3, 3.3]} c={cream} />
      <B p={[-3.5, 0.91, -4.0]} s={[1.3, 0.22, 0.7]} c={night ? nightify("#FFB7C5", 0.6) : "#FFB7C5"} />
      <B p={[-3.5, 0.86, -1.95]} s={[2.04, 0.12, 1.8]} c={night ? nightify("#A8E6CF", 0.6) : "#A8E6CF"} />
      {/* 책상(창 아래) */}
      <B p={[1.5, 1.15, -4.15]} s={[2.4, 0.15, 1.1]} c={wood} />
      <B p={[0.45, 0.54, -4.575]} s={[0.15, 1.08, 0.15]} c={woodDark} />
      <B p={[2.55, 0.54, -4.575]} s={[0.15, 1.08, 0.15]} c={woodDark} />
      <B p={[0.45, 0.54, -3.725]} s={[0.15, 1.08, 0.15]} c={woodDark} />
      <B p={[2.55, 0.54, -3.725]} s={[0.15, 1.08, 0.15]} c={woodDark} />
    </group>
  );
}

function Items({ items, night }: { items: RoomItemKey[]; night: boolean }) {
  const has = (k: RoomItemKey) => items.includes(k);
  const c = (hex: string, f = 0.6) => (night ? nightify(hex, f) : hex);
  return (
    <group>
      {has("rug") && (
        <group position={[0.2, 0, -0.6]}>
          <B p={[0, 0.035, 0]} s={[3.2, 0.06, 2.2]} c={c("#FFB7C5")} />
          <B p={[0, 0.05, 0]} s={[2.6, 0.06, 1.6]} c={c("#FFF3E4")} />
        </group>
      )}
      {has("sofa") && (
        <group position={[2.4, 0, -1.4]} rotation={[0, -0.35, 0]}>
          <B p={[0, 0.275, 0]} s={[1.6, 0.55, 1.0]} c={c("#FF9A8B")} />
          <B p={[0, 0.9, -0.35]} s={[1.6, 0.7, 0.3]} c={c("#FF9A8B")} />
          <B p={[0.65, 0.775, 0]} s={[0.3, 0.45, 1.0]} c={c("#E8877A")} />
          <B p={[-0.65, 0.775, 0]} s={[0.3, 0.45, 1.0]} c={c("#E8877A")} />
          <B p={[0, 0.64, 0.05]} s={[0.9, 0.18, 0.8]} c={c("#FFE3A3")} />
        </group>
      )}
      {has("wallTv") && (
        <group position={[-1.5, 3.1, -4.64]}>
          <B p={[0, 0, 0]} s={[2.2, 1.3, 0.12]} c={INK} />
          <B p={[0, 0, 0.07]} s={[2.0, 1.1, 0.04]} c={night ? "#A8E6CF" : "#3A4150"} />
          <B p={[0, -0.85, 0.02]} s={[1.6, 0.12, 0.1]} c={c("#4A4038")} />
        </group>
      )}
      {has("bigPlant") && (
        <group position={[-1.9, 0, -4.1]}>
          <B p={[0, 0.25, 0]} s={[0.55, 0.5, 0.55]} c={c("#D98E73")} />
          <B p={[0, 0.8, 0]} s={[0.14, 0.6, 0.14]} c={c("#9C744F")} />
          <B p={[0, 1.35, 0]} s={[0.9, 0.6, 0.9]} c={c("#7ECBA1")} />
          <B p={[0.1, 1.8, 0.05]} s={[0.65, 0.5, 0.65]} c={c("#A8E6CF")} />
          <B p={[-0.05, 2.15, 0]} s={[0.4, 0.35, 0.4]} c={c("#8FD9B6")} />
        </group>
      )}
      {has("lamp") && (
        <group position={[4.3, 0, -4.1]}>
          <B p={[0, 0.06, 0]} s={[0.5, 0.12, 0.5]} c={c("#9C744F")} />
          <B p={[0, 0.87, 0]} s={[0.1, 1.5, 0.1]} c={c("#9C744F")} />
          <B p={[0, 1.85, 0]} s={[0.6, 0.45, 0.6]} c={night ? "#FFE3A3" : c("#FFE3A3")} />
          <B p={[0, 1.58, 0]} s={[0.34, 0.1, 0.34]} c={"#FFF2CC"} />
          {night && <pointLight position={[0, 1.8, 0]} color="#FFE3A3" intensity={0.9} distance={5} decay={2} />}
        </group>
      )}
      {has("bookshelf") && (
        <group position={[-4.35, 0, 0.8]} rotation={[0, Math.PI / 2, 0]}>
          <B p={[0, 0.9, 0]} s={[1.2, 1.8, 0.45]} c={c("#C89B72")} />
          <B p={[0, 0.55, 0.05]} s={[1.0, 0.5, 0.4]} c={c("#8A6248")} />
          <B p={[0, 1.25, 0.05]} s={[1.0, 0.5, 0.4]} c={c("#8A6248")} />
          <B p={[-0.3, 1.28, 0.1]} s={[0.16, 0.4, 0.3]} c={c("#A8E6CF")} />
          <B p={[-0.1, 1.28, 0.1]} s={[0.16, 0.4, 0.3]} c={c("#C9B6F2")} />
          <B p={[0.12, 1.28, 0.1]} s={[0.16, 0.4, 0.3]} c={c("#FF9A8B")} />
        </group>
      )}
      {has("grandPiano") && (
        <group position={[3.0, 0, -2.6]} rotation={[0, -0.6, 0]}>
          <B p={[-0.8, 0.475, 0.5]} s={[0.15, 0.95, 0.15]} c={INK} />
          <B p={[0.8, 0.475, 0.5]} s={[0.15, 0.95, 0.15]} c={INK} />
          <B p={[0, 0.475, -0.55]} s={[0.15, 0.95, 0.15]} c={INK} />
          <B p={[0, 1.2, 0]} s={[2.0, 0.5, 1.4]} c={INK} />
          <B p={[0, 1.05, 0.8]} s={[1.6, 0.12, 0.35]} c={c("#FFF8F0")} />
          <B p={[0, 1.12, 0.94]} s={[1.6, 0.03, 0.06]} c={INK} />
          <B p={[0, 1.75, -0.25]} s={[1.9, 0.08, 1.3]} c={INK} rx={-0.45} />
        </group>
      )}
      {has("puppy") && (
        <group position={[-1.2, 0, 0.6]} rotation={[0, 0.4, 0]}>
          <B p={[0, 0.42, 0]} s={[0.55, 0.35, 0.75]} c={c("#FFF4E2", 0.75)} />
          <B p={[0, 0.125, 0]} s={[0.5, 0.25, 0.7]} c={c("#FFF4E2", 0.75)} />
          <B p={[0, 0.75, 0.45]} s={[0.5, 0.45, 0.45]} c={c("#FFF4E2", 0.75)} />
          <B p={[0.19, 1.0, 0.42]} s={[0.12, 0.22, 0.1]} c={c("#B98A63", 0.75)} />
          <B p={[-0.19, 1.0, 0.42]} s={[0.12, 0.22, 0.1]} c={c("#B98A63", 0.75)} />
          <B p={[0, 0.58, -0.48]} s={[0.1, 0.1, 0.3]} c={c("#B98A63", 0.75)} rx={0.6} />
          <B p={[0.12, 0.82, 0.675]} s={[0.07, 0.09, 0.05]} c={INK} />
          <B p={[-0.12, 0.82, 0.675]} s={[0.07, 0.09, 0.05]} c={INK} />
          <B p={[0, 0.72, 0.68]} s={[0.08, 0.07, 0.05]} c={INK} />
        </group>
      )}
    </group>
  );
}

// ---------------------------------------------------------------------------
// 루트 — 느린 요잉 스웨이 + 조명 + 씬 구성
// ---------------------------------------------------------------------------

function Sway({ children }: { children: React.ReactNode }) {
  const g = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (g.current) g.current.rotation.y = 0.15 * Math.sin((2 * Math.PI * clock.getElapsedTime()) / 14);
  });
  return <group ref={g}>{children}</group>;
}

export interface VoxelDioramaProps {
  stage: LifeStage;
  color: string;
  night: boolean;
  items: RoomItemKey[];
}

export default function VoxelDiorama({ stage, color, night, items }: VoxelDioramaProps) {
  const tier = STAGE_CONFIG[stage].tier;
  const theme = STAGE_CONFIG[stage].room;
  const clothes =
    CHARACTER_PALETTES[color as keyof typeof CHARACTER_PALETTES]?.shade ?? "#4FA98A";

  // 2D 테마 틴트를 3D 파스텔 베이스에 35% 섞어 성장 단계별 방 분위기를 유지
  const { wall, wallSide, floor } = useMemo(() => {
    const tint = THEME_TINT[theme];
    const w = mixHex("#FBEFE0", tint.wall, 0.35);
    const ws = mixHex("#F6E4D8", tint.wall, 0.35);
    const fl = mixHex("#EED9BE", tint.floor, 0.35);
    return night
      ? { wall: nightify(w, 0.55), wallSide: nightify(ws, 0.55), floor: nightify(fl, 0.55) }
      : { wall: w, wallSide: ws, floor: fl };
  }, [theme, night]);

  return (
    <Canvas
      dpr={[1, 2]}
      frameloop="always"
      flat
      gl={{ antialias: true, powerPreference: "low-power", alpha: true, stencil: false }}
      camera={{ position: [9, 8, 9], fov: 35, near: 0.1, far: 100 }}
      onCreated={({ gl, camera }) => {
        gl.domElement.addEventListener("webglcontextlost", (e) => e.preventDefault());
        camera.lookAt(0, 1.6, 0);
      }}
    >
      <ambientLight color={night ? "#B8C4E0" : "#FFF4E6"} intensity={night ? 0.25 : 0.65} />
      <directionalLight
        color={night ? "#8FA3CC" : "#FFFDF5"}
        intensity={night ? 0.15 : 0.9}
        position={[6, 10, 4]}
      />
      <Sway>
        <Room wall={wall} wallSide={wallSide} floor={floor} night={night} />
        <Items items={items} night={night} />
        <VoxelCharacter tier={tier} clothes={clothes} night={night} />
      </Sway>
    </Canvas>
  );
}
