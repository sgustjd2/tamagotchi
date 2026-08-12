"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";

import type { CharacterAppearance, CharacterStatus, Gender } from "@/types/character";
import { CharacterPreviewCard } from "@/components/character/CharacterPreviewCard";
import { MASCOT_COLORS } from "@/lib/game/constants";
import { DEFAULT_APPEARANCE } from "@/lib/game/sprite/characterStageConfig";
import { rollAppearance } from "@/lib/game/sprite/characterAppearance";
import { paletteForColor } from "@/lib/game/sprite/characterPalettes";
import { useGameStore } from "@/lib/store/useGameStore";
import { cn } from "@/lib/utils";

// 미리보기용 기분 좋은 상태
const PREVIEW_STATUS: CharacterStatus = {
  hunger: 80,
  energy: 85,
  mood: 85,
  health: 90,
  stress: 8,
  focus: 60,
  sleepQuality: 85,
  cleanliness: 85,
  confidence: 50,
  burnout: 0,
  weight: 10,
};

export default function CreatePage() {
  const router = useRouter();
  const hydrated = useGameStore((s) => s.hydrated);
  const existing = useGameStore((s) => s.character);
  const createNew = useGameStore((s) => s.createNew);
  const reset = useGameStore((s) => s.reset);

  const [name, setName] = useState("");
  const [color, setColor] = useState(MASCOT_COLORS[0].key);
  const [gender, setGender] = useState<Gender>("male");
  // 미리보기와 실제 생성 결과가 똑같도록, 화면에 보여준 뽑기 결과를 그대로 생성에 사용.
  // 초기값은 서버/클라이언트가 항상 같은 DEFAULT_APPEARANCE로 시작(하이드레이션 불일치 방지)
  // 하고, 마운트 후(클라이언트 전용) useEffect 에서 실제로 랜덤 뽑기를 한다.
  const [appearance, setAppearance] = useState<CharacterAppearance>(DEFAULT_APPEARANCE);
  useEffect(() => {
    setAppearance(rollAppearance());
  }, []);

  const handleStart = () => {
    createNew(name, color, gender, appearance);
    router.push("/dashboard");
  };

  // 이미 키우는 캐릭터가 있을 때
  if (hydrated && existing) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-5 text-center">
        <div className="card w-full p-7">
          <div className="mx-auto max-w-[180px]">
            <CharacterPreviewCard
              lifeStage={existing.lifeStage}
              status={existing.status}
              gender={existing.gender}
              jobFamily={existing.job?.family}
              appearance={existing.appearance}
              width={180}
            />
          </div>
          <h1 className="mt-4 font-pixel text-xl font-bold">
            이미 키우는 캐릭터가 있어요
          </h1>
          <p className="mt-1 font-pixel text-sm text-ink/60">
            {existing.name} · 만 {existing.ageYears}살
          </p>
          <Link
            href="/dashboard"
            className="toy-btn mt-5 block w-full bg-coral text-white shadow-soft"
          >
            이어서 키우기 →
          </Link>
          <button
            type="button"
            onClick={() => {
              if (confirm("정말 새로 시작할까요? 지금 캐릭터는 사라져요.")) reset();
            }}
            className="mt-3 w-full rounded-xl py-2 text-xs font-semibold text-ink/45 hover:bg-black/5"
          >
            처음부터 새로 시작
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-12">
      <Link href="/" className="mb-6 text-sm font-semibold text-ink/50">
        ← 홈으로
      </Link>
      <div className="card p-7">
        <h1 className="font-pixel text-2xl font-bold">아기 캐릭터 만들기</h1>
        <p className="mt-1 text-sm text-ink/60">
          이름과 색을 정해 주세요. 여기서부터 인생이 시작돼요!
        </p>

        {/* 미리보기 */}
        <div className="my-5 max-w-[220px] mx-auto">
          <CharacterPreviewCard
            lifeStage="baby"
            status={PREVIEW_STATUS}
            gender={gender}
            appearance={appearance}
            palette={paletteForColor(color, "normal")}
            width={220}
          />
        </div>
        <button
          type="button"
          onClick={() => setAppearance(rollAppearance())}
          className="mx-auto mb-1 flex items-center gap-1.5 rounded-full border-2 border-ink/15 bg-white px-3 py-1.5 font-pixel text-[11px] font-bold text-ink/60 hover:border-ink/40"
        >
          🎲 다른 스타일 뽑기
        </button>

        <label className="block font-pixel text-sm font-bold text-ink/70">이름</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={12}
          placeholder="예: 콩이"
          className="mt-1.5 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-base outline-none focus:border-coral"
        />
        <p className="mt-1 text-[11px] text-ink/40">
          실명·개인정보가 담긴 이름은 피해 주세요. 랭킹엔 닉네임만 표시돼요.
        </p>

        <div className="mt-5 font-pixel text-sm font-bold text-ink/70">성별</div>
        <div className="mt-2 grid grid-cols-2 gap-2.5">
          {([
            { key: "male", label: "♂ 남자", cls: "bg-sky/40" },
            { key: "female", label: "♀ 여자", cls: "bg-blush/50" },
          ] as const).map((g) => (
            <button
              key={g.key}
              type="button"
              onClick={() => setGender(g.key)}
              aria-pressed={gender === g.key}
              className={cn(
                "rounded-2xl border-[3px] py-3 font-pixel text-sm font-bold transition-transform",
                gender === g.key
                  ? "border-ink -translate-y-0.5 " + g.cls
                  : "border-ink/15 bg-white text-ink/55 hover:border-ink/40",
              )}
            >
              {g.label}
            </button>
          ))}
        </div>
        <p className="mt-1 text-[11px] text-ink/40">
          성별은 키 성장(체격)과 외형에만 영향을 줘요. 키가 크면 운동선수 같은 직업에 유리해요.
        </p>

        <div className="mt-5 font-pixel text-sm font-bold text-ink/70">색 고르기</div>
        <div className="mt-2 flex flex-wrap gap-2.5">
          {MASCOT_COLORS.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => setColor(c.key)}
              aria-label={c.label}
              className={cn(
                "h-12 w-12 rounded-full border-4 transition-all",
                color === c.key
                  ? "border-ink/70 scale-110"
                  : "border-white shadow-soft hover:scale-105",
              )}
              style={{ backgroundColor: c.body }}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={handleStart}
          className="toy-btn mt-7 w-full bg-coral text-white"
        >
          키우기 시작!
        </button>
      </div>
    </main>
  );
}
