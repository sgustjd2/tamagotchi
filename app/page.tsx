import type { CharacterStatus } from "@/types/character";
import { StartCta } from "@/components/common/StartCta";
import { PreviewDiorama } from "@/components/character/PreviewDiorama";
import { PixelIcon } from "@/components/pixel/PixelIcon";
import { GameLogo } from "@/components/common/GameLogo";
import { GAME_YEAR_MS, NEGLECT_DEATH_MS } from "@/lib/game/constants";
const HERO_STATUS: CharacterStatus = {
  hunger: 82,
  energy: 86,
  mood: 88,
  health: 92,
  stress: 8,
  focus: 62,
  sleepQuality: 86,
  cleanliness: 84,
  confidence: 55,
  burnout: 0,
  weight: 10,
};

const FEATURES = [
  { icon: "study", title: "집중 공부 세션", desc: "시작하고 제때 완료하면 보너스! 집중력이 높을수록 더 쑥쑥 자라요." },
  { icon: "feed", title: "맛있는 밥 챙기기", desc: "끼니를 잘 챙겨주면 공부·업무 효율이 쑥 올라가요." },
  { icon: "heart", title: "몸무게·건강 관리", desc: "골고루 먹고 운동하면 컨디션 최고! 탄탄하게 키워봐요." },
  { icon: "selfDev", title: "꾸준한 자기개발", desc: "조금씩 쌓으면 나이가 들어도 능력치가 빛나요." },
  { icon: "star", title: "취업·직무", desc: "학생 → 취준생 → 직장인. 15개 직군 중 골라 커리어를 쌓아요." },
  { icon: "bolt", title: "학위·연봉협상·승진", desc: "석·박사로 취업률을 높이고, 직접 연봉협상까지 도전!" },
];

export default function LandingPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col items-center px-5 py-12">
      {/* 게임 타이틀 화면 — 로고·기기 프레임 속 3D 방·시작 버튼이 한 화면에 완성 */}
      <section className="flex min-h-[calc(100dvh-6rem)] w-full flex-col items-center justify-center text-center">
        <span className="pill -rotate-2 bg-white text-ink/70">
          한국형 인생·커리어 다마고치
        </span>
        <div className="mt-4 animate-pop">
          <GameLogo className="text-5xl sm:text-7xl" />
        </div>

        {/* 다마고치 기기 프레임 속 3D 방 — 빈 배경에 상자만 뜨지 않게 셸 언어로 감싼다 */}
        <div className="mt-7 rounded-[2.25rem_2.25rem_1.75rem_1.75rem] border-[3px] border-ink bg-gradient-to-b from-blush via-[#FFD3DC] to-cream p-2.5 shadow-[5px_6px_0_0_rgba(46,39,34,0.16)]">
          <div className="w-[240px] sm:w-[280px]">
            <PreviewDiorama lifeStage="middle" status={HERO_STATUS} width={280} />
          </div>
        </div>

        <p className="mt-6 max-w-xl text-base text-ink/65 sm:text-lg">
          아기부터 키워서 공부·건강관리·자기개발을 거쳐{" "}
          <b>취업, 업무평가, 연봉협상, 승진까지</b>. 페이지를 켜두고 주기적으로
          직접 돌봐야 성장하는 인생 육성 웹앱이에요.
        </p>
        <div className="mt-6">
          <StartCta />
        </div>
        <p className="mt-3 font-pixel text-xs text-ink/45">
          게임 1년 = 현실 {GAME_YEAR_MS / 60000}분 ·{" "}
          {NEGLECT_DEATH_MS / 3_600_000}시간 이상 방치하면 떠나보낼 수 있어요
        </p>
        <p className="mt-1 font-pixel text-xs text-ink/45">
          회원가입 없이 바로 시작 · 개인정보를 받지 않아요
        </p>
      </section>

      <section className="mt-14 grid w-full grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f, i) => (
          <div
            key={f.title}
            className={`card p-5 transition-transform duration-200 ease-out hover:-translate-y-1 hover:rotate-0 ${
              i % 2 === 0 ? "sm:-rotate-1" : "sm:rotate-1"
            }`}
          >
            <span className="text-ink">
              <PixelIcon name={f.icon} size={28} />
            </span>
            <h3 className="mt-2 font-pixel text-base font-bold">{f.title}</h3>
            <p className="mt-1 text-sm text-ink/60">{f.desc}</p>
          </div>
        ))}
      </section>

      <footer className="mt-16 font-pixel text-center text-xs text-ink/50">
        데이터는 이 브라우저에만 저장됩니다 · 개인정보를 받지 않아요
      </footer>
    </main>
  );
}
