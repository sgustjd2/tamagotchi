// 엔딩 결산 카드(이미지) 생성 + 공유/복사/저장. 백엔드·외부전송 없음(로컬 canvas).
// 그리기 언어·공유 파이프라인은 cardCanvas.ts 공용(순간 카드와 공유).
import type { Character } from "@/types/character";
import { computeLifeScore, formatMoney, lifeEnding } from "@/lib/game/ending";
import {
  computeRankings,
  percentileFor,
  RANK_META,
  RANK_ORDER,
} from "@/lib/game/ranking";
import { DEGREE_LABEL } from "@/lib/game/degree";
import {
  CARD_COLORS as C,
  CARD_PIXEL_FONT as PIXEL,
  drawMascotBox,
  roundRect as rr,
  shareCanvas,
  waitForFonts,
  type ShareResult,
} from "./cardCanvas";

export type { ShareResult };

export function drawEndingCard(canvas: HTMLCanvasElement, c: Character) {
  const W = 720;
  const H = 900;
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
  rr(ctx, 8, 8, W - 16, H - 16, 28);
  ctx.stroke();

  const ending = lifeEnding(c);
  const score = computeLifeScore(c);
  const scores = computeRankings(c);
  const age = c.deathAge ?? c.ageYears;

  ctx.textAlign = "center";
  ctx.fillStyle = C.ink;
  ctx.font = `bold 22px ${PIXEL}`;
  ctx.fillText("LifeGotchi · 인생 결산", W / 2, 56);

  // 마스코트 (기기 색 + LCD) — 평온한 마지막 모습
  const boxS = 188;
  const boxX = (W - boxS) / 2;
  const boxY = 78;
  drawMascotBox(ctx, c, boxX, boxY, boxS, "retirement");

  let y = boxY + boxS + 46;
  ctx.fillStyle = C.ink;
  ctx.font = `bold 34px ${PIXEL}`;
  ctx.fillText(`${c.name}의 인생`, W / 2, y);
  y += 28;
  ctx.font = `16px ${PIXEL}`;
  ctx.fillStyle = "rgba(46,39,34,0.6)";
  const genSuffix = (c.generation ?? 1) >= 2 ? ` · ${c.generation}세대` : "";
  ctx.fillText(`만 ${age}세 · ${c.deathCause ?? "노환"}${genSuffix}`, W / 2, y);

  // 엔딩 타이틀 박스
  y += 22;
  const etX = 60;
  const etW = W - 120;
  ctx.fillStyle = C.butter;
  rr(ctx, etX, y, etW, 70, 16);
  ctx.fill();
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 4;
  rr(ctx, etX, y, etW, 70, 16);
  ctx.stroke();
  ctx.fillStyle = C.ink;
  ctx.font = `bold 25px ${PIXEL}`;
  ctx.fillText(ending.title, W / 2, y + 32);
  ctx.font = `13px ${PIXEL}`;
  ctx.fillStyle = "rgba(46,39,34,0.65)";
  ctx.fillText(ending.subtitle, W / 2, y + 54);

  y += 70 + 36;
  ctx.fillStyle = C.ink;
  ctx.font = `bold 21px ${PIXEL}`;
  ctx.fillText(`인생 점수  ${score} / 100`, W / 2, y);

  // 5종 랭킹 막대
  y += 26;
  const rowX = 72;
  const rowW = W - 144;
  for (const cat of RANK_ORDER) {
    const s = scores[cat];
    const top = percentileFor(cat, s);
    ctx.textAlign = "left";
    ctx.font = `bold 15px ${PIXEL}`;
    ctx.fillStyle = C.ink;
    ctx.fillText(RANK_META[cat].label, rowX, y + 13);
    ctx.textAlign = "right";
    ctx.fillStyle = "rgba(46,39,34,0.55)";
    ctx.fillText(`상위 ${top}%`, rowX + rowW, y + 13);
    const barY = y + 20;
    const barH = 9;
    ctx.fillStyle = "rgba(46,39,34,0.1)";
    rr(ctx, rowX, barY, rowW, barH, 5);
    ctx.fill();
    ctx.fillStyle = C.mint;
    rr(ctx, rowX, barY, (rowW * Math.max(0, Math.min(100, s))) / 100, barH, 5);
    ctx.fill();
    y += 40;
  }

  y += 8;
  ctx.textAlign = "center";
  ctx.font = `15px ${PIXEL}`;
  ctx.fillStyle = "rgba(46,39,34,0.7)";
  const jobLabel = c.job ? c.job.title : "무직 (자유인)";
  const kids = c.childrenBornAges?.length ?? 0;
  const familyLabel =
    c.marriedAtAge != null ? `기혼${kids > 0 ? `·자녀${kids}` : ""}` : "미혼";
  ctx.fillText(
    `${DEGREE_LABEL[c.degree]} · ${jobLabel} · ${familyLabel} · 저축 ${formatMoney(c.savings)}`,
    W / 2,
    y,
  );
  y += 30;
  ctx.font = `bold 13px ${PIXEL}`;
  ctx.fillStyle = "rgba(46,39,34,0.4)";
  ctx.fillText("LifeGotchi 에서 내 인생 키우기 🐣", W / 2, y);
}

/** 결산 카드 PNG 를 공유(모바일)→클립보드→다운로드 순으로 시도 */
export async function shareEndingCard(c: Character): Promise<ShareResult> {
  await waitForFonts();
  const canvas = document.createElement("canvas");
  drawEndingCard(canvas, c);
  return shareCanvas(canvas, {
    filename: "lifegotchi-인생결산.png",
    title: "LifeGotchi 인생 결산",
    text: `${c.name}의 인생 결산!`,
  });
}
