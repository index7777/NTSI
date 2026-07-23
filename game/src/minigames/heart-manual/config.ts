import type { RhythmJudgement } from "../shared/RhythmTimingController";

export const HEART_MANUAL_CONFIG = {
  roundDurationMs: 25_000,
  countdownSeconds: 3,
  timingWindows: { PERFECT: 70, GOOD: 150, NORMAL: 250 },
  scoreValues: { PERFECT: 100, GOOD: 70, NORMAL: 40, MISS: 0 } as Record<RhythmJudgement, number>,
  comboSpeedTable: [
    { minCombo: 21, intervalMs: 1000 },
    { minCombo: 11, intervalMs: 1150 },
    { minCombo: 0, intervalMs: 1300 },
  ],
  minIntervalMs: 900,
  randomVariationMs: 70,
  nextRoundDelayMs: 120,
  meridians: ["氣海", "關元", "膻中", "神庭", "百會"],
  labels: {
    PERFECT: "頓悟",
    GOOD: "明悟",
    NORMAL: "參悟",
    MISS: "雜念",
  } as Record<RhythmJudgement, string>,
  rewardFormula: { baseCultivation: 10, perfectBonus: 2, goodBonus: 1 },
} as const;
