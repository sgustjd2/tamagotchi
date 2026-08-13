// ---------------------------------------------------------------------------
// PixelRoom.tsx
// 캐릭터를 단독으로 두지 않고 작은 픽셀 방 안에 배치한다(스펙 §8).
// 외부 이미지 없이 CSS(하드보더 박스 + 단색 면)만으로 바닥/벽/창문/침대/책상/
// 책장·화분 + 단계별 소품을 구성한다. 캐릭터와 같은 LCD 잉크 톤을 공유한다.
//
// 배경 차별화:
//  - 나이(성장 단계): 방 테마별로 벽/바닥 톤, 벽 장식(모빌/낙서/시계/달력/차트/상장),
//    창밖 풍경(해/구름/빌딩)이 달라진다.
//  - 직업: 직장인·경력직 방은 jobType 에 따라 책상 위 장비가 바뀐다
//    (tech=듀얼 모니터, creative=이젤+캔버스, physical=아령 랙, expert=플라스크 선반).
//
// 사용: <PixelRoom stage={stage} jobType={jobType} night={sleeping}>{<PixelCharacter .../>}</PixelRoom>
// ---------------------------------------------------------------------------

import type { ReactNode } from "react";
import type { LifeStage, RoomItemKey } from "@/types/character";
import {
  LCD_ROOM_NIGHT_PALETTE,
  LCD_ROOM_PALETTE,
  type RoomPalette,
} from "@/lib/game/sprite/characterPalettes";
import { roomThemeForStage, type RoomTheme } from "@/lib/game/sprite/characterStageConfig";
import { stageLabel } from "@/lib/game/growth";
import type { JobType } from "@/lib/game/sprite/characterVisualState";
import {
  SEASON_PARTICLE,
  SKY_COLOR,
  type Season,
  type SkyPhase,
} from "@/lib/game/sprite/roomAmbience";

export interface PixelRoomProps {
  stage: LifeStage;
  /** 직업 대분류 — 직장인/경력직 방의 책상 장비를 바꾼다 */
  jobType?: JobType;
  /** 수면 등 어두운 분위기 */
  night?: boolean;
  /** 실제 시각 기반 창밖 하늘(미지정 시 낮). night=true 면 밤 하늘로 강제 */
  sky?: SkyPhase;
  /** 실제 날짜 기반 계절 연출(벚꽃/낙엽/눈). 미지정 시 없음 */
  season?: Season;
  /** 반려동물 — 행복도가 높으면 고양이가 놀러온다 */
  pet?: "cat";
  /** 가족 — 결혼하면 배우자, 출산하면 자녀가 방에 함께 산다 */
  family?: { spouse: boolean; children: number };
  /** 상점에서 구매한 방 꾸미기 아이템(영구 배치) */
  items?: RoomItemKey[];
  /** 방 전체 폭(px) */
  width?: number;
  children?: ReactNode;
  className?: string;
}

/**
 * 성장 단계(테마)별 벽/바닥 톤 — 같은 LCD 감성 안에서 살짝만 톤을 틀어
 * "나이 들며 방이 바뀐다"는 느낌을 준다. 밤에는 공통 어두운 팔레트를 쓴다.
 */
export const THEME_TINT: Record<RoomTheme, Pick<RoomPalette, "wall" | "floor" | "floorLine">> = {
  nursery: { wall: "#F3EADB", floor: "#E2D4BE", floorLine: "#C6B498" },
  kidRoom: { wall: "#EDEFD3", floor: "#DADEB5", floorLine: "#BCC192" },
  studyRoom: { wall: "#E9EDD8", floor: "#D6DBBE", floorLine: "#B7BD9C" },
  campus: { wall: "#E7F0DC", floor: "#D2DFC0", floorLine: "#B2C29E" },
  jobseekerRoom: { wall: "#E2E5D9", floor: "#CCD0BF", floorLine: "#ADB29D" },
  office: { wall: "#DFE7E3", floor: "#C8D2CC", floorLine: "#A7B3AC" },
  seniorOffice: { wall: "#E5E0D1", floor: "#D0C9B5", floorLine: "#B1A98E" },
};

/** 하드보더 픽셀 가구 박스 */
function Furn({
  left,
  bottom,
  w,
  h,
  bg,
  ink,
  z = 1,
  children,
}: {
  left: string;
  bottom: string;
  w: string;
  h: string;
  bg: string;
  ink: string;
  z?: number;
  children?: ReactNode;
}) {
  return (
    <div
      className="absolute"
      style={{
        left,
        bottom,
        width: w,
        height: h,
        background: bg,
        border: `2px solid ${ink}`,
        zIndex: z,
      }}
    >
      {children}
    </div>
  );
}

