"use client";

import type {
  CharacterAppearance,
  Gender,
  JobFamilyKey,
  LifeStage,
  CharacterStatus,
} from "@/types/character";
import { PixelRoom } from "@/components/game/PixelRoom";
import { PixelCharacter } from "@/components/game/PixelCharacter";
import type { PixelPalette } from "@/lib/game/sprite/characterPalettes";
import { jobTypeFromFamily } from "@/lib/game/sprite/characterVisualState";

/** 대시보드 밖(생성 화면·랜딩·엔딩)에서도 실제 캐릭터와 같은 모습을 보여주는 미리보기 카드 */
export function CharacterPreviewCard({
  lifeStage,
  status,
  gender,
  jobFamily,
  appearance,
  palette,
  width = 220,
  charSize,
  className,
}: {
  lifeStage: LifeStage;
  status: CharacterStatus;
  gender?: Gender;
  jobFamily?: JobFamilyKey;
  appearance?: CharacterAppearance;
  palette?: PixelPalette;
  width?: number;
  charSize?: number;
  className?: string;
}) {
  const jobType = jobTypeFromFamily(jobFamily);
  return (
    <PixelRoom stage={lifeStage} jobType={jobType} width={width} className={className}>
      <PixelCharacter
        lifeStage={lifeStage}
        mood={status.mood}
        hunger={status.hunger}
        energy={status.energy}
        health={status.health}
        burnout={status.burnout}
        cleanliness={status.cleanliness}
        jobType={jobType}
        gender={gender}
        appearance={appearance}
        palette={palette}
        size={charSize ?? Math.round(width * 0.52)}
      />
    </PixelRoom>
  );
}
