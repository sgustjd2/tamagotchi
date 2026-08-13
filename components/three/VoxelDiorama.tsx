"use client";

// 복셀 3D 디오라마 — 방+캐릭터+가족+소유 가구 전체를 three.js 박스 조합으로 그린다.
// 외부 모델/텍스처 없이 코드 생성. R3F v8(React 18) + three 0.170 고정.
// 반드시 DioramaCard 의 dynamic(ssr:false) 뒤에서만 임포트할 것(SSR 크래시 방지).

import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import type { Group, Mesh } from "three";
import type { LifeStage, RoomItemKey, WardrobeItemKey } from "@/types/character";
import { STAGE_CONFIG } from "@/lib/game/sprite/characterStageConfig";
import { CHARACTER_PALETTES } from "@/lib/game/sprite/characterPalettes";
import { THEME_TINT } from "@/components/game/PixelRoom";

// ---------------------------------------------------------------------------
// 색 유틸 — 밤 모드는 남색으로 22% 섞고 밝기를 낮춘다
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

/** 의상/액세서리 좌표는 full 티어 기준 — 다른 티어는 키 비율로 축소 */
const TIER_RATIO: Record<keyof typeof TIERS, number> = {
  tiny: 0.56,
  small: 0.71,
  mid: 0.85,
  full: 1,
};

const SKIN = "#FFDFC4";
const HAIR = "#6B4A38";
const INK = "#2E2722";
const CHEEK = "#FFB7C5";

// 컬러 박스: [w,h,d,x,y,z,color] (+선택 rx)
type CBox = [number, number, number, number, number, number, string, number?];

/** 착용 의상 → 몸통 색 + 포인트 박스(full 티어 좌표) */
const OUTFITS: Record<string, { c: string; extra?: CBox[] }> = {
  stripeTee: {
    c: "#AEDFF7",
    extra: [
      [0.99, 0.12, 0.64, 0, 1.08, 0, "#FFF8F0"],
      [0.99, 0.12, 0.64, 0, 0.78, 0, "#FFF8F0"],
    ],
  },
  hoodie: {
    c: "#A8E6CF",
    extra: [
      [0.95, 0.55, 0.28, 0, 1.45, -0.46, "#8CD4B8"],
      [0.1, 0.14, 0.05, 0, 1.15, 0.31, "#FFF8F0"],
    ],
  },
  jacket: { c: "#FF9A8B", extra: [[0.08, 0.8, 0.05, 0, 0.92, 0.31, "#2E2722"]] },
  suit: {
    c: "#4A4038",
    extra: [
      [0.32, 0.16, 0.05, 0, 1.27, 0.31, "#FFF8F0"],
      [0.13, 0.48, 0.05, 0, 1.02, 0.31, "#FF9A8B"],
    ],
  },
  training: {
    c: "#C9B6F2",
    extra: [
      [0.07, 0.85, 0.62, 0.47, 0.925, 0, "#FFF8F0"],
      [0.07, 0.85, 0.62, -0.47, 0.925, 0, "#FFF8F0"],
    ],
  },
  dress: { c: "#FFB7C5", extra: [[1.15, 0.38, 0.8, 0, 0.34, 0, "#F79BB0"]] },
  padding: {
    c: "#FFE3A3",
    extra: [
      [1.0, 0.07, 0.64, 0, 1.05, 0, "#E8C97F"],
      [1.0, 0.07, 0.64, 0, 0.78, 0, "#E8C97F"],
    ],
  },
  leather: { c: "#3B3230", extra: [[0.06, 0.78, 0.05, 0.13, 0.94, 0.31, "#B9B4AE"]] },
  overalls: {
    c: "#6E9ECF",
    extra: [
      [0.97, 0.2, 0.62, 0, 1.26, 0, "#FFE3A3"],
      [0.28, 0.18, 0.05, 0, 1.0, 0.31, "#5B84B8"],
    ],
  },
  swimsuit: { c: "#7ED4E6", extra: [[0.99, 0.12, 0.64, 0, 0.68, 0, "#FFF8F0"]] },
  baseballUniform: {
    c: "#FFF8F0",
    extra: [
      [0.45, 0.2, 0.05, 0, 1.08, 0.31, "#FF9A8B"],
      [0.97, 0.1, 0.62, 0, 0.56, 0, "#2E2722"],
    ],
  },
  knitCardigan: { c: "#E5C29F", extra: [[0.08, 0.68, 0.05, 0, 0.9, 0.31, "#9C744F"]] },
  denimSet: {
    c: "#7EA8D8",
    extra: [
      [0.99, 0.16, 0.64, 0, 0.62, 0, "#5B84B8"],
      [0.22, 0.16, 0.05, 0.18, 1.08, 0.31, "#5B84B8"],
    ],
  },
  trenchCoat: {
    c: "#D9B98C",
    extra: [
      [1.0, 0.13, 0.66, 0, 0.76, 0, "#9C744F"],
      [1.05, 0.25, 0.7, 0, 0.4, 0, "#D9B98C"],
    ],
  },
  hanbok: {
    c: "#E0697E",
    extra: [
      [1.2, 0.5, 0.85, 0, 0.3, 0, "#C9B6F2"],
      [0.13, 0.4, 0.05, 0.1, 1.1, 0.31, "#FFF8F0"],
    ],
  },
  tuxedo: {
    c: "#332C28",
    extra: [
      [0.34, 0.5, 0.05, 0, 1.08, 0.31, "#FFF8F0"],
      [0.24, 0.11, 0.06, 0, 1.3, 0.32, "#2E2722"],
    ],
  },
};

