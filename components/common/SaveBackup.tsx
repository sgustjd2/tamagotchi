"use client";

// 세이브 백업/복원 — 세이브가 localStorage 한 곳뿐이라 캐시 삭제·기기 변경에
// 무방비인 문제의 최소 방어선. 서버 동기화(Supabase) 전까지의 다리 역할.
// 내보내기: 캐릭터 + userId 를 JSON 파일로 다운로드.
// 가져오기: 파일을 같은 키에 되써넣고 새로고침(persist rehydrate).

import { useRef, useState } from "react";

const CHARACTER_KEY = "lifegotchi:character";
const USER_KEY = "lifegotchi:userId";

export function SaveBackup() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);

  const exportSave = () => {
    const character = localStorage.getItem(CHARACTER_KEY);
    if (!character) {
      setMessage("내보낼 세이브가 없어요. 먼저 캐릭터를 만들어 주세요.");
      return;
    }
    const payload = JSON.stringify(
      {
        [CHARACTER_KEY]: character,
        [USER_KEY]: localStorage.getItem(USER_KEY),
      },
      null,
      2,
    );
    const url = URL.createObjectURL(
      new Blob([payload], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `lifegotchi-save-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMessage("세이브 파일을 내려받았어요. 안전한 곳에 보관해 주세요!");
  };

  const importSave = async (file: File) => {
    try {
      const parsed = JSON.parse(await file.text());
      const character = parsed[CHARACTER_KEY];
      if (typeof character !== "string" || !character) {
        setMessage("세이브 파일 형식이 아니에요. 내보내기로 만든 파일을 선택해 주세요.");
        return;
      }
      JSON.parse(character); // 캐릭터 데이터 자체도 유효한 JSON 인지 검증
      if (
        localStorage.getItem(CHARACTER_KEY) &&
        !confirm("현재 캐릭터를 덮어씁니다. 계속할까요?")
      ) {
        return;
      }
      localStorage.setItem(CHARACTER_KEY, character);
      if (typeof parsed[USER_KEY] === "string") {
        localStorage.setItem(USER_KEY, parsed[USER_KEY]);
      }
      location.href = "/dashboard";
    } catch {
      setMessage("파일을 읽지 못했어요. 손상되지 않은 세이브 파일인지 확인해 주세요.");
    }
  };

  return (
    <section className="card p-4">
      <h2 className="mb-2 font-pixel text-sm font-bold text-ink/80">
        💾 세이브 백업
      </h2>
      <p className="text-[13px] leading-relaxed text-ink/70">
        세이브는 이 브라우저에만 저장돼요. 브라우저 데이터를 지우거나 기기를
        바꾸면 캐릭터가 사라지니, 파일로 내보내 두면 안전해요.
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={exportSave}
          className="toy-btn bg-mint text-sm text-ink"
        >
          내보내기
        </button>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="toy-btn bg-butter text-sm text-ink"
        >
          가져오기
        </button>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) importSave(f);
          e.target.value = "";
        }}
      />
      {message && (
        <p className="mt-2 text-[12px] font-semibold text-ink/60">{message}</p>
      )}
    </section>
  );
}
