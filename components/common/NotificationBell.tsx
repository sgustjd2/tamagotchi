"use client";

// 돌봄 알림 토글 — 대시보드 헤더의 작은 버튼.
// 권한 미허용이면 클릭으로 요청, 차단됐으면 탭 시 재허용 방법을 안내한다
// (모바일엔 hover 툴팁이 없어 인라인 안내가 필요).

import { useState } from "react";
import type { NotifyPermission } from "@/lib/hooks/useCareNotifications";

export function NotificationBell({
  permission,
  onRequest,
}: {
  permission: NotifyPermission;
  onRequest: () => void;
}) {
  const [showHelp, setShowHelp] = useState(false);
  if (permission === "unsupported") return null;

  if (permission === "granted") {
    return (
      <span className="pill bg-mint/40 text-ink/60" title="탭이 열려 있는 동안 배고픔/피로/건강 알림을 보내요">
        🔔 <span className="hidden sm:inline">알림 ON</span>
      </span>
    );
  }
  if (permission === "denied") {
    return (
      <span className="relative">
        <button
          type="button"
          onClick={() => setShowHelp((v) => !v)}
          className="pill bg-black/10 py-1.5 text-ink/40 transition-colors hover:bg-black/15 md:py-0.5"
        >
          🔕 <span className="hidden sm:inline">알림 차단됨</span>
        </button>
        {showHelp && (
          <span className="absolute right-0 top-full z-50 mt-1 block w-56 rounded-xl border-2 border-ink/20 bg-white p-2.5 text-left text-[11px] leading-relaxed text-ink/70 shadow-lg">
            알림이 브라우저에서 차단됐어요. 주소창의 자물쇠(사이트 설정) →
            알림을 <b>허용</b>으로 바꾸면 캐릭터가 배고프거나 아플 때
            알려드릴 수 있어요.
          </span>
        )}
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={onRequest}
      className="pill bg-white py-1.5 text-ink/60 transition-colors hover:bg-cream md:py-0.5"
      title="탭이 열려 있는 동안 캐릭터가 배고프거나 아프면 알려드려요"
    >
      🔔 <span className="hidden sm:inline">알림 켜기</span>
      <span className="sm:hidden">알림</span>
    </button>
  );
}
