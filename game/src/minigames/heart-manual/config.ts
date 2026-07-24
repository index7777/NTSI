import type { RhythmJudgement } from "../shared/RhythmTimingController";
import { DEFAULT_STREAK_ACCELERATION, DEFAULT_STREAK_MIN_INTERVAL_MS } from "../shared/streakAcceleration";

export const HEART_MANUAL_CONFIG = {
  roundDurationMs: 25_000,
  countdownSeconds: 3,
  timingWindows: { PERFECT: 70, GOOD: 150, NORMAL: 250 },
  scoreValues: { PERFECT: 100, GOOD: 70, NORMAL: 40, MISS: 0 } as Record<RhythmJudgement, number>,
  comboSpeedTable: DEFAULT_STREAK_ACCELERATION,
  streakAccelerationEnabled: true,
  minIntervalMs: DEFAULT_STREAK_MIN_INTERVAL_MS,
  randomVariationMs: 50,
  nextRoundDelayMs: 120,
  meridianPath: [
    { name: "百會", x: 476, y: 259 },
    { name: "神庭", x: 474, y: 312 },
    { name: "膻中", x: 471, y: 376 },
    { name: "關元", x: 466, y: 446 },
    { name: "氣海", x: 464, y: 530 },
  ],
  labels: {
    PERFECT: "頓悟",
    GOOD: "明悟",
    NORMAL: "參悟",
    MISS: "雜念",
  } as Record<RhythmJudgement, string>,
  rewardFormula: { baseCultivation: 10, perfectBonus: 2, goodBonus: 1 },
} as const;
