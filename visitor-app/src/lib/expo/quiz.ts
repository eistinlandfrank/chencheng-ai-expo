import type { BoothCategory } from "./booths";

// Home page horizontal choice quiz — swipes right after each answer.
export interface QuizStep {
  id: string;
  question: string;
  options: Array<{ label: string; emoji: string; tags: BoothCategory[] }>;
}

export const QUIZ_STEPS: QuizStep[] = [
  {
    id: "time",
    question: "你今天大概有多少时间逛展？",
    options: [
      { label: "1 小时快闪", emoji: "⚡", tags: ["ai", "robot"] },
      { label: "2 小时深度", emoji: "🎯", tags: ["ai", "chip", "robot"] },
      { label: "半天慢慢逛", emoji: "🚶", tags: ["ai", "chip", "robot", "hardware"] },
    ],
  },
  {
    id: "topic",
    question: "最想看的方向是？",
    options: [
      { label: "机器人", emoji: "🤖", tags: ["robot"] },
      { label: "AI 大模型", emoji: "🧠", tags: ["ai"] },
      { label: "芯片半导体", emoji: "🔩", tags: ["chip"] },
      { label: "智能硬件", emoji: "📱", tags: ["hardware"] },
    ],
  },
  {
    id: "style",
    question: "你更偏好哪种体验？",
    options: [
      { label: "现场演示", emoji: "🎬", tags: ["robot", "hardware"] },
      { label: "前沿技术", emoji: "🔬", tags: ["chip", "ai"] },
      { label: "落地应用", emoji: "🏭", tags: ["ai", "software"] },
    ],
  },
];

// Real-time crowd heat (mock). value = current people, 0-100 density.
export interface HeatPoint {
  boothId: string;
  people: number;
  density: number; // 0-100
  trend: "up" | "down" | "flat";
}

// deterministic base heat; the store adds small live jitter
export function baseHeat(boothId: string): number {
  const n = parseInt(boothId, 10);
  return 20 + ((n * 37) % 70);
}