/** 책상 위 장비 — 직장인/경력직은 직업에 따라, 그 외 테마는 기본 소품 */
function DeskGear({ theme, job, pal }: { theme: RoomTheme; job: JobType; pal: RoomPalette }) {
  const { ink, prop, propHi } = pal;
  const isOffice = theme === "office" || theme === "seniorOffice";

  if (isOffice && job === "tech") {
    // 듀얼 모니터
    return (
      <>
        <div
          className="absolute"
          style={{ left: "6%", bottom: "100%", width: "38%", height: "58%", background: propHi, border: `2px solid ${ink}` }}
        />
        <div
          className="absolute"
          style={{ left: "52%", bottom: "100%", width: "38%", height: "58%", background: propHi, border: `2px solid ${ink}` }}
        />
      </>
    );
  }
  if (isOffice && job === "creative") {
    // 태블릿(눕힌 판) + 펜
    return (
      <>
        <div
          className="absolute"
          style={{ left: "14%", bottom: "100%", width: "44%", height: "34%", background: propHi, border: `2px solid ${ink}` }}
        />
        <div
          className="absolute"
          style={{ left: "66%", bottom: "100%", width: "6%", height: "48%", background: ink }}
        />
      </>
    );
  }
  if (isOffice && job === "physical") {
    // 책상 위 물병 + 수건(장비는 바닥 아령 랙이 메인)
    return (
      <>
        <div
          className="absolute"
          style={{ left: "18%", bottom: "100%", width: "12%", height: "52%", background: propHi, border: `2px solid ${ink}` }}
        />
        <div
          className="absolute"
          style={{ left: "44%", bottom: "100%", width: "30%", height: "26%", background: prop, border: `2px solid ${ink}` }}
        />
      </>
    );
  }
  if (isOffice && job === "expert") {
    // 플라스크(목 좁은 병) + 책
    return (
      <>
        <div
          className="absolute"
          style={{ left: "16%", bottom: "100%", width: "16%", height: "50%", background: propHi, border: `2px solid ${ink}`, borderRadius: "0 0 40% 40%" }}
        />
        <div
          className="absolute"
          style={{ left: "48%", bottom: "100%", width: "34%", height: "30%", background: prop, border: `2px solid ${ink}` }}
        />
      </>
    );
  }
  if (isOffice || theme === "jobseekerRoom" || theme === "campus") {
    // 기본: 노트북/모니터 (대학생은 과제용 노트북)
    return (
      <div
        className="absolute"
        style={{ left: "18%", bottom: "100%", width: "46%", height: "60%", background: propHi, border: `2px solid ${ink}` }}
      />
    );
  }
  if (theme === "studyRoom") {
    // 책 더미
    return (
      <div
        className="absolute"
        style={{ left: "20%", bottom: "100%", width: "40%", height: "45%", background: propHi, border: `2px solid ${ink}` }}
      />
    );
  }
  return null;
}

function FurnSet({ theme, job, pal }: { theme: RoomTheme; job: JobType; pal: RoomPalette }) {
  const { ink, prop, propHi } = pal;
  const pieces: ReactNode[] = [];
  const isOffice = theme === "office" || theme === "seniorOffice";

  // 공통: 침대(좌) — nursery 는 아기침대(난간)
  if (theme === "nursery") {
    pieces.push(
      <Furn key="crib" left="4%" bottom="6%" w="30%" h="26%" bg={propHi} ink={ink}>
        <div className="flex h-full w-full items-stretch justify-around px-[2px] py-[2px]">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} style={{ width: 2, background: ink }} />
          ))}
        </div>
      </Furn>,
    );
  } else {
    pieces.push(
      <Furn key="bed" left="3%" bottom="6%" w="30%" h="20%" bg={prop} ink={ink}>
        <div style={{ height: "45%", background: propHi, borderBottom: `2px solid ${ink}` }} />
      </Furn>,
    );
  }

  // 공통: 책상(우) + 직업/단계별 장비
  pieces.push(
    <Furn key="desk" left="60%" bottom="6%" w="33%" h="22%" bg={prop} ink={ink}>
      <DeskGear theme={theme} job={job} pal={pal} />
    </Furn>,
  );

  // 책장(중앙 뒤) 또는 화분
  if (theme === "studyRoom" || theme === "kidRoom" || theme === "jobseekerRoom" || theme === "campus") {
    pieces.push(
      <Furn key="shelf" left="40%" bottom="30%" w="20%" h="34%" bg={propHi} ink={ink} z={0}>
        {[70, 40, 10].map((b) => (
          <span
            key={b}
            className="absolute"
            style={{ left: 0, right: 0, bottom: `${b}%`, height: 2, background: ink }}
          />
        ))}
      </Furn>,
    );
  } else {
    // 화분
    pieces.push(
      <Furn key="plant" left="45%" bottom="29%" w="10%" h="16%" bg={prop} ink={ink} z={0}>
        <div
          className="absolute"
          style={{ left: "-30%", right: "-30%", bottom: "90%", height: "120%", background: propHi, border: `2px solid ${ink}`, borderRadius: "40% 40% 0 0" }}
        />
      </Furn>,
    );
  }

  // 단계 소품 악센트
  if (theme === "kidRoom" || theme === "nursery") {
    // 장난감 블록
    pieces.push(
      <Furn key="toy" left="36%" bottom="6%" w="9%" h="9%" bg={propHi} ink={ink} z={2} />,
    );
  }
  if (theme === "jobseekerRoom") {
    // 이력서/파일 더미
    pieces.push(
      <Furn key="files" left="36%" bottom="6%" w="11%" h="8%" bg={propHi} ink={ink} z={2} />,
    );
  }
  if (theme === "seniorOffice") {
    // 서류 트레이
    pieces.push(
      <Furn key="papers" left="34%" bottom="6%" w="13%" h="7%" bg={propHi} ink={ink} z={2} />,
    );
  }
  if (isOffice && job === "physical") {
    // 아령 랙(바닥) — 봉 + 양쪽 원판
    pieces.push(
      <Furn key="rack" left="36%" bottom="6%" w="16%" h="6%" bg={prop} ink={ink} z={2}>
        <span className="absolute" style={{ left: "-8%", bottom: "-2px", width: "14%", height: "220%", background: ink }} />
        <span className="absolute" style={{ right: "-8%", bottom: "-2px", width: "14%", height: "220%", background: ink }} />
      </Furn>,
    );
  }

  return <>{pieces}</>;
}

