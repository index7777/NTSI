import type { RhythmJudgement } from "../shared/RhythmTimingController";

export type BambooJudgement = RhythmJudgement;

export const BAMBOO_GAME_CONFIG = {
  roundDurationMs: 30_000,
  countdownSeconds: 3,
  targetRadius: 58,
  ringStartRadius: 142,
  timingWindows: { PERFECT: 70, GOOD: 150, NORMAL: 250 },
  scoreValues: { PERFECT: 100, GOOD: 70, NORMAL: 40, MISS: 0 },
  comboSpeedTable: [
    { minCombo: 20, intervalMs: 900 },
    { minCombo: 10, intervalMs: 1050 },
    { minCombo: 5, intervalMs: 1200 },
    { minCombo: 0, intervalMs: 1400 },
  ],
  minIntervalMs: 850,
  randomVariationMs: 80,
  nextRoundDelayMs: 220,
  goalCount: 10,
  rewardFormula: { baseCultivation: 10, perfectBonus: 2, goodBonus: 1 },
  labels: {
    PERFECT: "人刃合一",
    GOOD: "運勁得宜",
    NORMAL: "勉強斬中",
    MISS: "氣息紊亂",
  },
} as const;

export function bambooIntervalForCombo(combo: number) {
  const entry = BAMBOO_GAME_CONFIG.comboSpeedTable.find((row) => combo >= row.minCombo);
  return Math.max(BAMBOO_GAME_CONFIG.minIntervalMs, entry?.intervalMs ?? 1400);
}
