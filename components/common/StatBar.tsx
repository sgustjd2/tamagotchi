import { cn } from "@/lib/utils";
import { glossaryDesc } from "@/lib/game/glossary";

interface StatBarProps {
  label: string;
  value: number; // 0~100
  higherIsBetter?: boolean;
  /** 툴팁 설명 — 생략하면 용어 사전(glossary)에서 라벨로 찾는다 */
  desc?: string;
}

function tone(value: number, higherIsBetter: boolean): string {
  const good = higherIsBetter ? value : 100 - value;
  if (good >= 60) return "bg-gauge-good";
  if (good >= 30) return "bg-gauge-warn";
  return "bg-gauge-bad";
}

export function StatBar({ label, value, higherIsBetter = true, desc }: StatBarProps) {
  const v = Math.round(value);
  return (
    <div className="flex flex-col gap-1" title={desc ?? glossaryDesc(label)}>
      <div className="flex items-center justify-between font-pixel text-[11px] font-bold text-ink/70">
        <span>{label}</span>
        <span className="tabular-nums">{v}</span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full border border-ink/15 bg-black/[0.06]">
        <div
          className={cn("h-full transition-all duration-500", tone(v, higherIsBetter))}
          style={{ width: `${Math.max(0, Math.min(100, v))}%` }}
        />
      </div>
    </div>
  );
}