/** 벽 장식 — 성장 단계(테마)마다 다른 오브제로 "나이에 맞는 방"을 만든다 */
function WallDecor({ theme, pal }: { theme: RoomTheme; pal: RoomPalette }) {
  const { ink, prop, propHi } = pal;

  switch (theme) {
    case "nursery":
      // 가랜드(줄 + 깃발 3장)
      return (
        <div className="absolute" style={{ left: "46%", top: "10%", width: "44%", height: "16%" }}>
          <span className="absolute inset-x-0 top-0" style={{ height: 2, background: ink }} />
          {[8, 40, 72].map((l) => (
            <span
              key={l}
              className="absolute"
              style={{ left: `${l}%`, top: 2, width: "16%", height: "62%", background: propHi, border: `2px solid ${ink}`, clipPath: "polygon(0 0, 100% 0, 50% 100%)" }}
            />
          ))}
        </div>
      );
    case "kidRoom":
      // 아이 낙서 액자(해 + 지그재그)
      return (
        <div
          className="absolute"
          style={{ left: "52%", top: "12%", width: "22%", height: "22%", background: propHi, border: `2px solid ${ink}` }}
        >
          <span className="absolute" style={{ left: "12%", top: "14%", width: "26%", height: "32%", background: prop, borderRadius: "50%" }} />
          <span className="absolute" style={{ left: "50%", bottom: "18%", width: "38%", height: 2, background: ink, transform: "rotate(-18deg)" }} />
        </div>
      );
    case "studyRoom":
      // 벽시계
      return (
        <div
          className="absolute"
          style={{ left: "58%", top: "12%", width: "13%", aspectRatio: "1", background: propHi, border: `2px solid ${ink}`, borderRadius: "50%" }}
        >
          <span className="absolute" style={{ left: "48%", top: "18%", width: 2, height: "34%", background: ink }} />
          <span className="absolute" style={{ left: "48%", top: "48%", width: "28%", height: 2, background: ink }} />
        </div>
      );
    case "campus":
      // 대학 페넌트 깃발(벽에 비스듬히) — 캠퍼스 낭만
      return (
        <div className="absolute" style={{ left: "52%", top: "10%", width: "26%", height: "18%" }}>
          <span className="absolute" style={{ left: 0, top: 0, width: 3, height: "100%", background: ink }} />
          <span
            className="absolute"
            style={{ left: 3, top: "8%", width: "82%", height: "52%", background: prop, border: `2px solid ${ink}`, clipPath: "polygon(0 0, 100% 50%, 0 100%)" }}
          />
        </div>
      );
    case "jobseekerRoom":
      // 달력(그리드) — 취준의 디데이 느낌
      return (
        <div
          className="absolute"
          style={{ left: "52%", top: "11%", width: "20%", height: "24%", background: propHi, border: `2px solid ${ink}` }}
        >
          <span className="absolute inset-x-0 top-0" style={{ height: "26%", background: prop, borderBottom: `2px solid ${ink}` }} />
          <span className="absolute" style={{ left: "30%", top: "30%", bottom: 0, width: 2, background: ink }} />
          <span className="absolute" style={{ left: "62%", top: "30%", bottom: 0, width: 2, background: ink }} />
          <span className="absolute" style={{ left: 0, right: 0, top: "60%", height: 2, background: ink }} />
        </div>
      );
    case "office":
      // 실적 차트 액자(우상향 꺾은선)
      return (
        <div
          className="absolute"
          style={{ left: "52%", top: "12%", width: "22%", height: "20%", background: propHi, border: `2px solid ${ink}` }}
        >
          <span className="absolute" style={{ left: "8%", bottom: "22%", width: "36%", height: 2, background: ink, transform: "rotate(-14deg)", transformOrigin: "left" }} />
          <span className="absolute" style={{ left: "40%", bottom: "34%", width: "48%", height: 2, background: ink, transform: "rotate(-32deg)", transformOrigin: "left" }} />
        </div>
      );
    case "seniorOffice":
      // 상장/자격 액자 2개
      return (
        <>
          <div
            className="absolute"
            style={{ left: "50%", top: "11%", width: "14%", height: "18%", background: propHi, border: `2px solid ${ink}` }}
          >
            <span className="absolute" style={{ left: "20%", right: "20%", top: "30%", height: 2, background: prop }} />
            <span className="absolute" style={{ left: "20%", right: "20%", top: "55%", height: 2, background: prop }} />
          </div>
          <div
            className="absolute"
            style={{ left: "68%", top: "14%", width: "12%", height: "15%", background: prop, border: `2px solid ${ink}` }}
          />
        </>
      );
    default:
      return null;
  }
}

