import { type Booth, type BoothCategory } from "./booths";
import { ACTIVE_BOOTHS as BOOTHS } from "./DATA_SOURCE";

/** Pick top booths matching a set of category tags; returns a recommended order. */
export function recommendBooths(tags: BoothCategory[], limit = 4): Booth[] {
  const weight = new Map<BoothCategory, number>();
  tags.forEach((t) => weight.set(t, (weight.get(t) ?? 0) + 1));
  const scored = BOOTHS.map((b) => ({
    b,
    score: (weight.get(b.category) ?? 0) * 10 + b.recommendMinutes / 100,
  }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);
  const picked = (scored.length ? scored : BOOTHS.map((b) => ({ b, score: 0 })))
    .slice(0, limit)
    .map((x) => x.b);
  // order by booth id (walking order along the floor)
  return picked.sort((a, b) => a.id.localeCompare(b.id));
}

export function totalMinutes(booths: Booth[]): number {
  return booths.reduce((s, b) => s + b.recommendMinutes, 0);
}

export function reasonFor(tags: BoothCategory[]): string {
  const map: Record<BoothCategory, string> = {
    robot: "机器人现场演示",
    ai: "AI 前沿方案",
    chip: "芯片半导体",
    hardware: "智能硬件体验",
    software: "软件平台",
    service: "配套服务",
  };
  const uniq = Array.from(new Set(tags)).map((t) => map[t]);
  return `聚焦${uniq.slice(0, 3).join("、")}，为你挑选高价值展位并规划参观顺序。`;
}
