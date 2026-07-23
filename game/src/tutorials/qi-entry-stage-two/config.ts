export const QI_GUIDANCE_CONFIG = {
  followStrength: 7.5,
  damping: 0.84,
  pathMagnetStrength: 2.8,
  offPathTolerance: 0.085,
  absorbRadius: 0.065,
  absorbDuration: 1.6,
  idleHintDelay: 4,
  maxTrailParticles: 14,
  qiClusterParticleCount: 18,
  pickupRadius: 0.09,
} as const;

export const QI_START = { x: 0.31, y: 0.53 } as const;
export const DANTIAN_TARGET = { x: 0.515, y: 0.565 } as const;
export const GUIDE_PATH = {
  start: QI_START,
  control1: { x: 0.39, y: 0.43 },
  control2: { x: 0.47, y: 0.50 },
  end: DANTIAN_TARGET,
} as const;

export type QiGuidancePhase = "intro" | "waiting" | "dragging" | "released" | "absorbing" | "completed" | "paused";

export interface QiGuidanceState {
  phase: QiGuidancePhase;
  progress: number;
  pointerX: number;
  pointerY: number;
  qiX: number;
  qiY: number;
  qiVelocityX: number;
  qiVelocityY: number;
  isDragging: boolean;
  isNearDantian: boolean;
  offPathDistance: number;
  idleSeconds: number;
  absorbProgress: number;
}
