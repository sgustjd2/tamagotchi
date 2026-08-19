"use client";

// 첫 진입 1회용 온보딩 카드 — 대시보드에 처음 도착한 유저에게 "지금 할 일 3줄"만
// 알려주고 사라진다(SaveNotice 와 같은 localStorage 1회 플래그 패턴).
// 튜토리얼급 대공사 없이 초반 이탈을 줄이는 최소 장치.

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { GAME_YEAR_MS } from "@/lib/game/constants";

const KEY = "lifegotchi:firstVisitGuideDismissed";

const STEPS = [
  { emoji: "🍚", text: "케어 탭에서 밥·씻기기·칭찬으로 컨디션을 챙겨 주세요." },
  { emoji: "📊", text: "상태 탭에서 컨디션 전체와 스탯 포인트 배분을 볼 수 있어요." },
  {
    emoji: "⏱️",
    text: `게임 1년 = 현실 ${GAME_YEAR_MS / 60000}분 — 연말마다 한 해 결산이 도착해요.`,
  },
];

export function FirstVisitGuide() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(KEY)) setShow(true);
    } catch {
      /* localStorage 사용 불가 시 무시 */
    }
  }, []);

  if (!show) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(KEY, "1");
    } catch {
      /* 무시 */
    }
    setShow(false);
  };

  return (
    <div className="card border-butter bg-butter/25 p-3">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-pixel text-sm font-bold text-ink/80">
          👋 처음 오셨네요! 지금 할 일
        </h3>
        <button
          type="button"
          onClick={dismiss}
          className="tap-44 -m-1 rounded-full p-1 hover:bg-black/5"
          aria-label="가이드 닫기"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <ul className="mt-1.5 flex flex-col gap-1">
        {STEPS.map((s) => (
          <li key={s.emoji} className="flex gap-1.5 text-[12px] leading-snug text-ink/70">
            <span>{s.emoji}</span>
            <span>{s.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