/** 계절 파티클 — 창문 안에 살랑살랑 떨어지는 꽃잎/잎/낙엽/눈송이 */
function SeasonParticles({ season }: { season?: Season }) {
  if (!season) return null;
  const color = SEASON_PARTICLE[season];
  if (!color) return null;
  // 위치/타이밍은 고정값(렌더마다 랜덤이면 SSR 하이드레이션이 어긋남)
  const spots: { left: string; delay: string; dur: string }[] = [
    { left: "14%", delay: "0s", dur: "4.2s" },
    { left: "46%", delay: "1.6s", dur: "5.1s" },
    { left: "72%", delay: "3.1s", dur: "4.6s" },
  ];
  return (
    <>
      {spots.map((p, i) => (
        <span
          key={i}
          className="room-particle absolute"
          style={{
            left: p.left,
            top: 0,
            width: "9%",
            aspectRatio: "1",
            background: color,
            borderRadius: season === "winter" ? "50%" : "20%",
            animationDelay: p.delay,
            animationDuration: p.dur,
          }}
        />
      ))}
    </>
  );
}

/** 창밖 풍경 — 어린 시절엔 해/구름, 사회인은 도시 스카이라인. 밤엔 달. */
function WindowView({
  theme,
  sky,
  season,
  ink,
}: {
  theme: RoomTheme;
  sky: SkyPhase;
  season?: Season;
  ink: string;
}) {
  const isCity = theme === "office" || theme === "seniorOffice" || theme === "jobseekerRoom";
  return (
    <>
      {/* 하늘 위 오브제 */}
      {sky === "night" ? (
        <span className="absolute right-[14%] top-[14%] h-[22%] w-[22%] rounded-full" style={{ background: "#E9ECD8" }} />
      ) : isCity ? null : theme === "studyRoom" ? (
        <span className="absolute left-[16%] top-[24%] h-[24%] w-[46%] rounded-full" style={{ background: "#F2F7EA" }} />
      ) : (
        // nursery / kidRoom: 해 — 노을엔 낮게 깔린 주황 해
        <span
          className="absolute rounded-full"
          style={
            sky === "dusk"
              ? { right: "12%", top: "46%", height: "30%", width: "30%", background: "#EBA05C" }
              : { right: "12%", top: "12%", height: "30%", width: "30%", background: "#F5E9A8" }
          }
        />
      )}
      {/* 도시 스카이라인(사회인 방) — 밤엔 창에 불 켜진 픽셀 */}
      {isCity && (
        <>
          <span className="absolute bottom-0 left-[10%] w-[26%]" style={{ height: "52%", background: ink, opacity: 0.55 }} />
          <span className="absolute bottom-0 left-[44%] w-[22%]" style={{ height: "72%", background: ink, opacity: 0.55 }} />
          {sky === "night" && (
            <>
              <span className="absolute" style={{ left: "16%", bottom: "26%", width: "8%", height: "10%", background: "#E9E3B4" }} />
              <span className="absolute" style={{ left: "50%", bottom: "40%", width: "7%", height: "9%", background: "#E9E3B4" }} />
            </>
          )}
        </>
      )}
      {/* 캠퍼스: 잔디밭 + 낮고 넓은 강의동 */}
      {theme === "campus" && (
        <>
          <span className="absolute bottom-0 left-0 right-0" style={{ height: "22%", background: "#A9C68B" }} />
          <span className="absolute" style={{ left: "18%", bottom: "20%", width: "56%", height: "34%", background: ink, opacity: 0.5 }} />
        </>
      )}
      <SeasonParticles season={season} />
    </>
  );
}

