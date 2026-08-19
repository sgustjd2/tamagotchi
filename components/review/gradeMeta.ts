import type { ReviewGrade } from "@/types/character";

export interface GradeMeta {
  label: string;
  emoji: string;
  badge: string; // tailwind 배경/글자 색
}

export function gradeMeta(grade: ReviewGrade): GradeMeta {
  switch (grade) {
    case "S":
      return { label: "훌륭한 해", emoji: "🌟", badge: "bg-grape text-ink" };
    case "A":
      return { label: "좋은 해", emoji: "😄", badge: "bg-mint text-ink" };
    case "B":
      return { label: "무난한 해", emoji: "🙂", badge: "bg-sky text-ink" };
    case "C":
      return { label: "아쉬운 해", emoji: "😕", badge: "bg-butter text-ink" };
    case "D":
      return { label: "힘든 해", emoji: "😣", badge: "bg-coral text-ink" };
  }
}
