"use client";

import Link from "next/link";

import { useGameStore } from "@/lib/store/useGameStore";

export function StartCta() {
  const hydrated = useGameStore((s) => s.hydrated);
  const hasCharacter = useGameStore((s) => !!s.character);

  const href = hydrated && hasCharacter ? "/dashboard" : "/create";
  const label = hydrated && hasCharacter ? "이어서 키우기 →" : "지금 시작하기 →";

  return (
    <Link
      href={href}
      className="toy-btn inline-block bg-coral px-8 py-4 text-lg text-ink shadow-toy hover:-translate-y-0.5"
    >
      {label}
    </Link>
  );
}
