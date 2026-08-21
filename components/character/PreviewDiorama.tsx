"use client";

// 대시보드와 동일한 3D 복셀 방 미리보기 — 랜딩·캐릭터 생성이 대시보드(4번 방)와
// 다른 2D 평면 방을 보여주던 이질감을 해소한다.
// SSR/첫 페인트는 2D 픽셀 방(하이드레이션 안전 + 즉시 표시), 마운트 후 3D 로 승격.
// 대시보드의 3D/2D 설정(lifegotchi:room3d)을 공유하고, WebGL 미지원이면 2D 유지.

import { useEffect, useState } from "react";
import type {
  CharacterAppearance,
  CharacterStatus,
  Gender,
  LifeStage,
  RoomItemKey,
} from "@/types/character";
import type { PixelPalette } from "@/lib/game/sprite/characterPalettes";
import { DioramaCard } from "@/components/three/DioramaCard";
import { CharacterPreviewCard } from "./CharacterPreviewCard";

export function PreviewDiorama({
  lifeStage,
  status,
  color = "blush",
  gender,
  appearance,
  palette,
  items = [],
  width = 280,
}: {
  lifeStage: LifeStage;
  status: CharacterStatus;
  /** 기기 색 키 — 3D 방의 포인트 색 */
  color?: string;
  gender?: Gender;
  appearance?: CharacterAppearance;
  /** 2D 폴백용 팔레트(생성 화면의 색 미리보기) */
  palette?: PixelPalette;
  items?: RoomItemKey[];
  width?: number;
}) {
  const [mode3d, setMode3d] = useState(false); // SSR 은 2D로 시작(하이드레이션 안전)
  useEffect(() => {
    setMode3d(localStorage.getItem("lifegotchi:room3d") !== "0");
  }, []);

  if (!mode3d) {
    return (
      <CharacterPreviewCard
        lifeStage={lifeStage}
        status={status}
        gender={gender}
        appearance={appearance}
        palette={palette}
        width={width}
      />
    );
  }
  return (
    <DioramaCard
      stage={lifeStage}
      color={color}
      night={false}
      items={items}
      pose="stand"
      outfit={null}
      accessory={null}
      family={{ spouse: false, children: 0 }}
      appearance={appearance}
      gender={gender}
      happy={status.mood >= 70}
      onUnavailable={() => setMode3d(false)}
    />
  );
}