/** 상점에서 구매한 아이템 렌더링 — 고정 슬롯에 배치(캐릭터 z=3 뒤) */
function OwnedItems({ items, pal }: { items: RoomItemKey[]; pal: RoomPalette }) {
  const { ink, prop, propHi } = pal;
  const has = (k: RoomItemKey) => items.includes(k);
  return (
    <>
      {has("rug") && (
        <div
          className="absolute"
          style={{ left: "34%", bottom: "3.5%", width: "32%", height: "6%", background: propHi, border: `2px solid ${ink}`, zIndex: 0 }}
        >
          <span className="absolute inset-x-[10%] top-1/2 h-[2px] -translate-y-1/2" style={{ background: prop }} />
        </div>
      )}
      {has("lamp") && (
        <div className="absolute" style={{ left: "55.5%", bottom: "6%", width: "6.5%", height: "22%", zIndex: 1 }}>
          <span className="absolute left-1/2 bottom-0 w-[3px] -translate-x-1/2" style={{ height: "62%", background: ink }} />
          <span className="absolute inset-x-0 top-0" style={{ height: "42%", background: propHi, border: `2px solid ${ink}`, clipPath: "polygon(15% 100%, 85% 100%, 100% 0, 0 0)" }} />
        </div>
      )}
      {has("bigPlant") && (
        <div className="absolute" style={{ left: "0.5%", bottom: "27%", width: "9%", height: "15%", zIndex: 0 }}>
          <span className="absolute inset-x-0 bottom-0" style={{ height: "40%", background: prop, border: `2px solid ${ink}` }} />
          <span className="absolute" style={{ left: "-15%", right: "-15%", bottom: "38%", height: "70%", background: propHi, border: `2px solid ${ink}`, borderRadius: "45% 45% 10% 10%" }} />
        </div>
      )}
      {has("curtain") && (
        <>
          <span className="absolute" style={{ left: "8.5%", top: "10.5%", width: "3.5%", height: "33%", background: prop, border: `2px solid ${ink}`, zIndex: 1 }} />
          <span className="absolute" style={{ left: "38%", top: "10.5%", width: "3.5%", height: "33%", background: prop, border: `2px solid ${ink}`, zIndex: 1 }} />
        </>
      )}
      {has("fishbowl") && (
        <div
          className="absolute"
          style={{ left: "26%", bottom: "26%", width: "8%", height: "8%", background: propHi, border: `2px solid ${ink}`, borderRadius: "50% 50% 20% 20%", zIndex: 2 }}
        >
          <span className="absolute" style={{ left: "30%", top: "40%", width: "36%", height: "26%", background: ink, borderRadius: "50%" }} />
        </div>
      )}
      {has("console") && (
        <div
          className="absolute"
          style={{ left: "36%", bottom: "6%", width: "11%", height: "9%", background: prop, border: `2px solid ${ink}`, zIndex: 1 }}
        >
          <span className="absolute inset-[18%]" style={{ background: propHi }} />
        </div>
      )}
      {has("puppy") && (
        <div className="absolute" style={{ left: "62%", bottom: "4.5%", width: "12%", height: "10%", zIndex: 2 }} aria-label="강아지">
          {/* 꼬리(위로 살랑) */}
          <span className="absolute" style={{ left: "-8%", bottom: "45%", width: "12%", height: "40%", background: ink, borderRadius: "40%" }} />
          {/* 몸통(밝은 톤 — 고양이와 구분) */}
          <span className="absolute" style={{ left: 0, bottom: 0, width: "66%", height: "56%", background: propHi, border: `2px solid ${ink}` }} />
          {/* 머리 */}
          <span className="absolute" style={{ right: 0, bottom: "30%", width: "46%", height: "58%", background: propHi, border: `2px solid ${ink}` }} />
          {/* 늘어진 귀 */}
          <span className="absolute" style={{ right: "38%", bottom: "48%", width: "10%", height: "36%", background: ink }} />
          {/* 코 */}
          <span className="absolute" style={{ right: "4%", bottom: "48%", width: "10%", height: "12%", background: ink }} />
        </div>
      )}
      {has("robotVacuum") && (
        <div
          className="absolute"
          style={{ left: "70%", bottom: "3%", width: "9%", height: "4.5%", background: prop, border: `2px solid ${ink}`, borderRadius: "40% 40% 10% 10%", zIndex: 2 }}
        >
          <span className="absolute" style={{ left: "40%", top: "-40%", width: "20%", height: "40%", background: ink }} />
        </div>
      )}
      {has("artFrame") && (
        <div
          className="absolute"
          style={{ left: "41%", top: "7%", width: "12%", height: "14%", background: propHi, border: `3px solid ${ink}`, zIndex: 0 }}
        >
          <span className="absolute" style={{ left: "16%", bottom: "16%", width: "34%", height: "42%", background: prop, borderRadius: "50% 50% 0 0" }} />
          <span className="absolute" style={{ right: "14%", top: "18%", width: "22%", height: "22%", background: prop, borderRadius: "50%" }} />
        </div>
      )}
      {has("poster") && (
        <div
          className="absolute"
          style={{ left: "2%", top: "8%", width: "9%", height: "13%", background: prop, border: `2px solid ${ink}`, zIndex: 0 }}
        >
          {/* 행성 + 고리 */}
          <span className="absolute" style={{ left: "26%", top: "26%", width: "48%", height: "38%", background: propHi, borderRadius: "50%" }} />
          <span className="absolute" style={{ left: "8%", top: "44%", width: "84%", height: 2, background: ink, transform: "rotate(-18deg)" }} />
        </div>
      )}
      {has("sofa") && (
        <div className="absolute" style={{ left: "46%", bottom: "5%", width: "13%", height: "11%", zIndex: 1 }}>
          {/* 등받이 + 시트 + 팔걸이 */}
          <span className="absolute inset-x-0 top-0" style={{ height: "55%", background: propHi, border: `2px solid ${ink}` }} />
          <span className="absolute inset-x-0 bottom-0" style={{ height: "52%", background: prop, border: `2px solid ${ink}` }} />
          <span className="absolute" style={{ left: "-6%", bottom: 0, width: "14%", height: "78%", background: prop, border: `2px solid ${ink}` }} />
          <span className="absolute" style={{ right: "-6%", bottom: 0, width: "14%", height: "78%", background: prop, border: `2px solid ${ink}` }} />
        </div>
      )}
      {has("wallTv") && (
        <div
          className="absolute"
          style={{ left: "68%", top: "36%", width: "15%", height: "11%", background: ink, border: `2px solid ${ink}`, zIndex: 0 }}
        >
          <span className="absolute inset-[12%]" style={{ background: propHi }} />
          <span className="absolute" style={{ left: "20%", top: "30%", width: "26%", height: "22%", background: prop }} />
        </div>
      )}
      {has("catTower") && (
        <div className="absolute" style={{ left: "89.5%", bottom: "6%", width: "9%", height: "24%", zIndex: 1 }}>
          {/* 기둥 + 하단/상단 플랫폼 + 꼭대기 박스 */}
          <span className="absolute left-1/2 bottom-0 w-[3px] -translate-x-1/2" style={{ height: "88%", background: ink }} />
          <span className="absolute inset-x-0 bottom-0" style={{ height: "14%", background: prop, border: `2px solid ${ink}` }} />
          <span className="absolute inset-x-[6%]" style={{ bottom: "44%", height: "12%", background: prop, border: `2px solid ${ink}` }} />
          <span className="absolute inset-x-[14%] top-0" style={{ height: "30%", background: propHi, border: `2px solid ${ink}` }} />
        </div>
      )}
      {has("chandelier") && (
        <div className="absolute" style={{ left: "44%", top: "0%", width: "12%", height: "8%", zIndex: 0 }}>
          {/* 천장 스템 + 가로 암 + 전구 3개 */}
          <span className="absolute left-1/2 top-0 w-[2px] -translate-x-1/2" style={{ height: "42%", background: ink }} />
          <span className="absolute" style={{ left: "8%", top: "42%", width: "84%", height: 2, background: ink }} />
          {["6%", "44%", "82%"].map((l) => (
            <span
              key={l}
              className="absolute"
              style={{ left: l, top: "52%", width: "14%", height: "38%", background: propHi, border: `2px solid ${ink}`, borderRadius: "0 0 50% 50%" }}
            />
          ))}
        </div>
      )}
      {has("candleSet") && (
        <div className="absolute" style={{ left: "76%", top: "3%", width: "10%", height: "5%", zIndex: 0 }}>
          <span className="absolute" style={{ left: "10%", bottom: 0, width: "18%", height: "80%", background: propHi, border: `2px solid ${ink}` }} />
          <span className="absolute" style={{ left: "55%", bottom: 0, width: "18%", height: "60%", background: propHi, border: `2px solid ${ink}` }} />
        </div>
      )}
      {has("succulents") && (
        <div className="absolute" style={{ left: "88%", top: "3%", width: "6%", height: "6%", zIndex: 1 }}>
          <span className="absolute inset-x-0 bottom-0" style={{ height: "45%", background: prop, border: `2px solid ${ink}` }} />
          <span className="absolute" style={{ left: "10%", right: "10%", bottom: "40%", height: "60%", background: propHi, borderRadius: "50% 50% 20% 20%" }} />
        </div>
      )}
      {has("bookshelf") && (
        <div className="absolute" style={{ left: "1%", top: "24%", width: "10%", height: "18%", background: propHi, border: `2px solid ${ink}`, zIndex: 0 }}>
          {[65, 30].map((b) => (
            <span key={b} className="absolute" style={{ left: 0, right: 0, bottom: `${b}%`, height: 2, background: ink }} />
          ))}
        </div>
      )}
      {has("moodLamp") && (
        <div className="absolute" style={{ left: "82%", top: "10%", width: "6%", height: "14%", zIndex: 1 }}>
          <span className="absolute left-1/2 bottom-0 w-[2px] -translate-x-1/2" style={{ height: "70%", background: ink }} />
          <span className="absolute inset-x-0 top-0" style={{ height: "35%", background: propHi, border: `2px solid ${ink}`, borderRadius: "50%" }} />
        </div>
      )}
      {has("teddyBear") && (
        <div className="absolute" style={{ left: "6%", bottom: "20%", width: "9%", height: "10%", zIndex: 2 }} aria-label="곰인형">
          <span className="absolute" style={{ left: "10%", bottom: 0, width: "80%", height: "62%", background: prop, border: `2px solid ${ink}`, borderRadius: "30%" }} />
          <span className="absolute" style={{ left: "18%", top: 0, width: "64%", height: "44%", background: prop, border: `2px solid ${ink}`, borderRadius: "50%" }} />
          <span className="absolute" style={{ left: "6%", top: "-6%", width: "20%", height: "20%", background: prop, borderRadius: "50%" }} />
          <span className="absolute" style={{ right: "6%", top: "-6%", width: "20%", height: "20%", background: prop, borderRadius: "50%" }} />
        </div>
      )}
      {has("dartboard") && (
        <div className="absolute" style={{ left: "91%", top: "26%", width: "7%", height: "10%", background: propHi, border: `2px solid ${ink}`, borderRadius: "50%", zIndex: 1 }}>
          <span className="absolute inset-[28%] rounded-full" style={{ background: ink }} />
        </div>
      )}
      {has("turntable") && (
        <div className="absolute" style={{ left: "1%", top: "18%", width: "10%", height: "5%", background: prop, border: `2px solid ${ink}`, zIndex: 1 }}>
          <span className="absolute" style={{ left: "60%", top: "15%", width: "30%", height: "70%", background: ink, borderRadius: "50%" }} />
        </div>
      )}
      {has("vanity") && (
        <div className="absolute" style={{ left: "1%", top: "45%", width: "9%", height: "12%", zIndex: 1 }}>
          <span className="absolute inset-x-0 bottom-0" style={{ height: "55%", background: prop, border: `2px solid ${ink}` }} />
          <span className="absolute" style={{ left: "20%", right: "20%", bottom: "50%", height: "50%", background: propHi, border: `2px solid ${ink}`, borderRadius: "50% 50% 0 0" }} />
        </div>
      )}
      {has("miniFridge") && (
        <div className="absolute" style={{ left: "52%", bottom: "6%", width: "8%", height: "16%", background: propHi, border: `2px solid ${ink}`, zIndex: 1 }}>
          <span className="absolute inset-x-0" style={{ top: "34%", height: 2, background: ink }} />
        </div>
      )}
      {has("airConditioner") && (
        <div className="absolute" style={{ left: "60%", top: "2%", width: "14%", height: "7%", background: propHi, border: `2px solid ${ink}`, zIndex: 0 }}>
          <span className="absolute" style={{ left: "10%", right: "10%", bottom: "15%", height: "20%", background: ink }} />
        </div>
      )}
      {has("massageChair") && (
        <div className="absolute" style={{ left: "16%", top: "38%", width: "11%", height: "15%", zIndex: 1 }}>
          <span className="absolute inset-x-0 bottom-0" style={{ height: "60%", background: prop, border: `2px solid ${ink}` }} />
          <span className="absolute inset-x-0 top-0" style={{ height: "50%", background: propHi, border: `2px solid ${ink}` }} />
        </div>
      )}
      {has("bigAquarium") && (
        <div className="absolute" style={{ left: "14%", top: "24%", width: "14%", height: "12%", background: propHi, border: `2px solid ${ink}`, zIndex: 1 }}>
          <span className="absolute" style={{ left: "30%", top: "35%", width: "16%", height: "20%", background: ink, borderRadius: "50%" }} />
          <span className="absolute" style={{ left: "58%", top: "50%", width: "12%", height: "16%", background: ink, borderRadius: "50%" }} />
        </div>
      )}
      {has("homeTheater") && (
        <div className="absolute" style={{ left: "68%", top: "48%", width: "15%", height: "5%", background: ink, zIndex: 0 }}>
          <span className="absolute inset-[18%]" style={{ background: propHi }} />
        </div>
      )}
      {has("grandPiano") && (
        <div className="absolute" style={{ left: "36%", bottom: "6%", width: "18%", height: "13%", zIndex: 1 }} aria-label="그랜드 피아노">
          <span className="absolute inset-x-0 bottom-0" style={{ height: "60%", background: ink, border: `2px solid ${ink}` }} />
          <span
            className="absolute"
            style={{ left: 0, bottom: "55%", width: "70%", height: "45%", background: ink, border: `2px solid ${ink}`, clipPath: "polygon(0 100%, 100% 100%, 40% 0, 0 0)" }}
          />
        </div>
      )}
    </>
  );
}

