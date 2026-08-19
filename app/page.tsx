import type { CharacterStatus } from "@/types/character";
import { StartCta } from "@/components/common/StartCta";
import { CharacterPreviewCard } from "@/components/character/CharacterPreviewCard";
import { PixelIcon } from "@/components/pixel/PixelIcon";
import { BottomNav } from "@/components/common/BottomNav";
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
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col items-center px-5 py-12 pb-[calc(6rem+env(safe-area-inset-bottom))] lg:pb-12">
      <section className="flex w-full flex-col items-center text-center">
        <div className="mb-5 w-full max-w-[260px]">
          <CharacterPreviewCard lifeStage="middle" status={HERO_STATUS} width={240} />
        </div>
        <span className="pill mb-4 bg-white text-ink/70">한국형 인생·커리어 다마고치</span>
        <h1 className="font-pixel text-4xl font-bold sm:text-5xl">LifeGotchi</h1>
        <p className="mt-4 max-w-xl text-base text-ink/65 sm:text-lg">
          아기부터 키워서 공부·건강관리·자기개발을 거쳐 취업, 업무평가, 연봉협상, 승진까지.
          페이지를 켜두고 <b>주기적으로 직접 눌러줘야</b> 성장하는 인생 육성 웹앱이에요.
        </p>
        <div className="mt-8">
          <StartCta />
        </div>
        <p className="mt-3 font-pixel text-xs text-ink/45">
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

      <BottomNav />
    </main>
  );
}
