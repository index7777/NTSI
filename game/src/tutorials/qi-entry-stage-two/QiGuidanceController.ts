import { closestPointOnGuidePath, pointOnGuide } from "./bezier";
import { DANTIAN_TARGET, QI_GUIDANCE_CONFIG, QI_START, type QiGuidancePhase, type QiGuidanceState } from "./config";

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

export class QiGuidanceController {
  readonly state: QiGuidanceState = {
    phase: "intro", progress: 0,
    pointerX: QI_START.x, pointerY: QI_START.y,
    qiX: QI_START.x, qiY: QI_START.y,
    qiVelocityX: 0, qiVelocityY: 0,
    isDragging: false, isNearDantian: false,
    offPathDistance: 0, idleSeconds: 0, absorbProgress: 0,
  };
  private phaseBeforePause: QiGuidancePhase = "waiting";
  private absorbStartedAt = 0;

  begin() { if (this.state.phase === "intro") this.state.phase = "waiting"; }

  pointerDown(x: number, y: number) {
    if (!["waiting", "released"].includes(this.state.phase)) return false;
    if (Math.hypot(x - this.state.qiX, y - this.state.qiY) > QI_GUIDANCE_CONFIG.pickupRadius) return false;
    Object.assign(this.state, { pointerX: x, pointerY: y, isDragging: true, idleSeconds: 0, phase: "dragging" as const });
    return true;
  }

  pointerMove(x: number, y: number) {
    if (!this.state.isDragging || this.state.phase !== "dragging") return;
    this.state.pointerX = clamp01(x); this.state.pointerY = clamp01(y);
  }

  pointerUp() {
    if (this.state.phase !== "dragging") return;
    this.state.isDragging = false; this.state.phase = "released";
  }

  pause() {
    if (this.state.phase === "completed" || this.state.phase === "paused") return;
    this.phaseBeforePause = this.state.phase; this.state.isDragging = false; this.state.phase = "paused";
  }

  resume() {
    if (this.state.phase !== "paused") return;
    this.state.phase = this.phaseBeforePause === "dragging" ? "released" : this.phaseBeforePause;
  }

  update(deltaSeconds: number, nowSeconds: number) {
    const state = this.state;
    if (["paused", "completed", "intro"].includes(state.phase)) return;
    if (state.phase === "absorbing") { this.updateAbsorption(nowSeconds); return; }
    state.idleSeconds += deltaSeconds;
    const closest = closestPointOnGuidePath(state.qiX, state.qiY);
    state.offPathDistance = closest.distance;
    if (state.phase === "dragging") {
      state.qiVelocityX += (state.pointerX - state.qiX) * QI_GUIDANCE_CONFIG.followStrength * deltaSeconds;
      state.qiVelocityY += (state.pointerY - state.qiY) * QI_GUIDANCE_CONFIG.followStrength * deltaSeconds;
      state.progress = Math.max(state.progress, closest.t);
    } else state.qiVelocityY -= 0.0018 * deltaSeconds;
    state.qiVelocityX += (closest.x - state.qiX) * QI_GUIDANCE_CONFIG.pathMagnetStrength * deltaSeconds;
    state.qiVelocityY += (closest.y - state.qiY) * QI_GUIDANCE_CONFIG.pathMagnetStrength * deltaSeconds;
    const damping = Math.pow(QI_GUIDANCE_CONFIG.damping, deltaSeconds * 60);
    state.qiVelocityX *= damping; state.qiVelocityY *= damping;
    state.qiX += state.qiVelocityX * deltaSeconds; state.qiY += state.qiVelocityY * deltaSeconds;
    state.isNearDantian = Math.hypot(state.qiX - DANTIAN_TARGET.x, state.qiY - DANTIAN_TARGET.y) < QI_GUIDANCE_CONFIG.absorbRadius;
    if (state.isNearDantian || state.progress >= 0.965) {
      state.phase = "absorbing"; state.isDragging = false; state.absorbProgress = 0; this.absorbStartedAt = nowSeconds;
    }
  }

  private updateAbsorption(nowSeconds: number) {
    const state = this.state;
    const t = clamp01((nowSeconds - this.absorbStartedAt) / QI_GUIDANCE_CONFIG.absorbDuration);
    state.absorbProgress = t;
    const start = pointOnGuide(Math.max(0.9, state.progress));
    const angle = Math.PI * (1.15 - t); const radius = 0.045 * (1 - t);
    state.qiX = DANTIAN_TARGET.x + Math.cos(angle) * radius + (start.x - DANTIAN_TARGET.x) * (1 - t) * 0.25;
    state.qiY = DANTIAN_TARGET.y + Math.sin(angle) * radius + (start.y - DANTIAN_TARGET.y) * (1 - t) * 0.25;
    state.progress = Math.max(state.progress, t);
    if (t >= 1) state.phase = "completed";
  }
}
