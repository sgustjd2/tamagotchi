"use client";

// 8비트 효과음 토글 — 대시보드 헤더. 상태는 localStorage(lifegotchi:muted)로 영속.

import { useEffect, useState } from "react";
import { isMuted, setMuted } from "@/lib/sound/beeps";

export function SoundToggle() {
  const [muted, setMutedState] = useState(true); // SSR 기본은 음소거 표시
  useEffect(() => {
    setMutedState(isMuted());
  }, []);

  const toggle = () => {
    const next = !muted;
    setMuted(next);
    setMutedState(next);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className="tap-44 pill bg-white py-1.5 text-ink/60 transition-colors hover:bg-cream md:py-0.5"
      title={muted ? "효과음 켜기" : "효과음 끄기"}
    >
      {muted ? "🔇" : "🔊"}
    </button>
  );
}
