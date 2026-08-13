"use client";

// 3D 디오라마 카드 — three/R3F 청크를 ssr:false 로 지연 로드하고,
// WebGL 미지원 기기는 onUnavailable 콜백으로 2D 폴백을 요청한다.
// Next 14 App Router 규칙: dynamic(ssr:false)는 반드시 클라이언트 파일 안에서.

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import type { VoxelDioramaProps } from "./VoxelDiorama";

const VoxelDiorama = dynamic(() => import("./VoxelDiorama"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center font-pixel text-[11px] text-ink/40">
      3D 방 준비 중…
    </div>
  ),
});

export function DioramaCard({
  onUnavailable,
  ...props
}: VoxelDioramaProps & { onUnavailable: () => void }) {
  const [webgl, setWebgl] = useState<boolean | null>(null);

  useEffect(() => {
    const c = document.createElement("canvas");
    const ok = !!(c.getContext("webgl2") ?? c.getContext("webgl"));
    setWebgl(ok);
    if (!ok) onUnavailable();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (webgl === false) return null; // 부모가 2D 로 전환
  return (
    // 캔버스는 부모 크기를 측정하므로 명시적 크기 필수(aspect-square, dvh 무관 고정)
    <div className="lcd relative aspect-square w-full overflow-hidden bg-cream">
      {webgl && <VoxelDiorama {...props} />}
    </div>
  );
}
