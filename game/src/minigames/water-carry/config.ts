export const WATER_CARRY_CONFIG = {
  durationSeconds: 25,
  countdownSeconds: 3,
  inputForce: 2.15,
  baseDisturbance: 0.32,
  maxDisturbance: 0.72,
  velocityDamping: 0.92,
  centerRecovery: 0.08,
  safeZone: 0.18,
  warningZone: 0.52,
  dangerZone: 0.78,
  spillStartZone: 0.68,
  maxSpillPerSecond: 0.12,
  fullLossThreshold: 1,
  fullLossHoldSeconds: 0.45,
  fullLossWaterPenalty: 0.14,
  reboundPosition: 0.55,
  disturbanceMinSeconds: 0.7,
  disturbanceMaxSeconds: 1.6,
  rewardCultivation: 10,
} as const;

export type BalanceZone = "stable" | "warning" | "spill" | "lost";

