"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import type { Character } from "@/types/character";
import { CharacterPreviewCard } from "@/components/character/CharacterPreviewCard";
import { PixelIcon } from "@/components/pixel/PixelIcon";
import { computeLifeScore, formatMoney, lifeEnding } from "@/lib/game/ending";
import { DEGREE_LABEL } from "@/lib/game/degree";
import { COMPANY_TYPES, JOB_FAMILIES, RARITY_META } from "@/lib/game/jobs";
import {
  computeRankings,
  percentileFor,
  RANK_META,
  RANK_ORDER,
} from "@/lib/game/ranking";
import { getHall, saveHall } from "@/lib/storage/hall";
import { shareEndingCard } from "@/lib/share/endingCard";
import {
  canStartSecondGen,
  inheritanceAmount,
  startingHousingOptions,
} from "@/lib/game/legacy";
import { housingLabel } from "@/lib/game/housing";
import type { HousingOptionKey } from "@/types/character";
import { useGameStore } from "@/lib/store/useGameStore";

export function EndingScreen({ character }: { character: Character }) {
  const router = useRouter();
  const reset = useGameStore((s) => s.reset);
  const startSecondGeneration = useGameStore((s) => s.startSecondGeneration);
  const { title, subtitle } = lifeEnding(character);
  const score = computeLifeScore(character);
  const job = character.job;
  const age = character.deathAge ?? character.ageYears;
  const scores = computeRankings(character);
  const [newBest, setNewBest] = useState<"first" | "best" | null>(null);
  const [shareMsg, setShareMsg] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);

  const handleShare = async () => {
    setSharing(true);
    const r = await shareEndingCard(character);
    setSharing(false);
    const msg =
      r === "copied"
        ? "결과 카드를 클립보드에 복사했어요!"
        : r === "downloaded"
          ? "결과 카드를 이미지로 저장했어요!"
          : r === "failed"
            ? "공유에 실패했어요. 다시 시도해 주세요."
            : null;
    if (msg) {
      setShareMsg(msg);
      setTimeout(() => setShareMsg(null), 2600);
    }
  };

  // 사망 회차를 명예의전당에 1회 적재(같은 id 중복 방지) + 역대 최고 비교
  useEffect(() => {
    const prev = getHall().filter((e) => e.id !== character.id);
    const prevBest = prev.reduce((m, e) => Math.max(m, e.scores.overall), -1);
    saveHall({
      id: character.id,
      name: character.name,
      color: character.color,
      ageAtDeath: age,
      scores,
      jobTitle: job?.title,
      endingTitle: title,
      createdAt: Date.now(),
    });
    setNewBest(
      prev.length === 0 ? "first" : scores.overall >= prevBest ? "best" : null,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [character.id]);

  const restart = () => {
    reset();
    router.push("/create");
  };

  const childCount = character.childrenBornAges?.length ?? 0;
  const canSecondGen = canStartSecondGen(character);
  const inherited = inheritanceAmount(character);
  const generation = character.generation ?? 1;
  // 유산으로 대출 없이 감당 가능한 시작 주거 — 본가(0원)는 항상 포함되므로 최소 1개
  const startHomes = startingHousingOptions(inherited);
  const [startHome, setStartHome] = useState<HousingOptionKey>("parents");
  const continueAsChild = () => {
    const r = startSecondGeneration(startHome);
    if (r.ok) router.push("/dashboard");
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-12">
      <div className="card p-7 text-center">
        <div className="flex items-center justify-center gap-1.5">
          <span className="pill bg-ink/10 text-ink/70">인생 결산</span>
          {generation >= 2 && (
            <span className="pill bg-grape/50 text-ink">{generation}세대</span>
          )}
        </div>

        <div className="my-4 opacity-80">
          <CharacterPreviewCard
            lifeStage="retirement"
            status={character.status}
            gender={character.gender}
            jobFamily={character.job?.family}
            appearance={character.appearance}
            width={200}
          />
        </div>

        <h1 className="font-pixel text-xl font-bold">{character.name}의 인생</h1>
        <p className="font-pixel text-xs text-ink/55">
          만 {age}세 · {character.deathCause ?? "노환"}으로 영면
        </p>
        {character.legacy && (
          <p className="mt-0.5 font-pixel text-[10px] text-ink/45">
            {character.legacy.parentName}에게 유산{" "}
            {formatMoney(character.legacy.inheritedManwon)}을 물려받고 시작한 인생
          </p>
        )}

        <div className="mt-4 rounded-2xl border-[3px] border-ink bg-butter/30 p-4">
          <div className="font-pixel text-xl font-bold">{title}</div>
          <p className="mt-1 font-sans text-[13px] text-ink/60">{subtitle}</p>
        </div>

        <div className="mt-4 space-y-2 text-left">
          <Row label="수명" value={`만 ${age}세`} />
          <Row
            label="최종 직업"
            value={
              job
                ? `${RARITY_META[JOB_FAMILIES[job.family].rarity].label} · ${job.title}`
                : "무직 (자유인)"
            }
          />
          <Row label="최종 학위" value={DEGREE_LABEL[character.degree]} />
          <Row
            label="가족"
            value={
              character.marriedAtAge != null
                ? `${character.marriedAtAge}살 결혼${childCount > 0 ? ` · 자녀 ${childCount}명` : ""}`
                : "미혼 (자유로운 영혼)"
            }
          />
          <Row label="주거" value={housingLabel(character.housing)} />
          <Row label="저축" value={formatMoney(character.savings)} strong />
          <Row label="행복도" value={`${character.happiness} / 100`} />
          <Row label="인생 점수" value={`${score} / 100`} />
          {job && (
            <Row
              label="마지막 직장"
              value={`${COMPANY_TYPES[job.company].label}`}
            />
          )}
        </div>

        {/* 랭킹 5종 + 추정 퍼센타일 */}
        <div className="mt-4 rounded-2xl border-2 border-ink/10 bg-black/[0.02] p-4">
          <div className="mb-2.5 flex items-center justify-between">
            <span className="font-pixel text-xs font-bold text-ink/70">
              인생 랭킹
            </span>
            {newBest && (
              <span className="pill bg-grape text-ink">
                {newBest === "first" ? "첫 기록!" : "역대 최고 경신!"}
              </span>
            )}
          </div>
          <div className="space-y-1.5">
            {RANK_ORDER.map((cat) => (
              <div key={cat} className="flex items-center gap-2">
                <PixelIcon name={RANK_META[cat].icon} size={12} />
                <span className="font-pixel text-[11px] text-ink/60">
                  {RANK_META[cat].label}
                </span>
                <span className="ml-auto font-pixel text-[11px] font-bold tabular-nums">
                  {scores[cat]}
                </span>
                <span className="w-20 text-right font-pixel text-[10px] text-ink/45">
                  상위 {percentileFor(cat, scores[cat])}%
                </span>
              </div>
            ))}
          </div>
          <Link
            href="/ranking"
            className="mt-3 block rounded-xl border-2 border-ink/15 bg-white py-2 text-center font-pixel text-[11px] font-bold text-ink/60 hover:border-ink/40"
          >
            명예의전당 보기 →
          </Link>
        </div>

        {shareMsg && (
          <p className="mt-4 text-center font-pixel text-[12px] font-bold text-ink/70">
            {shareMsg}
          </p>
        )}

        <button
          type="button"
          onClick={handleShare}
          disabled={sharing}
          className="toy-btn mt-6 w-full bg-mint text-ink disabled:opacity-60"
        >
          {sharing ? "카드 만드는 중…" : "📤 결과 카드 공유"}
        </button>

        {canSecondGen && (
          <div className="mt-3 rounded-2xl border-2 border-ink/15 bg-grape/15 p-3">
            <p className="font-pixel text-[12px] font-bold text-ink/75">
              👨‍👧 {generation + 1}세대로 이어가기
            </p>
            <p className="mt-0.5 font-pixel text-[10px] text-ink/50">
              유산 {formatMoney(inherited)} · 재능 · 부모의 옷·방 아이템 일부를
              물려받아요
            </p>
            {startHomes.length > 1 && (
              <div className="mt-2 flex flex-wrap justify-center gap-1.5">
                {startHomes.map((h) => (
                  <button
                    key={h.key}
                    type="button"
                    onClick={() => setStartHome(h.key)}
                    aria-pressed={startHome === h.key}
                    className={`pill transition-colors ${
                      startHome === h.key
                        ? "border-ink bg-butter text-ink"
                        : "bg-white text-ink/55 hover:bg-cream"
                    }`}
                  >
                    {h.emoji} {h.label}
                    {h.price > 0 && ` · ${formatMoney(h.price)}`}
                  </button>
                ))}
              </div>
            )}
            <button
              type="button"
              onClick={continueAsChild}
              className="toy-btn mt-2.5 w-full bg-grape text-ink"
            >
              이어가기
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={restart}
          className="toy-btn mt-3 w-full bg-coral text-ink"
        >
          다시 태어나기
        </button>
      </div>
    </main>
  );
}

function Row({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border-2 border-ink/10 bg-black/[0.03] px-4 py-2.5">
      <span className="font-pixel text-xs text-ink/60">{label}</span>
      <span className={`font-pixel font-bold ${strong ? "text-base text-coral" : "text-sm"}`}>
        {value}
      </span>
    </div>
  );
}
