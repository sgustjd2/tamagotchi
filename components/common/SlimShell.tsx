import type { ReactNode } from "react";
import Link from "next/link";

/**
 * 위성 페이지(도움말·성장기록·랭킹)용 얇은 셸.
 * 대시보드의 DeviceShell 처럼 기기 전체를 감싸지는 않고, 같은 파스텔 플라스틱 톤
 * (blush → cream 그라데이션 + 잉크 하드보더 + 하드섀도)의 헤더 바만 씌워
 * 대시보드에서 넘어왔을 때 다른 앱처럼 느껴지지 않게 한다.
 */
export function SlimShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <main className="mx-auto max-w-2xl px-4 py-4 pb-[calc(6rem+env(safe-area-inset-bottom))]">
      <header className="mb-4 flex items-center justify-between rounded-2xl border-[3px] border-ink bg-gradient-to-b from-blush via-[#FFD3DC] to-cream px-4 py-2.5 shadow-[4px_4px_0_0_rgba(46,39,34,0.16)]">
        <Link
          href="/dashboard"
          className="tap-44 font-pixel text-sm font-bold text-ink/60 hover:text-ink"
        >
          ← 대시보드
        </Link>
        <h1 className="font-pixel text-base font-bold">{title}</h1>
        <span className="w-16" aria-hidden />
      </header>
      {subtitle && <p className="mb-3 text-sm text-ink/55">{subtitle}</p>}
      {children}
    </main>
  );
}
