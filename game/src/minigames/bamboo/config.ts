import type { RhythmJudgement } from "../shared/RhythmTimingController";
import { DEFAULT_STREAK_ACCELERATION, DEFAULT_STREAK_MIN_INTERVAL_MS } from "../shared/streakAcceleration";

export type BambooJudgement = RhythmJudgement;

export const BAMBOO_GAME_CONFIG = {
  roundDurationMs: 30_000,
  countdownSeconds: 3,
  targetRadius: 58,
  ringStartRadius: 142,
  timingWindows: { PERFECT: 70, GOOD: 150, NORMAL: 250 },
  scoreValues: { PERFECT: 100, GOOD: 70, NORMAL: 40, MISS: 0 },
  comboSpeedTable: DEFAULT_STREAK_ACCELERATION,
  streakAccelerationEnabled: true,
  minIntervalMs: DEFAULT_STREAK_MIN_INTERVAL_MS,
  randomVariationMs: 80,
  nextRoundDelayMs: 220,
  passiveResetAtTarget: true,
  passiveResetHoldMs: 200,
  goalCount: 10,
  rewardFormula: { baseCultivation: 30, perfectBonus: 0, goodBonus: 0 },
  labels: {
    PERFECT: "人刃合一",
    GOOD: "運勁得宜",
    NORMAL: "勉強斬中",
    MISS: "氣息紊亂",
  },
} as const;

export function bambooIntervalForCombo(combo: number) {
  const entry = BAMBOO_GAME_CONFIG.comboSpeedTable.find((row) => combo >= row.minCombo);
  return Math.max(BAMBOO_GAME_CONFIG.minIntervalMs, entry?.intervalMs ?? 1300);
}