/** 착용 액세서리 → 포인트 박스(full 티어 좌표) */
const ACCESSORIES: Record<string, CBox[]> = {
  ribbon: [
    [0.32, 0.16, 0.14, 0.35, 2.47, 0.15, "#FFB7C5"],
    [0.1, 0.1, 0.15, 0.35, 2.47, 0.15, "#F79BB0"],
  ],
  cap: [
    [1.3, 0.26, 1.15, 0, 2.5, 0, "#AEDFF7"],
    [0.95, 0.08, 0.5, 0, 2.42, 0.78, "#AEDFF7"],
  ],
  beanie: [
    [1.3, 0.35, 1.15, 0, 2.52, 0, "#FF9A8B"],
    [1.34, 0.12, 1.19, 0, 2.38, 0, "#E8857A"],
  ],
  scarf: [
    [1.05, 0.28, 0.85, 0, 1.37, 0, "#FFE3A3"],
    [0.24, 0.5, 0.1, 0.2, 1.02, 0.34, "#FFE3A3"],
  ],
  sunglasses: [[0.9, 0.18, 0.06, 0, 1.9, 0.56, "#2E2722"]],
  headphones: [
    [1.44, 0.12, 0.25, 0, 2.5, 0, "#C9B6F2"],
    [0.2, 0.4, 0.4, 0.72, 1.9, 0, "#A98FE0"],
    [0.2, 0.4, 0.4, -0.72, 1.9, 0, "#A98FE0"],
  ],
  necklace: [
    [0.5, 0.06, 0.06, 0, 1.3, 0.32, "#F2C94C"],
    [0.1, 0.12, 0.06, 0, 1.2, 0.33, "#F2C94C"],
  ],
  crown: [
    [0.7, 0.3, 0.7, 0, 2.58, 0, "#F2C94C"],
    [0.78, 0.1, 0.78, 0, 2.44, 0, "#E0B43A"],
  ],
  hairpin: [[0.28, 0.08, 0.06, -0.35, 2.2, 0.56, "#A8E6CF"]],
  gloves: [
    [0.22, 0.26, 0.28, 0.6, 0.55, 0, "#A8E6CF"],
    [0.22, 0.26, 0.28, -0.6, 0.55, 0, "#A8E6CF"],
  ],
  bowtie: [
    [0.3, 0.14, 0.08, 0, 1.32, 0.33, "#FF9A8B"],
    [0.08, 0.1, 0.09, 0, 1.32, 0.34, "#E8857A"],
  ],
  backpack: [
    [0.7, 0.6, 0.3, 0, 1.0, -0.48, "#C9B6F2"],
    [0.4, 0.25, 0.08, 0, 0.88, -0.66, "#A98FE0"],
  ],
  watch: [[0.16, 0.1, 0.16, 0.6, 0.68, 0.05, "#AEDFF7"]],
  earrings: [
    [0.08, 0.14, 0.08, 0.66, 1.75, 0, "#F2C94C"],
    [0.08, 0.14, 0.08, -0.66, 1.75, 0, "#F2C94C"],
  ],
  brooch: [[0.14, 0.14, 0.08, -0.25, 1.2, 0.33, "#C9B6F2"]],
  anklet: [[0.18, 0.06, 0.18, 0.25, 0.1, 0, "#F2C94C"]],
};

type Pose = "stand" | "sit" | "lie" | "exercise";

