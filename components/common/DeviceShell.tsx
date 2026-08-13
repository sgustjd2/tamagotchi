"use client";

// 다마고치 기기 셸 — 대시보드 전체를 파스텔 플라스틱 에그 프레임으로 감싼다.
// 구조: 플라스틱 바디 > 잉크 베젤 > LCD 스크린(children) > 하단 친(A/B/C 물리 버튼).
// 버튼 기능은 콜백으로만 받아 셸 자체는 멍청하게 유지.

import type { ReactNode } from "react";

export function DeviceShell({
  children,
  onA,
  onB,
  onC,
}: {
  children: ReactNode;
  onA: () => void;
  onB: () => void;
  onC: () => void;
}) {
  return (
    <div className="mx-auto h-dvh max-w-5xl px-1.5 pb-[calc(4.25rem+env(safe-area-inset-bottom))] pt-1.5 sm:px-3 sm:pt-2 lg:pb-3">
      {/* 플라스틱 바디 — 위가 더 둥근 에그 실루엣 */}
      <div className="relative flex h-full min-h-0 flex-col rounded-[2.25rem_2.25rem_1.75rem_1.75rem] border-[3px] border-ink bg-gradient-to-b from-blush via-[#FFD3DC] to-cream p-2 shadow-[5px_6px_0_0_rgba(46,39,34,0.16)] sm:p-2.5 md:rounded-[3.5rem_3.5rem_2.5rem_2.5rem] md:p-3">
        {/* 곡면 플라스틱 하이라이트 */}
        <span
          aria-hidden
          className="pointer-events-none absolute left-8 top-2.5 h-3 w-20 rounded-full bg-white/45 blur-[5px] md:left-12 md:top-4 md:h-4 md:w-32"
        />
        {/* 베젤(잉크 림) + LCD 스크린 */}
        <div className="min-h-0 flex-1 rounded-[1.75rem] border-[3px] border-ink bg-ink p-1.5 shadow-[inset_0_3px_6px_rgba(0,0,0,0.45)] md:rounded-[2.5rem] md:p-2">
          <div className="lcd flex h-full min-h-0 flex-col gap-2.5 overflow-hidden px-3 pb-1 pt-2.5 shadow-[inset_0_2px_10px_rgba(46,39,34,0.28)] md:px-4 md:pt-3">
            {children}
          </div>
        </div>
        {/* 친 — 물리 버튼 3개(가운데가 낮은 에그 곡선 배치) */}
        <div className="flex shrink-0 items-start justify-center gap-7 px-4 pb-2 pt-2 md:gap-10 md:pt-3">
          <button
            type="button"
            onClick={onA}
            aria-label="이전 탭 (A 버튼)"
            className="shell-btn h-12 w-12 bg-blush text-sm focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-sky"
          >
            A
          </button>
          <button
            type="button"
            onClick={onB}
            aria-label="확인 — 현재 탭 맨 위로 (B 버튼)"
            className="shell-btn mt-2.5 h-14 w-14 bg-butter text-base focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-sky"
          >
            B
          </button>
          <button
            type="button"
            onClick={onC}
            aria-label="다음 탭 (C 버튼)"
            className="shell-btn h-12 w-12 bg-mint text-sm focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-sky"
          >
            C
          </button>
        </div>
        {/* 나사 디테일 */}
        <span
          aria-hidden
          className="absolute bottom-3 left-4 h-2 w-2 rounded-full bg-ink/25 shadow-[inset_0_1px_2px_rgba(46,39,34,0.6)]"
        />
        <span
          aria-hidden
          className="absolute bottom-3 right-4 h-2 w-2 rounded-full bg-ink/25 shadow-[inset_0_1px_2px_rgba(46,39,34,0.6)]"
        />
      </div>
    </div>
  );
}
