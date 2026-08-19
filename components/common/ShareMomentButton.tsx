"use client";

// 순간 공유 버튼 — 합격·협상 성공·레어 뽑기 모달에서 이미지 카드를 공유/저장.
// 결과 피드백은 버튼 라벨로만(모달 안이라 토스트가 가려질 수 있음).

import { useState } from "react";
import type { Character } from "@/types/character";
import { shareMomentCard, type Moment } from "@/lib/share/momentCard";
import type { ShareResult } from "@/lib/share/cardCanvas";

const RESULT_LABEL: Record<ShareResult, string> = {
  shared: "공유했어요!",
  copied: "이미지를 복사했어요!",
  downloaded: "이미지를 저장했어요!",
  failed: "실패했어요. 다시 시도해 주세요.",
};

export function ShareMomentButton({
  character,
  moment,
}: {
  character: Character;
  moment: Moment;
}) {
  const [state, setState] = useState<"idle" | "busy" | ShareResult>("idle");

  const onShare = async () => {
    if (state === "busy") return;
    setState("busy");
    setState(await shareMomentCard(character, moment));
  };

  return (
    <button
      type="button"
      onClick={onShare}
      disabled={state === "busy"}
      className="toy-btn mt-2 w-full bg-sky/60 py-2.5 text-sm text-ink disabled:opacity-60"
    >
      {state === "idle" || state === "busy"
        ? "📸 순간 카드 공유"
        : RESULT_LABEL[state]}
    </button>
  );
}