function VoxelCharacter({
  tier,
  clothes,
  night,
  pose = "stand",
  phase = 0,
  position = [0.2, 0, -1.2],
  rotY = 0,
  scale = 1,
  outfit = null,
  accessory = null,
}: {
  tier: keyof typeof TIERS;
  clothes: string;
  night: boolean;
  pose?: Pose;
  phase?: number;
  position?: [number, number, number];
  rotY?: number;
  scale?: number;
  outfit?: WardrobeItemKey | null;
  accessory?: WardrobeItemKey | null;
}) {
  const inner = useRef<Group>(null);
  const eyeL = useRef<Mesh>(null);
  const eyeR = useRef<Mesh>(null);
  const armL = useRef<Mesh>(null);
  const armR = useRef<Mesh>(null);
  const nextBlink = useRef(2 + phase);
  const blinkUntil = useRef(0);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() + phase;
    const grp = inner.current;
    if (grp) {
      const br = Math.sin((2 * Math.PI * t) / 2.2);
      if (pose === "lie") {
        // 수면: 미세한 숨만, 둥실 없음
        grp.scale.set(1 - 0.005 * br, 1 + 0.01 * br, 1 - 0.005 * br);
        grp.position.y = 0;
      } else if (pose === "exercise") {
        // 점핑잭 바운스 + 강한 스쿼시
        grp.scale.set(1 - 0.02 * br, 1 + 0.04 * br, 1 - 0.02 * br);
        grp.position.y = 0.12 * Math.abs(Math.sin((2 * Math.PI * t) / 1.0));
      } else {
        grp.scale.set(1 - 0.01 * br, 1 + 0.02 * br, 1 - 0.01 * br);
        grp.position.y = 0.03 * Math.sin((2 * Math.PI * t) / 2.8 + Math.PI / 2);
      }
    }
    // 팔 — 포즈별
    if (armL.current && armR.current) {
      if (pose === "exercise") {
        const pump = 0.35 * Math.sin((2 * Math.PI * t) / 1.0);
        armL.current.rotation.set(0, 0, -0.9 + pump);
        armR.current.rotation.set(0, 0, 0.9 - pump);
      } else if (pose === "sit") {
        armL.current.rotation.set(-1.2, 0, 0);
        armR.current.rotation.set(-1.2, 0, 0);
      } else if (pose === "lie") {
        armL.current.rotation.set(0, 0, 0.15);
        armR.current.rotation.set(0, 0, -0.15);
      } else {
        const sway = 0.05 * Math.sin((2 * Math.PI * t) / 2.2);
        armL.current.rotation.set(0, 0, sway);
        armR.current.rotation.set(0, 0, -sway);
      }
    }
    // 눈 — 수면 중엔 감은 채 고정, 그 외엔 깜빡임
    if (pose === "lie") {
      if (eyeL.current) eyeL.current.scale.y = 0.1;
      if (eyeR.current) eyeR.current.scale.y = 0.1;
    } else {
      if (t > nextBlink.current) {
        blinkUntil.current = t + 0.12;
        nextBlink.current = t + 3 + Math.random() * 2;
      }
      const blinking = t < blinkUntil.current ? 0.1 : 1;
      if (eyeL.current) eyeL.current.scale.y = blinking;
      if (eyeR.current) eyeR.current.scale.y = blinking;
    }
  });

  const spec = TIERS[tier];
  const f = night ? 0.75 : 1;
  const col = (c: string) => (night ? nightify(c, f) : c);
  const o = outfit ? OUTFITS[outfit] : undefined;
  const clothesColor = o?.c ?? clothes;
  const r = TIER_RATIO[tier];
  const part = (p: Part, c: string, ref?: React.Ref<Mesh>) => (
    <mesh key={`${p.join()}${c}`} ref={ref} position={[p[3], p[4], p[5]]}>
      <boxGeometry args={[p[0], p[1], p[2]]} />
      <meshLambertMaterial color={col(c)} />
    </mesh>
  );
  const cbox = (b: CBox, i: number) => (
    <mesh key={i} position={[b[3], b[4], b[5]]} rotation={[b[7] ?? 0, 0, 0]}>
      <boxGeometry args={[b[0], b[1], b[2]]} />
      <meshLambertMaterial color={col(b[6])} />
    </mesh>
  );

  return (
    <group position={position} rotation={[pose === "lie" ? -Math.PI / 2 : 0, rotY, 0]} scale={scale}>
      <group ref={inner}>
        <group visible={pose !== "sit"}>{spec.legs.map((p) => part(p, "#5C4A3D"))}</group>
        {part(spec.body, clothesColor)}
        {part(spec.arms[0], clothesColor, armL)}
        {part(spec.arms[1], clothesColor, armR)}
        {part(spec.head, SKIN)}
        {spec.hair.map((p) => part(p, HAIR))}
        {part(spec.eyes[0], INK, eyeL)}
        {part(spec.eyes[1], INK, eyeR)}
        {spec.cheeks.map((p) => part(p, CHEEK))}
        {/* 의상 포인트 + 액세서리 — full 티어 좌표를 키 비율로 축소 */}
        {(o?.extra || accessory) && (
          <group scale={r}>
            {o?.extra?.map(cbox)}
            {accessory && ACCESSORIES[accessory]?.map(cbox)}
          </group>
        )}
        {/* 가짜 접지 그림자(수면 시 숨김 — 회전하면 수직 판이 되므로) */}
        {pose !== "lie" && <B p={[0, 0.011, 0]} s={[1.4, 0.02, 1.0]} c={INK} opacity={0.08} />}
      </group>
    </group>
  );
}

