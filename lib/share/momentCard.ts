// 순간 공유 카드 — 엔딩(9시간 후)에만 잠겨 있던 바이럴 훅을 앞당긴다.
// 취업 합격·연봉협상 성공·레어 뽑기 같은 중간 하이라이트를 이미지 한 장으로.
import type { Character } from "@/types/character";
import {
  CARD_COLORS as C,
  CARD_PIXEL_FONT as PIXEL,
  drawMascotBox,
  roundRect,
  shareCanvas,
  waitForFonts,
  type ShareResult,
} from "./cardCanvas";

export interface Moment {
  /** 타이틀 옆 이모지 (예: 💼 💰 🎁) */
  emoji: string;
  /** 큰 제목 (예: "합격!") */
  title: string;
  /** 제목 아래 한 줄 (예: "대기업 · 백엔드 개발자") */
  subtitle: string;
  /** 추가 정보 줄들 (예: "초봉 4,200만원") */
  lines?: string[];
}

export function drawMomentCard(
  canvas: HTMLCanvasElement,
  c: Character,
  m: Moment,
) {
  const W = 720;
  const H = 640;
  const S = 2;
  canvas.width = W * S;
  canvas.height = H * S;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.scale(S, S);

  ctx.fillStyle = C.cream;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 8;
  roundRect(ctx, 8, 8, W - 16, H - 16, 28);
  ctx.stroke();

  ctx.textAlign = "center";
  ctx.fillStyle = C.ink;
  ctx.font = `bold 22px ${PIXEL}`;
  ctx.fillText("LifeGotchi · 인생의 순간", W / 2, 56);

  const boxS = 176;
  drawMascotBox(ctx, c, (W - boxS) / 2, 78, boxS);

  let y = 78 + boxS + 44;
  ctx.fillStyle = C.ink;
  ctx.font = `bold 26px ${PIXEL}`;
  ctx.fillText(`${c.name} · 만 ${c.ageYears}세`, W / 2, y);

  // 타이틀 박스 (엔딩 카드와 동일한 butter 강조 박스)
  y += 24;
  const etX = 60;
  const etW = W - 120;
  ctx.fillStyle = C.butter;
  roundRect(ctx, etX, y, etW, 76, 16);
  ctx.fill();
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 4;
  roundRect(ctx, etX, y, etW, 76, 16);
  ctx.stroke();
  ctx.fillStyle = C.ink;
  ctx.font = `bold 30px ${PIXEL}`;
  ctx.fillText(`${m.emoji} ${m.title}`, W / 2, y + 36);
  ctx.font = `14px ${PIXEL}`;
  ctx.fillStyle = "rgba(46,39,34,0.65)";
  ctx.fillText(m.subtitle, W / 2, y + 60);

  y += 76 + 40;
  ctx.fillStyle = C.ink;
  ctx.font = `bold 19px ${PIXEL}`;
  for (const line of m.lines ?? []) {
    ctx.fillText(line, W / 2, y);
    y += 30;
  }

  ctx.font = `bold 13px ${PIXEL}`;
  ctx.fillStyle = "rgba(46,39,34,0.4)";
  ctx.fillText("LifeGotchi 에서 내 인생 키우기 🐣", W / 2, H - 40);
}

/** 순간 카드 PNG 공유 — Web Share → 클립보드 → 다운로드 */
export async function shareMomentCard(
  c: Character,
  m: Moment,
): Promise<ShareResult> {
  await waitForFonts();
  const canvas = document.createElement("canvas");
  drawMomentCard(canvas, c, m);
  return shareCanvas(canvas, {
    filename: `lifegotchi-${m.title}.png`,
    title: `LifeGotchi — ${m.title}`,
    text: `${c.name}: ${m.title} ${m.subtitle}`,
  });
}
