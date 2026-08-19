import Link from "next/link";
import { BottomNav } from "@/components/common/BottomNav";
import { SaveBackup } from "@/components/common/SaveBackup";
import { NEGLECT_DEATH_MS } from "@/lib/game/constants";

const NEGLECT_HOURS = NEGLECT_DEATH_MS / 3_600_000;

// 게임 규칙 도움말 — "9분=1년, 방치하면 죽는다" 같은 핵심 규칙을 처음으로 명시하는 화면.
// BottomNav 의 도움말 탭에서 진입한다(랜딩 페이지는 신규 유저용으로 유지).

const SECTIONS: { emoji: string; title: string; lines: string[] }[] = [
  {
    emoji: "⏱️",
    title: "시간은 진짜로 흐른다",
    lines: [
      "게임 1년 = 현실 9분. 태어나서 60세(자연사 한계)까지 약 9시간 — 하루 근무시간 한 판이에요.",
      "페이지를 켜 둔 동안 배고픔·에너지가 실시간으로 줄어요. 다른 탭(성장기록·랭킹)에 있어도 시간은 흘러요.",
      `현실 ${NEGLECT_HOURS}시간 이상 접속하지 않으면 캐릭터가 방치로 세상을 떠나요. 그보다 짧게 자리를 비우면 상태가 조금 깎인 채로 기다리고 있어요.`,
    ],
  },
  {
    emoji: "🍚",
    title: "돌봄의 기본",
    lines: [
      "배고픔·에너지·기분·청결이 낮으면 건강이 깎이고 공부/업무 효율이 떨어져요(씻기기도 잊지 마세요 — 냄새나요).",
      "배부른데 또 먹이면 과식으로 살이 쪄요. 불량식품은 더 심해요. 체중이 적정 범위를 벗어나면 매시간 건강 페널티.",
      "운동(유산소/근력)은 체중 관리 + 지구력/근력을 키워요. 단련된 몸은 사고를 당해도 덜 다쳐요(최대 40% 경감).",
    ],
  },
  {
    emoji: "📚",
    title: "성장과 커리어",
    lines: [
      "공부는 짧은 집중 세션 — 시작하고 제때 완료하면 보너스. 레벨업마다 스탯 포인트 5개를 자유 배분해요.",
      "대학은 티어별로 등록금·커트라인·취업 보너스가 달라요. 등록금이 모자라면 학자금대출(연 3% 복리)로 넘어가고, 취업 후 연봉의 8%씩 자동 상환돼요.",
      "직장인의 연말 평가에는 업무 성과뿐 아니라 수면의 질, 그 해 운동·식사 실천까지 반영돼요. 자기개발을 1년 내내 안 하면 커리어가 깎여요.",
      "55세부터는 은퇴 준비 단계 — 마지막 5년을 마무리하는 시간이에요.",
    ],
  },
  {
    emoji: "💍",
    title: "인생 이벤트와 가족",
    lines: [
      "해마다 22% 확률로 인생 이벤트가 찾아와요(복권·여행·첫사랑·투자·스미싱…). 연말 결산 모달과 성장기록에 남아요.",
      "결혼 조건: 26~45세 · 취업 상태 · 행복도 55 이상. 결혼하면 배우자가 방에 함께 살아요.",
      "결혼 1년 후부터 아이가 생길 수 있어요(최대 2명). 아이는 방에 등장하고, 1명당 연 400만원 양육비가 들지만 가족이 있으면 행복도가 매년 조금씩 올라요.",
    ],
  },
  {
    emoji: "🛋️",
    title: "돈 쓰는 재미",
    lines: [
      "여가·쇼핑: 옷 쇼핑, 맛집, 콘서트, 호캉스, 여행, 부모님 선물 — 돈을 쓰면 행복도가 직접 올라요(쿨타임 있음). 행복도를 올리는 가장 확실한 수단!",
      "옷장: 의상 8벌·액세서리 8종 — 옷 뽑기(5만원)로 획득해요. 입히면 캐릭터 복장이 실제로 바뀌어요(원피스, 가죽 재킷, 왕관…). 의상 1벌 + 액세서리 1개 동시 착용.",
      "방 꾸미기: 러그부터 샹들리에까지 14종 — 인테리어 뽑기(150만원)로 얻으면 방에 바로 놓여요. 미소장 아이템 중 랜덤, 행운이 높으면 비싼 아이템이 잘 나와요.",
      "주거: 본가 → 원룸 월세(월 60) → 전세(3억, 전세대출 80%·연 3.8%) → 아파트 매매(6억~, 주담대 70%·연 4.2%). 모자란 돈은 자동 대출, 매년 이자 + 연봉의 12% 원금 상환. 자가는 집값이 매년 +2% 올라요.",
      "자동차: 자동차 뽑기(3,000만원) — 보유 티어보다 높은 차만 나와서 운 좋으면 수입차 직행! 집·차·보증금은 순자산으로 남아 엔딩 점수·부자 판정·2세대 유산에 전부 반영돼요(대출은 빚으로 차감).",
    ],
  },
  {
    emoji: "👶",
    title: "엔딩과 2세대",
    lines: [
      "수명·순자산·행복도·직업에 따라 12가지 이상의 열린 결말이 갈려요. 행복도는 매년 컨디션의 평생 평균이에요.",
      "자녀가 있다면 사망 후 '2세대로 이어가기' — 순자산의 20%를 유산으로, 부모 스탯의 일부를 재능으로 물려받아요.",
      "엔딩 화면에서 결과 카드를 이미지로 공유할 수 있어요.",
    ],
  },
  {
    emoji: "🔔",
    title: "편의 기능",
    lines: [
      "알림을 켜면 탭이 백그라운드일 때 캐릭터가 배고프거나 아프면 알려줘요(탭을 완전히 닫으면 알림이 오지 않아요).",
      "캐릭터 방 우상단 🎨 버튼으로 단색 LCD ↔ 내 기기 색 컬러 도트를 전환할 수 있어요.",
      "헤더의 🔊 버튼으로 8비트 효과음을 켜고 끌 수 있어요.",
    ],
  },
];

export default function HelpPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-6 pb-[calc(6rem+env(safe-area-inset-bottom))]">
      <header className="mb-4 flex items-center justify-between">
        <Link href="/dashboard" className="font-pixel text-sm font-bold text-ink/55">
          ← 대시보드
        </Link>
        <h1 className="font-pixel text-base font-bold">게임 도움말</h1>
        <span className="w-16" />
      </header>

      <p className="mb-4 text-sm text-ink/55">
        LifeGotchi 는 <b>페이지를 켜 두고 주기적으로 직접 돌봐야</b> 성장하는 인생
        육성 게임이에요. 핵심 규칙만 알면 어렵지 않아요.
      </p>

      <div className="flex flex-col gap-3">
        {SECTIONS.map((s) => (
          <section key={s.title} className="card p-4">
            <h2 className="mb-2 font-pixel text-sm font-bold text-ink/80">
              {s.emoji} {s.title}
            </h2>
            <ul className="flex flex-col gap-1.5">
              {s.lines.map((line, i) => (
                <li key={i} className="flex gap-1.5 text-[13px] leading-relaxed text-ink/70">
                  <span className="text-ink/30">·</span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <div className="mt-3">
        <SaveBackup />
      </div>

      <p className="mt-4 text-center text-xs text-ink/45">
        데이터는 이 브라우저에만 저장돼요 · 개인정보를 받지 않아요
      </p>
      <BottomNav />
    </main>
  );
}