// ---------------------------------------------------------------------------
// 고양이(행복도 펫) — 식빵 자세, 강아지와 구분되는 회색 크림
// ---------------------------------------------------------------------------

function VoxelCat({ position, rotY, night }: { position: [number, number, number]; rotY: number; night: boolean }) {
  const c = (hex: string) => (night ? nightify(hex, 0.75) : hex);
  return (
    <group position={position} rotation={[0, rotY, 0]}>
      <B p={[0, 0.15, -0.06]} s={[0.52, 0.3, 0.64]} c={c("#CFC7BB")} />
      <B p={[0, 0.42, 0.26]} s={[0.4, 0.34, 0.36]} c={c("#CFC7BB")} />
      <B p={[0.12, 0.63, 0.22]} s={[0.09, 0.15, 0.06]} c={c("#9A9186")} />
      <B p={[-0.12, 0.63, 0.22]} s={[0.09, 0.15, 0.06]} c={c("#9A9186")} />
      <B p={[0.27, 0.05, 0.14]} s={[0.1, 0.09, 0.46]} c={c("#9A9186")} ry={0.7} />
      <B p={[0, 0.38, 0.45]} s={[0.07, 0.05, 0.04]} c={c("#FFB7C5")} />
    </group>
  );
}

// ---------------------------------------------------------------------------
// 방 본체(바닥·벽·창·침대·책상)
// ---------------------------------------------------------------------------

function Room({ wall, wallSide, floor, night }: { wall: string; wallSide: string; floor: string; night: boolean }) {
  const wood = night ? nightify("#C89B72", 0.6) : "#C89B72";
  const woodDark = night ? nightify("#9C744F", 0.6) : "#9C744F";
  const cream = night ? nightify("#FFF8F0", 0.6) : "#FFF8F0";
  const pane = night ? "#3E4A6B" : "#AEDFF7";
  return (
    <group>
      <B p={[0, -0.25, 0]} s={[10, 0.5, 10]} c={floor} />
      <B p={[-4.85, 2.5, 0]} s={[0.3, 5, 10]} c={wallSide} />
      <B p={[-2.35, 2.5, -4.85]} s={[5.3, 5, 0.3]} c={wall} />
      <B p={[3.85, 2.5, -4.85]} s={[2.3, 5, 0.3]} c={wall} />
      <B p={[1.5, 0.95, -4.85]} s={[2.4, 1.9, 0.3]} c={wall} />
      <B p={[1.5, 4.35, -4.85]} s={[2.4, 1.3, 0.3]} c={wall} />
      <B p={[1.5, 2.8, -4.86]} s={[2.4, 1.8, 0.06]} c={pane} />
      <B p={[1.5, 2.8, -4.82]} s={[0.06, 1.8, 0.05]} c={cream} />
      <B p={[1.5, 2.8, -4.82]} s={[2.4, 0.06, 0.05]} c={cream} />
      <B p={[-3.5, 0.25, -2.9]} s={[2.2, 0.5, 3.6]} c={wood} />
      <B p={[-3.5, 0.85, -4.57]} s={[2.2, 1.2, 0.25]} c={wood} />
      <B p={[-3.5, 0.65, -2.95]} s={[2.0, 0.3, 3.3]} c={cream} />
      <B p={[-3.5, 0.91, -4.0]} s={[1.3, 0.22, 0.7]} c={night ? nightify("#FFB7C5", 0.6) : "#FFB7C5"} />
      <B p={[-3.5, 0.86, -1.95]} s={[2.04, 0.12, 1.8]} c={night ? nightify("#A8E6CF", 0.6) : "#A8E6CF"} />
      <B p={[1.5, 1.15, -4.15]} s={[2.4, 0.15, 1.1]} c={wood} />
      <B p={[0.45, 0.54, -4.575]} s={[0.15, 1.08, 0.15]} c={woodDark} />
      <B p={[2.55, 0.54, -4.575]} s={[0.15, 1.08, 0.15]} c={woodDark} />
      <B p={[0.45, 0.54, -3.725]} s={[0.15, 1.08, 0.15]} c={woodDark} />
      <B p={[2.55, 0.54, -3.725]} s={[0.15, 1.08, 0.15]} c={woodDark} />
    </group>
  );
}

