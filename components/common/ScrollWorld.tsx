"use client";

// 스크롤 월드 — 스크롤하면 카메라가 픽셀 방으로 다가가듯 커졌다가(접근)
// 제자리를 찾고(안착), 타이틀·CTA 가 떠오르는 입장 연출. 랜딩과 캐릭터 생성이
// 같은 컴포넌트를 공유해 "한 세계" 감각을 유지한다.
//
// 이전 구현(ScrollIntro)의 실패 원인과 수정:
//  - 시작 스케일 0.65 → 첫 화면에 방이 콩알만 하고 빈 여백 바다 → 0.9 로 상향
//  - 섹션 190vh → 스크롤 구간이 길어 콘텐츠가 한참 아래 → 150vh 로 단축
//  - 콘텐츠 등장 p 0.55 → 0.35 로 앞당겨 빈 화면 구간 최소화
// 모션 감소 설정·SSR·JS 미지원에선 정적 히어로로 대체.

import { useEffect, useRef, useState, type ReactNode } from "react";

export function ScrollWorld({
  stage,
  content,
  hint = "↓ 스크롤해서 입장",
}: {
  stage: ReactNode;
  content: ReactNode;
  hint?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const [p, setP] = useState(0);
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setActive(true);
  }, []);

  useEffect(() => {
    if (!active) return;
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
  }, [active]);

  // 카메라: 접근(0.9→1.28) 후 안착(→1). 콘텐츠는 p 0.35부터 떠오른다
  const scale =
    p < 0.45 ? 0.9 + p * 0.85 : 1.28 - ((p - 0.45) / 0.55) * 0.28;
  const reveal = Math.min(1, Math.max(0, (p - 0.35) / 0.4));

  return (
    <section ref={ref} className={active ? "relative h-[150vh] w-full" : "w-full"}>
      <div
        className={
          active
            ? "sticky top-0 flex h-dvh flex-col items-center justify-center overflow-hidden"
            : "flex flex-col items-center"
        }
      >
        <div
          style={active ? { transform: `scale(${scale})` } : undefined}
          // w-full 필수: 3D 방(aspect-square w-full)은 부모 폭이 auto 면 0으로
          // 수축해 점만 남는다(2D 방은 고정 px 라 무관)
          className="mb-5 flex w-full justify-center will-change-transform"
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
            {hint}
          </div>
        )}
      </div>
    </section>
  );
}
