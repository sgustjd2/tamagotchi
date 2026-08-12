"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

const KEY = "lifegotchi:saveNoticeDismissed";

export function SaveNotice() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(KEY)) setShow(true);
    } catch {
      /* localStorage 사용 불가 시 무시 */
    }
  }, []);

  if (!show) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(KEY, "1");
    } catch {
      /* 무시 */
    }
    setShow(false);
  };

  return (
    <div className="flex items-start gap-2 rounded-xl border-2 border-ink/15 bg-white/70 px-3 py-2 text-[12px] text-ink/60">
      <p className="flex-1 leading-snug">
        진행 데이터는 <b>이 브라우저에만</b> 저장돼요. 다른 기기·시크릿 모드에선
        이어할 수 없어요. (기기 간 이어하기는 추후 지원)
      </p>
      <button
        type="button"
        onClick={dismiss}
        className="rounded-full p-1 hover:bg-black/5"
        aria-label="닫기"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
