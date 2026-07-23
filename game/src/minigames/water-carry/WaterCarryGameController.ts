import { BalanceController, BalanceSnapshot } from "./BalanceController";
import { WATER_CARRY_CONFIG } from "./config";

export type WaterCarryPhase = "ready" | "countdown" | "playing" | "paused" | "finished" | "quitConfirm";

export class WaterCarryGameController {
  phase: WaterCarryPhase = "ready";
  readonly balance = new BalanceController();

  private endsAt = 0;
  private pausedAt = 0;
  private phaseBeforeConfirm: WaterCarryPhase = "playing";

  begin(now: number) {
    this.phase = "playing";
    this.endsAt = now + WATER_CARRY_CONFIG.durationSeconds * 1000;
  }

  update(now: number, deltaSeconds: number, inputDirection: -1 | 0 | 1) {
    if (this.phase !== "playing") return null;
    if (now >= this.endsAt) {
      this.phase = "finished";
      return "FINISHED" as const;
    }
    const elapsedSeconds = WATER_CARRY_CONFIG.durationSeconds - this.remainingMs(now) / 1000;
    return this.balance.update(deltaSeconds, elapsedSeconds, inputDirection);
  }

  pause(now: number) {
    if (this.phase !== "playing") return;
    this.pausedAt = now;
    this.phase = "paused";
  }

  resume(now: number) {
    if (this.phase !== "paused") return;
    this.endsAt += Math.max(0, now - this.pausedAt);
    this.phase = "playing";
  }

  openQuitConfirm(now: number) {
    if (this.phase !== "playing" && this.phase !== "paused") return;
    this.phaseBeforeConfirm = this.phase;
    if (this.phase === "playing") this.pausedAt = now;
    this.phase = "quitConfirm";
  }

  cancelQuit(now: number) {
    if (this.phase !== "quitConfirm") return;
    if (this.phaseBeforeConfirm === "playing") this.endsAt += Math.max(0, now - this.pausedAt);
    this.phase = this.phaseBeforeConfirm;
  }

  finish() {
    this.phase = "finished";
  }

  remainingMs(now: number) {
    return Math.max(0, this.endsAt - now);
  }

  result(): BalanceSnapshot & { remainingWaterPercent: number; evaluation: string } {
    const snapshot = this.balance.snapshot();
    const remainingWaterPercent = Math.round((snapshot.waterLeft + snapshot.waterRight) * 50);
    const evaluation = snapshot.stabilityScore >= 90 ? "步履如常"
      : snapshot.stabilityScore >= 75 ? "行氣穩健"
      : snapshot.stabilityScore >= 60 ? "尚能持衡"
      : "水灑半途";
    return { ...snapshot, remainingWaterPercent, evaluation };
  }
}