// ---------------------------------------------------------------------------
// 소유 가구 28종 — 방꾸미기 아이템 전체를 복셀로
// ---------------------------------------------------------------------------

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
      {/* --- 확장 20종 --- */}
      {has("poster") && (
        <group position={[3.9, 0, -4.96]}>
          <B p={[0, 2.6, 0]} s={[0.9, 1.2, 0.05]} c={c("#FFE3A3")} />
          <B p={[0, 2.75, 0.04]} s={[0.5, 0.5, 0.04]} c={c("#FF9A8B")} />
          <B p={[0, 2.2, 0.04]} s={[0.3, 0.15, 0.04]} c={c("#A8E6CF")} />
        </group>
      )}
      {has("curtain") && (
        <group position={[1.5, 0, -4.86]}>
          <B p={[0, 3.85, 0]} s={[3.4, 0.08, 0.08]} c={c("#9C744F")} />
          <B p={[-1.5, 2.85, 0]} s={[0.45, 1.95, 0.12]} c={c("#FFB7C5")} />
          <B p={[1.5, 2.85, 0]} s={[0.45, 1.95, 0.12]} c={c("#FFB7C5")} />
          <B p={[-1.5, 2.0, 0.02]} s={[0.15, 0.15, 0.16]} c={c("#FFE3A3")} />
          <B p={[1.5, 2.0, 0.02]} s={[0.15, 0.15, 0.16]} c={c("#FFE3A3")} />
        </group>
      )}
      {has("fishbowl") && (
        <group position={[3.0, 0, 2.1]}>
          <B p={[0, 0.21, 0]} s={[0.5, 0.42, 0.5]} c={c("#C89B72")} />
          <B p={[0, 0.63, 0]} s={[0.46, 0.38, 0.46]} c={c("#AEDFF7")} />
          <B p={[0, 0.8, 0]} s={[0.36, 0.05, 0.36]} c={c("#A8E6CF")} />
          <B p={[0.06, 0.66, 0.09]} s={[0.14, 0.09, 0.05]} c={c("#FF9A8B")} />
        </group>
      )}
      {has("console") && (
        <group position={[1.2, 0, 1.0]} rotation={[0, 2.7, 0]}>
          <B p={[0, 0.55, 0]} s={[0.85, 0.6, 0.14]} c={INK} />
          <B p={[0, 0.57, 0.06]} s={[0.72, 0.46, 0.05]} c={c("#AEDFF7")} />
          <B p={[0, 0.12, 0]} s={[0.35, 0.25, 0.22]} c={INK} />
          <B p={[0.45, 0.06, 0.3]} s={[0.42, 0.12, 0.3]} c={c("#FFF8F0")} />
          <B p={[-0.35, 0.035, 0.35]} s={[0.2, 0.07, 0.13]} c={c("#FFB7C5")} />
        </group>
      )}
      {has("catTower") && (
        <group position={[-3.5, 0, 2.5]} rotation={[0, 0.3, 0]}>
          <B p={[0, 0.07, 0]} s={[0.9, 0.14, 0.9]} c={c("#C89B72")} />
          <B p={[0.16, 0.39, 0.14]} s={[0.5, 0.5, 0.5]} c={c("#FFE3A3")} />
          <B p={[-0.24, 0.76, -0.2]} s={[0.16, 1.25, 0.16]} c={c("#D98E73")} />
          <B p={[-0.24, 1.44, -0.2]} s={[0.62, 0.12, 0.62]} c={c("#FFB7C5")} />
          <B p={[-0.24, 1.65, -0.2]} s={[0.12, 0.3, 0.12]} c={c("#D98E73")} />
          <B p={[-0.24, 1.88, -0.2]} s={[0.5, 0.16, 0.5]} c={c("#A8E6CF")} />
        </group>
      )}
      {has("robotVacuum") && (
        <group position={[-1.8, 0, 2.2]} rotation={[0, 0.6, 0]}>
          <B p={[0, 0.065, 0]} s={[0.55, 0.13, 0.55]} c={c("#FFF8F0")} />
          <B p={[0, 0.06, 0.28]} s={[0.45, 0.1, 0.08]} c={c("#FFB7C5")} />
          <B p={[0, 0.15, 0]} s={[0.12, 0.05, 0.12]} c={INK} />
        </group>
      )}
      {has("chandelier") && (
        <group position={[0, 0, -0.8]}>
          <B p={[0, 4.27, 0]} s={[0.07, 0.45, 0.07]} c={c("#9C744F")} />
          <B p={[0, 3.95, 0]} s={[0.75, 0.22, 0.75]} c={c("#FFE3A3")} />
          <B p={[0.28, 4.06, 0]} s={[0.16, 0.24, 0.16]} c={c("#FFF8F0")} />
          <B p={[-0.28, 4.06, 0]} s={[0.16, 0.24, 0.16]} c={c("#FFF8F0")} />
          <B p={[0, 4.06, 0.28]} s={[0.16, 0.24, 0.16]} c={c("#FFF8F0")} />
          <B p={[0, 3.8, 0]} s={[0.14, 0.14, 0.14]} c={c("#C9B6F2")} />
        </group>
      )}
      {has("artFrame") && (
        <group position={[-4.96, 0, -2.0]}>
          <B p={[0, 2.7, 0]} s={[0.06, 1.0, 0.8]} c={c("#9C744F")} />
          <B p={[0.03, 2.7, 0]} s={[0.05, 0.84, 0.64]} c={c("#FFF8F0")} />
          <B p={[0.06, 2.75, -0.08]} s={[0.05, 0.3, 0.3]} c={c("#A8E6CF")} />
          <B p={[0.06, 2.5, 0.15]} s={[0.05, 0.18, 0.18]} c={c("#FFB7C5")} />
        </group>
      )}
      {has("candleSet") && (
        <group position={[2.2, 0, 0.8]} rotation={[0, -0.2, 0]}>
          <B p={[0, 0.025, 0]} s={[0.42, 0.05, 0.26]} c={c("#9C744F")} />
          <B p={[-0.1, 0.17, 0]} s={[0.1, 0.24, 0.1]} c={c("#FFF8F0")} />
          <B p={[0.08, 0.13, 0.04]} s={[0.09, 0.16, 0.09]} c={c("#FFB7C5")} />
          <B p={[-0.1, 0.32, 0]} s={[0.05, 0.07, 0.05]} c={c("#FFE3A3")} />
          <B p={[0.08, 0.24, 0.04]} s={[0.05, 0.06, 0.05]} c={c("#FFE3A3")} />
        </group>
      )}
      {has("succulents") && (
        <group position={[-3.2, 0, 1.1]}>
          <B p={[-0.2, 0.09, 0]} s={[0.22, 0.18, 0.22]} c={c("#D98E73")} />
          <B p={[-0.2, 0.26, 0]} s={[0.17, 0.17, 0.17]} c={c("#A8E6CF")} />
          <B p={[0.12, 0.07, 0.08]} s={[0.18, 0.14, 0.18]} c={c("#D98E73")} />
          <B p={[0.12, 0.2, 0.08]} s={[0.13, 0.13, 0.13]} c={c("#A8E6CF")} />
          <B p={[0, 0.06, -0.16]} s={[0.14, 0.12, 0.14]} c={c("#D98E73")} />
          <B p={[0, 0.16, -0.16]} s={[0.1, 0.1, 0.1]} c={c("#C9B6F2")} />
        </group>
      )}
      {has("moodLamp") && (
        <group position={[4.5, 0, -2.6]}>
          <B p={[0, 0.04, 0]} s={[0.32, 0.08, 0.32]} c={INK} />
          <B p={[0, 0.44, 0]} s={[0.08, 0.72, 0.08]} c={INK} />
          <B p={[0, 0.96, 0]} s={[0.32, 0.32, 0.32]} c={night ? "#C9B6F2" : c("#C9B6F2")} />
          <B p={[0, 1.15, 0]} s={[0.14, 0.06, 0.14]} c={c("#FFE3A3")} />
          {night && <pointLight position={[0, 1.0, 0]} color="#C9B6F2" intensity={0.5} distance={3.5} decay={2} />}
        </group>
      )}
      {has("teddyBear") && (
        <group position={[-2.5, 0, 1.5]} rotation={[0, 0.6, 0]}>
          <B p={[0, 0.21, 0]} s={[0.4, 0.42, 0.3]} c={c("#D98E73")} />
          <B p={[0, 0.2, 0.14]} s={[0.22, 0.24, 0.06]} c={c("#FFE3A3")} />
          <B p={[0, 0.56, 0]} s={[0.34, 0.3, 0.28]} c={c("#D98E73")} />
          <B p={[-0.13, 0.74, 0]} s={[0.12, 0.12, 0.1]} c={c("#D98E73")} />
          <B p={[0.13, 0.74, 0]} s={[0.12, 0.12, 0.1]} c={c("#D98E73")} />
          <B p={[0, 0.52, 0.15]} s={[0.16, 0.12, 0.08]} c={c("#FFE3A3")} />
        </group>
      )}
      {has("dartboard") && (
        <group position={[-4.95, 0, 2.8]}>
          <B p={[0, 2.6, 0]} s={[0.1, 0.72, 0.72]} c={c("#9C744F")} />
          <B p={[0.02, 2.6, 0]} s={[0.12, 0.52, 0.52]} c={c("#FF9A8B")} />
          <B p={[0.04, 2.6, 0]} s={[0.14, 0.32, 0.32]} c={c("#FFF8F0")} />
          <B p={[0.05, 2.6, 0]} s={[0.16, 0.14, 0.14]} c={INK} />
        </group>
      )}
      {has("turntable") && (
        <group position={[2.6, 0, 0.3]} rotation={[0, -0.4, 0]}>
          <B p={[0, 0.24, 0]} s={[0.7, 0.48, 0.48]} c={c("#C89B72")} />
          <B p={[0, 0.53, 0]} s={[0.66, 0.1, 0.44]} c={c("#FFF8F0")} />
          <B p={[-0.06, 0.6, 0]} s={[0.4, 0.04, 0.4]} c={INK} />
          <B p={[-0.06, 0.63, 0]} s={[0.12, 0.05, 0.12]} c={c("#FF9A8B")} />
          <B p={[0.22, 0.62, -0.06]} s={[0.06, 0.05, 0.28]} c={INK} ry={0.4} />
        </group>
      )}
      {has("vanity") && (
        <group position={[-4.45, 0, 1.9]} rotation={[0, Math.PI / 2, 0]}>
          <B p={[0, 0.6, 0]} s={[1.1, 0.07, 0.5]} c={c("#C89B72")} />
          <B p={[-0.5, 0.29, 0]} s={[0.07, 0.58, 0.44]} c={c("#9C744F")} />
          <B p={[0.5, 0.29, 0]} s={[0.07, 0.58, 0.44]} c={c("#9C744F")} />
          <B p={[0, 1.32, -0.18]} s={[0.72, 0.8, 0.07]} c={c("#C9B6F2")} />
          <B p={[0, 1.32, -0.13]} s={[0.6, 0.68, 0.05]} c={c("#AEDFF7")} />
          <B p={[0.3, 0.7, 0.05]} s={[0.08, 0.14, 0.08]} c={c("#FFB7C5")} />
        </group>
      )}
      {has("miniFridge") && (
        <group position={[4.5, 0, -1.2]} rotation={[0, -Math.PI / 2, 0]}>
          <B p={[0, 0.55, 0]} s={[0.8, 1.1, 0.7]} c={c("#AEDFF7")} />
          <B p={[0, 0.58, 0.37]} s={[0.72, 0.96, 0.07]} c={c("#FFF8F0")} />
          <B p={[-0.28, 0.62, 0.42]} s={[0.06, 0.36, 0.06]} c={INK} />
          <B p={[0.15, 0.75, 0.42]} s={[0.1, 0.1, 0.03]} c={c("#FF9A8B")} />
        </group>
      )}
      {has("airConditioner") && (
        <group position={[3.9, 0, -4.78]}>
          <B p={[0, 3.9, 0]} s={[1.4, 0.44, 0.4]} c={c("#FFF8F0")} />
          <B p={[0, 3.73, 0.2]} s={[1.26, 0.08, 0.06]} c={c("#AEDFF7")} />
          <B p={[0.58, 4.0, 0.21]} s={[0.08, 0.05, 0.04]} c={c("#A8E6CF")} />
        </group>
      )}
      {has("massageChair") && (
        <group position={[3.9, 0, 1.7]} rotation={[0, -0.7, 0]}>
          <B p={[0, 0.11, 0]} s={[1.05, 0.22, 1.0]} c={INK} />
          <B p={[0, 0.38, 0.05]} s={[0.85, 0.32, 0.85]} c={c("#C9B6F2")} />
          <B p={[0, 1.0, -0.32]} s={[0.85, 1.05, 0.34]} c={c("#C9B6F2")} rx={-0.12} />
          <B p={[-0.52, 0.5, 0]} s={[0.2, 0.5, 0.9]} c={INK} />
          <B p={[0.52, 0.5, 0]} s={[0.2, 0.5, 0.9]} c={INK} />
          <B p={[0, 1.42, -0.22]} s={[0.45, 0.22, 0.16]} c={c("#FFB7C5")} />
        </group>
      )}
      {has("bigAquarium") && (
        <group position={[4.4, 0, 0.2]} rotation={[0, -Math.PI / 2, 0]}>
          <B p={[0, 0.25, 0]} s={[1.1, 0.5, 0.6]} c={c("#C89B72")} />
          <B p={[0, 0.91, 0]} s={[1.04, 0.66, 0.54]} c={c("#AEDFF7")} />
          <B p={[0, 0.63, 0]} s={[0.94, 0.09, 0.44]} c={c("#FFE3A3")} />
          <B p={[0.2, 1.0, 0.06]} s={[0.16, 0.1, 0.05]} c={c("#FF9A8B")} />
          <B p={[-0.18, 0.86, -0.04]} s={[0.12, 0.08, 0.05]} c={c("#FFB7C5")} />
          <B p={[-0.35, 0.82, 0.1]} s={[0.1, 0.3, 0.1]} c={c("#A8E6CF")} />
        </group>
      )}
      {has("homeTheater") && (
        <group position={[-0.5, 0, -4.5]}>
          <B p={[0.28, 0.6, 0]} s={[0.35, 1.2, 0.35]} c={INK} />
          <B p={[0.28, 0.42, 0.19]} s={[0.2, 0.2, 0.05]} c={c("#FF9A8B")} />
          <B p={[0.28, 0.95, 0.19]} s={[0.14, 0.14, 0.05]} c={c("#A8E6CF")} />
          <B p={[-0.28, 0.225, 0]} s={[0.48, 0.45, 0.42]} c={c("#9C744F")} />
          <B p={[-0.28, 0.24, 0.22]} s={[0.24, 0.24, 0.05]} c={INK} />
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
  pose: Pose;
  outfit: WardrobeItemKey | null;
  accessory: WardrobeItemKey | null;
  family: { spouse: boolean; children: number };
  pet?: "cat";
}

/** 포즈별 캐릭터 배치 — sit=책상 스툴, lie=침대 위 */
const POSE_PLACEMENT: Record<Pose, { position: [number, number, number]; rotY: number }> = {
  stand: { position: [0.2, 0, -1.2], rotY: 0 },
  exercise: { position: [0.2, 0, -1.2], rotY: 0 },
  sit: { position: [1.4, -0.05, -3.2], rotY: Math.PI },
  lie: { position: [-3.5, 1.12, -1.9], rotY: 0 },
};

export default function VoxelDiorama({
  stage,
  color,
  night,
  items,
  pose,
  outfit,
  accessory,
  family,
  pet,
}: VoxelDioramaProps) {
  const tier = STAGE_CONFIG[stage].tier;
  const theme = STAGE_CONFIG[stage].room;
  const clothes =
    CHARACTER_PALETTES[color as keyof typeof CHARACTER_PALETTES]?.shade ?? "#4FA98A";

  const { wall, wallSide, floor } = useMemo(() => {
    const tint = THEME_TINT[theme];
    const w = mixHex("#FBEFE0", tint.wall, 0.35);
    const ws = mixHex("#F6E4D8", tint.wall, 0.35);
    const fl = mixHex("#EED9BE", tint.floor, 0.35);
    return night
      ? { wall: nightify(w, 0.55), wallSide: nightify(ws, 0.55), floor: nightify(fl, 0.55) }
      : { wall: w, wallSide: ws, floor: fl };
  }, [theme, night]);

  const cc = (hex: string, f = 0.6) => (night ? nightify(hex, f) : hex);
  const place = POSE_PLACEMENT[pose];

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
        {/* 공부 중: 스툴 + 책상 위 책 */}
        {pose === "sit" && (
          <group>
            <B p={[1.4, 0.225, -3.2]} s={[0.7, 0.45, 0.7]} c={cc("#C89B72")} />
            <B p={[1.4, 1.23, -3.95]} s={[0.55, 0.06, 0.38]} c={cc("#FFF8F0")} />
          </group>
        )}
        <VoxelCharacter
          tier={tier}
          clothes={clothes}
          night={night}
          pose={pose}
          position={place.position}
          rotY={place.rotY}
          outfit={outfit}
          accessory={accessory}
        />
        {/* 가족 — 배우자(포도색 정장 톤) + 아이 1~2명 */}
        {family.spouse && (
          <VoxelCharacter
            tier="full"
            clothes="#C9B6F2"
            night={night}
            position={[-1.4, 0, -0.9]}
            rotY={1.5}
            scale={0.92}
            phase={1.3}
          />
        )}
        {family.children >= 1 && (
          <VoxelCharacter
            tier="tiny"
            clothes="#FFE3A3"
            night={night}
            position={[0.9, 0, 0.6]}
            rotY={0.7}
            phase={0.7}
          />
        )}
        {family.children >= 2 && (
          <VoxelCharacter
            tier="small"
            clothes="#AEDFF7"
            night={night}
            position={[2.1, 0, 0.85]}
            rotY={0.35}
            scale={0.82}
            phase={2.1}
          />
        )}
        {/* 행복도 펫 고양이 — 잘 때는 침대 발치 이불 위로 이동 */}
        {pet === "cat" &&
          (pose === "lie" ? (
            <VoxelCat position={[-2.7, 0.92, -1.55]} rotY={-0.6} night={night} />
          ) : (
            <VoxelCat position={[-3.2, 0.8, -3.25]} rotY={0.5} night={night} />
          ))}
      </Sway>
    </Canvas>
  );
}
