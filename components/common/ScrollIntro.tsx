"use client";

// 스크롤 인트로 — 스크롤하면 카메라가 픽셀 집으로 다가가듯 방이 커졌다가(접근)
// 제자리를 찾고(안착), 이어서 타이틀·CTA가 떠오른다. 영상·외부 라이브러리 없이
// transform/opacity만 사용. 모션 감소 설정·SSR·JS 미지원에선 정적 히어로로 대체.

import { useEffect, useRef, useState, type ReactNode } from "react";

export function ScrollIntro({
  stage,
  content,
}: {
  stage: ReactNode;
  content: ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  const [p, setP] = useState(0);
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setActive(true);
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const el = ref.current;
        if (!el) return;
        const total = el.offsetHeight - window.innerHeight;
        const y = -el.getBoundingClientRect().top;
        setP(Math.min(1, Math.max(0, total > 0 ? y / total : 1)));
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  // 카메라: 접근(0.65→1.35) 후 안착(→1). 콘텐츠는 후반부에 떠오른다
  const scale = p < 0.5 ? 0.65 + p * 1.4 : 1.35 - (p - 0.5) * 0.7;
  const reveal = Math.min(1, Math.max(0, (p - 0.55) / 0.35));

  return (
    <section ref={ref} className={active ? "relative h-[190vh] w-full" : "w-full"}>
      <div
        className={
          active
            ? "sticky top-0 flex h-dvh flex-col items-center justify-center overflow-hidden"
            : "flex flex-col items-center"
        }
      >
        <div
          style={active ? { transform: `scale(${scale})` } : undefined}
          className="mb-5 will-change-transform"
        >
          {stage}
        </div>
        <div
          style={
            active
              ? { opacity: reveal, transform: `translateY(${(1 - reveal) * 24}px)` }
              : undefined
          }
          className="flex flex-col items-center text-center"
        >
          {content}
        </div>
        {active && p < 0.12 && (
          <div className="pointer-events-none absolute bottom-8 animate-bob font-pixel text-xs text-ink/50">
            ↓ 스크롤해서 입장
          </div>
        )}
      </div>
    </section>
  );
}
