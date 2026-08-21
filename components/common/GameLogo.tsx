import { cn } from "@/lib/utils";

/**
 * 게임 로고 워드마크 — 픽셀 폰트 + 하드 섀도 레이어(blush → ink)로
 * 레트로 게임 타이틀 화면의 로고 질감을 낸다. 크기는 className 의 text-* 로 조절.
 * as: 랜딩 타이틀 화면에선 h1, 다른 페이지(생성 등)의 장식 로고엔 span.
 */
export function GameLogo({
  className,
  as: Tag = "h1",
}: {
  className?: string;
  as?: "h1" | "span";
}) {
  return (
    <Tag
      className={cn(
        "select-none font-pixel font-bold tracking-tight text-ink",
        className,
      )}
      style={{
        lineHeight: 1,
        textShadow:
          "0.05em 0.05em 0 #FFB7C5, 0.1em 0.1em 0 rgba(46,39,34,0.18)",
      }}
    >
      Life
      <span className="text-primary-strong">Gotchi</span>
    </Tag>
  );
}
