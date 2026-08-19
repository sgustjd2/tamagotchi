"use client";

import { useEffect, useState } from "react";

import type { Character } from "@/types/character";
import {
  computeRankings,
  percentileFor,
  RANK_META,
  RANK_ORDER,
} from "@/lib/game/ranking";
import { getMascotColor } from "@/lib/game/constants";
import { getHall, type HallEntry } from "@/lib/storage/hall";
import { PixelIcon } from "@/components/pixel/PixelIcon";
import { StatBar } from "@/components/common/StatBar";

export function RankingPanel({ character }: { character: Character }) {
  const scores = computeRankings(character);
  const [hall, setHall] = useState<HallEntry[]>([]);

  useEffect(() => {
    setHall(getHall());
  }, [character.id]);

  return (
    <div className="space-y-4">
      {/* 현재 캐릭터 5종 점수 + 추정 퍼센타일 */}
      <div className="card p-5">
        <div className="flex items-center justify-between">
          <h3 className="font-pixel text-sm font-bold text-ink/80">
            {character.name}의 랭킹
          </h3>
          <span className="pill bg-grape/20 text-ink/70">
            종합 {scores.overall}
          </span>
        </div>

        <div className="mt-4 space-y-3.5">
          {RANK_ORDER.map((cat) => {
            const score = scores[cat];
            const top = percentileFor(cat, score);
            return (
              <div key={cat}>
                <div className="mb-1 flex items-center gap-1.5">
                  <PixelIcon name={RANK_META[cat].icon} size={14} />
                  <span className="font-pixel text-[12px] font-bold text-ink/75">
                    {RANK_META[cat].label}
                  </span>
                  <span className="ml-auto pill bg-black/[0.05] text-ink/60">
                    추정 상위 {top}%
                  </span>
                </div>
                <StatBar label="" value={score} />
              </div>
            );
          })}
        </div>

        <p className="mt-4 font-sans text-[11px] leading-relaxed text-ink/40">
          ※ 퍼센타일은 실제 다른 사용자가 아닌 <b>게임 난이도 기준선</b>으로 추정한
          값이에요. 개인정보·서버 전송 없이 이 기기에서만 계산돼요.
        </p>
      </div>

      {/* 명예의전당 (본인 역대 회차) */}
      <div className="card p-5">
        <h3 className="mb-3 font-pixel text-sm font-bold text-ink/80">
          명예의전당 · 역대 인생
        </h3>
        {hall.length === 0 ? (
          <p className="rounded-xl bg-black/[0.03] px-4 py-6 text-center font-sans text-[13px] text-ink/50">
            아직 기록이 없어요. 한 생을 마치면 이곳에 점수가 남아요.
          </p>
        ) : (
          <ol className="space-y-2">
            {hall.map((e, i) => {
              const me = e.id === character.id;
              const col = getMascotColor(e.color);
              return (
                <li
                  key={e.id}
                  className={`flex items-center gap-3 rounded-xl border-2 px-3 py-2.5 ${
                    me
                      ? "border-ink bg-grape/15"
                      : "border-ink/10 bg-black/[0.02]"
                  }`}
                >
                  <span className="w-6 text-center font-pixel text-sm font-bold text-ink/45">
                    {i + 1}
                  </span>
                  <span
                    className="h-5 w-5 shrink-0 rounded-md border-2 border-ink/30"
                    style={{ background: col.body }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate font-pixel text-[13px] font-bold">
                        {e.name}
                      </span>
                      {me && (
                        <span className="pill bg-grape text-ink">이번 생</span>
                      )}
                    </div>
                    <div className="font-pixel text-[10px] text-ink/45">
                      만 {e.ageAtDeath}세 · {e.jobTitle ?? "무직"}
                    </div>
                  </div>
                  <span className="pill bg-black/[0.05] text-ink/70">
                    {e.scores.overall}점
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
}