/** 미니 픽셀 사람 — 배우자/자녀 공용(크기·위치만 다름) */
function MiniPerson({
  left,
  width,
  height,
  pal,
  label,
}: {
  left: string;
  width: string;
  height: string;
  pal: RoomPalette;
  label: string;
}) {
  const { ink, prop, propHi } = pal;
  return (
    <div
      className="absolute"
      style={{ left, bottom: "6%", width, height, zIndex: 2 }}
      aria-label={label}
    >
      {/* 머리 */}
      <span
        className="absolute"
        style={{ left: "18%", top: 0, width: "64%", height: "38%", background: propHi, border: `2px solid ${ink}` }}
      />
      {/* 몸통 */}
      <span
        className="absolute"
        style={{ left: "8%", top: "36%", width: "84%", height: "40%", background: prop, border: `2px solid ${ink}` }}
      />
      {/* 다리 */}
      <span className="absolute" style={{ left: "22%", bottom: 0, width: "18%", height: "26%", background: ink }} />
      <span className="absolute" style={{ right: "22%", bottom: 0, width: "18%", height: "26%", background: ink }} />
    </div>
  );
}

/** 가족 렌더 — 배우자(캐릭터 옆) + 자녀(오른쪽에 작게 최대 2명) */
function Family({
  family,
  pal,
}: {
  family: { spouse: boolean; children: number };
  pal: RoomPalette;
}) {
  return (
    <>
      {family.spouse && (
        <MiniPerson left="27%" width="9%" height="24%" pal={pal} label="배우자" />
      )}
      {family.children >= 1 && (
        <MiniPerson left="64%" width="6.5%" height="15%" pal={pal} label="첫째 아이" />
      )}
      {family.children >= 2 && (
        <MiniPerson left="72%" width="6.5%" height="13%" pal={pal} label="둘째 아이" />
      )}
    </>
  );
}

