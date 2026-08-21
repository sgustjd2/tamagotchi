// 공유 카드 공용 캔버스 유틸 — 엔딩 결산 카드와 순간 카드(합격·협상·뽑기)가
// 같은 그리기 언어(크림 배경 + 잉크 하드보더 + 기기색 마스코트)와
// 같은 공유 파이프라인(Web Share → 클립보드 → 다운로드)을 쓰도록 분리.
import type { Character, LifeStage } from "@/types/character";
import { getMascotColor } from "@/lib/game/constants";
import {
  buildCharacterMatrix,
  GRID_H,
  GRID_W,
  matrixToCells,
} from "@/lib/game/sprite/characterStageConfig";
import {
  getCharacterVisualState,
  jobTypeFromFamily,
} from "@/lib/game/sprite/characterVisualState";
import { colorForCode, LCD_INK_PALETTE } from "@/lib/game/sprite/characterPalettes";
import { bodyShapeForWeight } from "@/lib/game/weight";

export const CARD_COLORS = {
  cream: "#FFF8F0",
  ink: "#2E2722",
  lcd: "#E5EAD2",
  lcdink: "#3A2E22",
  butter: "#FFE3A3",
  mint: "#A8E6CF",
  white: "#FFFFFF",
  blush: "#FF9FB0",
};

export const CARD_PIXEL_FONT = "'Galmuri11', 'DungGeunMo', monospace";

/** 둥근 사각형 패스 */
export function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** 기기색 박스 + LCD + 실제 게임과 동일한 픽셀 캐릭터 마스코트 */
export function drawMascotBox(
  ctx: CanvasRenderingContext2D,
  c: Character,
  x: number,
  y: number,
  size: number,
  stage?: LifeStage,
) {
  const C = CARD_COLORS;
  const col = getMascotColor(c.color);
  ctx.fillStyle = col.body;
  roundRect(ctx, x, y, size, size, 26);
  ctx.fill();
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 5;
  roundRect(ctx, x, y, size, size, 26);
  ctx.stroke();
  const pad = Math.round(size * 0.12);
  const lcd = size - pad * 2;
  ctx.fillStyle = C.lcd;
  roundRect(ctx, x + pad, y + pad, lcd, lcd, 14);
  ctx.fill();

  const lifeStage = stage ?? c.lifeStage;
  const vs = getCharacterVisualState({
    lifeStage,
    mood: 85,
    hunger: 70,
    energy: 70,
    health: 80,
    burnout: 0,
  });
  const matrix = buildCharacterMatrix(
    vs,
    lifeStage,
    jobTypeFromFamily(c.job?.family),
    c.gender,
    c.appearance,
    bodyShapeForWeight(c.status.weight, c.deathAge ?? c.ageYears),
  );
  const cells = matrixToCells(matrix);
  const px = (lcd / GRID_H) * 0.92; // 세로(20칸)에 맞춤
  const gx = x + pad + (lcd - px * GRID_W) / 2;
  const gy = y + pad + (lcd - px * GRID_H) / 2;
  cells.forEach((cell) => {
    const color = colorForCode(cell.code, LCD_INK_PALETTE);
    if (!color) return;
    ctx.fillStyle = color;
    ctx.fillRect(
      Math.floor(gx + cell.x * px),
      Math.floor(gy + cell.y * px),
      Math.ceil(px),
      Math.ceil(px),
    );
  });
}

export type ShareResult = "shared" | "copied" | "downloaded" | "failed";

/** 캔버스 PNG 를 공유(모바일)→클립보드→다운로드 순으로 시도 */
export async function shareCanvas(
  canvas: HTMLCanvasElement,
  opts: { filename: string; title: string; text: string },
): Promise<ShareResult> {
  const blob = await new Promise<Blob | null>((res) =>
    canvas.toBlob((b) => res(b), "image/png"),
  );
  if (!blob) return "failed";

  const file = new File([blob], "lifegotchi.png", { type: "image/png" });
  const nav = navigator as Navigator & {
    canShare?: (d: { files: File[] }) => boolean;
    share?: (d: unknown) => Promise<void>;
  };

  // 1) Web Share (모바일)
  try {
    if (nav.canShare && nav.canShare({ files: [file] }) && nav.share) {
      await nav.share({ files: [file], title: opts.title, text: opts.text });
      return "shared";
    }
  } catch (e) {
    if ((e as { name?: string })?.name === "AbortError") return "shared";
  }

  // 2) 클립보드 이미지
  try {
    const CItem = (window as unknown as { ClipboardItem?: typeof ClipboardItem })
      .ClipboardItem;
    if (navigator.clipboard && CItem) {
      await navigator.clipboard.write([new CItem({ "image/png": blob })]);
      return "copied";
    }
  } catch {
    /* 클립보드 실패 → 다운로드 */
  }

  // 3) 다운로드
  try {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = opts.filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    return "downloaded";
  } catch {
    return "failed";
  }
}

/** 폰트 로드 대기(실패해도 기본 폰트로 진행) */
export async function waitForFonts() {
  try {
    await (document.fonts?.ready ?? Promise.resolve());
  } catch {
    /* 무시 */
  }
}
