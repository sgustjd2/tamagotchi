"use client";

import { useRouter } from "next/navigation";
import type { Character } from "@/types/character";
import { TamaDevice } from "@/components/character/TamaDevice";
import { useGameStore } from "@/lib/store/useGameStore";
import { NEGLECT_DEATH_MS } from "@/lib/game/constants";

export function NeglectEndingScreen({ character }: { character: Character }) {
  const router = useRouter();
  const reset = useGameStore((s) => s.reset);

  const restart = () => {
    reset();
    router.push("/create");
  };

  const { hunger, energy, mood } = character.status;
  const neglectHours = NEGLECT_DEATH_MS / 3_600_000;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-12">
      <div className="card p-7 text-center">
        <span className="pill mx-auto border-coral/70 bg-coral/10 text-coral">
          돌봄 실패
        </span>

        <div className="my-5 opacity-40">
          <TamaDevice
            colorKey={character.color}
            status={character.status}
            stage={character.lifeStage}
            gender={character.gender}
            mascotSize={96}
            showStatus={false}
          />
        </div>

        <h1 className="font-pixel text-xl font-bold">{character.name}</h1>
        <p className="mt-1 font-pixel text-xs text-ink/50">
          {neglectHours}시간 동안 혼자였어요
        </p>

        <div className="mt-4 rounded-2xl border-[3px] border-ink/15 bg-ink/[0.03] p-4">
          <p className="font-pixel text-sm font-bold text-ink/80">
            혼자서는 살아갈 수 없었어요
          </p>
          <p className="mt-2 font-sans text-[13px] leading-relaxed text-ink/55">
            배고픔과 외로움 속에 눈을 감았어요.
            <br />
            아직 아무것도 시작되지 않은 삶이었는데.
          </p>
        </div>

        {/* 마지막 상태 */}
        <div className="mt-4">
          <p className="mb-2 text-left font-pixel text-[11px] text-ink/40">
            마지막 상태
          </p>
          <div className="grid grid-cols-3 gap-2">
            <StatusTile label="배고픔" value={hunger} />
            <StatusTile label="에너지" value={energy} />
            <StatusTile label="기분" value={mood} />
          </div>
        </div>

        {/* 안내 */}
        <div className="mt-4 rounded-2xl border-2 border-butter/60 bg-butter/20 px-4 py-3">
          <p className="font-pixel text-[11px] text-ink/60">
            이 기록은 랭킹에 남지 않아요.
            <br />
            다음엔 꼭 자주 돌아와 주세요.
          </p>
        </div>

        <button
          type="button"
          onClick={restart}
          className="toy-btn mt-6 w-full bg-ink text-cream"
        >
          🐣 새 아기 만들기
        </button>
      </div>
    </main>
  );
}

function StatusTile({ label, value }: { label: string; value: number }) {
  const isLow = value < 20;
  return (
    <div className="flex flex-col items-center gap-1 rounded-xl border-2 border-ink/10 bg-black/[0.03] py-2.5">
      <span
        className={`font-pixel text-base font-bold tabular-nums ${isLow ? "text-coral" : "text-ink/70"}`}
      >
        {Math.round(value)}
      </span>
      <span className="font-pixel text-[10px] text-ink/45">{label}</span>
    </div>
  );
}