/** 픽셀 고양이 — 침대 위에 앉아 있는 실루엣(행복도 70+ 보상) */
function PixelCat({ pal }: { pal: RoomPalette }) {
  const { ink, prop } = pal;
  return (
    <div
      className="absolute"
      style={{ left: "8%", bottom: "25%", width: "13%", height: "11%", zIndex: 2 }}
      aria-label="고양이"
    >
      {/* 꼬리 */}
      <span className="absolute" style={{ left: "-10%", bottom: "22%", width: "14%", height: "60%", background: ink, borderRadius: "40%" }} />
      {/* 몸통 */}
      <span className="absolute" style={{ left: 0, bottom: 0, width: "68%", height: "58%", background: prop, border: `2px solid ${ink}` }} />
      {/* 머리 */}
      <span className="absolute" style={{ right: 0, bottom: "36%", width: "46%", height: "56%", background: prop, border: `2px solid ${ink}` }} />
      {/* 귀 */}
      <span className="absolute" style={{ right: "4%", bottom: "86%", width: "12%", height: "26%", background: ink }} />
      <span className="absolute" style={{ right: "32%", bottom: "86%", width: "12%", height: "26%", background: ink }} />
    </div>
  );
}

export function PixelRoom({
  stage,
  jobType = "none",
  night = false,
  sky,
  season,
  pet,
  family,
  items = [],
  width = 260,
  children,
  className,
}: PixelRoomProps) {
  const theme = roomThemeForStage(stage);
  // 창밖 하늘은 실제 시각을 따르고, 방 조명(어두운 팔레트)은 수면 중일 때만 끈다
  const effSky: SkyPhase = night ? "night" : sky ?? "day";
  const pal: RoomPalette = night
    ? LCD_ROOM_NIGHT_PALETTE
    : { ...LCD_ROOM_PALETTE, ...THEME_TINT[theme] };

  // 스크린리더용 한국어 설명(내부 stage 키 노출 방지) + 방 상태 요약
  const ariaParts = [`${stageLabel(stage)} 캐릭터의 방`];
  if (night) ariaParts.push("잠든 밤");
  if (pet === "cat") ariaParts.push("고양이가 있어요");
  if (family?.spouse) ariaParts.push("배우자와 함께");
  if ((family?.children ?? 0) > 0) ariaParts.push(`자녀 ${family!.children}명`);

  return (
    <div
      className={`lcd relative overflow-hidden ${className ?? ""}`}
      // 확정 폭(px) + max-width 로 축소만 허용 — width:100% 는 items-center 같은
      // shrink-to-fit 부모에서 0으로 붕괴해 방/캐릭터가 안 보이는 버그가 있었다
      style={{ width, maxWidth: "100%", aspectRatio: "100 / 82", background: pal.wall }}
      role="img"
      aria-label={ariaParts.join(" · ")}
    >
      {/* 바닥 */}
      <div
        className="absolute inset-x-0 bottom-0"
        style={{ height: "34%", background: pal.floor, borderTop: `2px solid ${pal.floorLine}` }}
      />
      {/* 창문 */}
      <div
        className="absolute overflow-hidden"
        style={{
          left: "12%",
          top: "12%",
          width: "26%",
          height: "30%",
          background: SKY_COLOR[effSky],
          border: `3px solid ${pal.ink}`,
        }}
      >
        <WindowView theme={theme} sky={effSky} season={season} ink={pal.ink} />
        <span className="absolute left-1/2 top-0 h-full w-[2px] -translate-x-1/2" style={{ background: pal.ink }} />
        <span className="absolute top-1/2 left-0 h-[2px] w-full -translate-y-1/2" style={{ background: pal.ink }} />
      </div>

      {/* 벽 장식(단계별) */}
      <WallDecor theme={theme} pal={pal} />

      {/* 가구(단계 + 직업별) */}
      <FurnSet theme={theme} job={jobType} pal={pal} />

      {/* 구매한 아이템(방 꾸미기 상점) */}
      {items.length > 0 && <OwnedItems items={items} pal={pal} />}

      {/* 반려동물 */}
      {pet === "cat" && <PixelCat pal={pal} />}

      {/* 가족(배우자/자녀) */}
      {family && (family.spouse || family.children > 0) && (
        <Family family={family} pal={pal} />
      )}

      {/* 캐릭터 (바닥 중앙) */}
      <div className="absolute bottom-[7%] left-1/2 -translate-x-1/2" style={{ zIndex: 3 }}>
        {children}
      </div>
    </div>
  );
}
