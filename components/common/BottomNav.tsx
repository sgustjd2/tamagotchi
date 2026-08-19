"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const TABS = [
  { href: "/dashboard", label: "홈" },
  { href: "/history", label: "성장기록" },
  { href: "/ranking", label: "랭킹" },
  { href: "/help", label: "도움말" },
];

export function BottomNav() {
  const path = usePathname();
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t-[3px] border-ink bg-white lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto flex max-w-md items-stretch justify-around">
        {TABS.map((t) => {
          // 홈 탭은 /career(직장·취업) 하위 화면에서도 활성 표시
          const active =
            t.href === "/dashboard"
              ? path === "/dashboard" || path.startsWith("/career")
              : path === t.href;
          return (
            <Link
              key={t.href}
              href={t.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-3 font-pixel text-xs font-bold transition-colors",
                active ? "text-ink" : "text-ink/70",
              )}
            >
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  active ? "bg-coral" : "bg-transparent",
                )}
              />
              {t.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
