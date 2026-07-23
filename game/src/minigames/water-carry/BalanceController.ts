import { BalanceZone, WATER_CARRY_CONFIG } from "./config";

export interface BalanceSnapshot {
  balancePosition: number;
  balanceVelocity: number;
  waterLeft: number;
  waterRight: number;
  stabilityScore: number;
  stableTime: number;
  warningTime: number;
  dangerTime: number;
  spillCount: number;
  lostWaterAmount: number;
  lossEvents: number;
  zone: BalanceZone;
}

export class BalanceController {
  balancePosition = 0;
  balanceVelocity = 0;
  externalForce = 0;
  waterLeft = 1;
  waterRight = 1;
  stabilityScore = 100;
  stableTime = 0;
  warningTime = 0;
  dangerTime = 0;
  spillCount = 0;
  lostWaterAmount = 0;
  lossEvents = 0;
  zone: BalanceZone = "stable";

  private nextDisturbanceAt = 0;
  private lossHoldTime = 0;
  private wasSpilling = false;

  update(deltaSeconds: number, elapsedSeconds: number, inputDirection: -1 | 0 | 1) {
    const dt = Math.min(0.05, Math.max(0, deltaSeconds));
    if (elapsedSeconds >= this.nextDisturbanceAt) this.createDisturbance(elapsedSeconds);

    this.balanceVelocity += this.externalForce * dt;
    this.balanceVelocity += inputDirection * WATER_CARRY_CONFIG.inputForce * dt;
    this.balanceVelocity += -this.balancePosition * WATER_CARRY_CONFIG.centerRecovery * dt;
    this.balanceVelocity *= Math.pow(WATER_CARRY_CONFIG.velocityDamping, dt * 60);
    this.balancePosition += this.balanceVelocity * dt;
    this.balancePosition = Math.max(-1.15, Math.min(1.15, this.balancePosition));
    this.externalForce *= Math.pow(0.84, dt * 60);

    const absolute = Math.abs(this.balancePosition);
    const instantStability = Math.max(0, Math.min(100, 100 - absolute * 100));
    const smoothing = 1 - Math.pow(0.96, dt * 60);
    this.stabilityScore += (instantStability - this.stabilityScore) * smoothing;

    if (absolute <= WATER_CARRY_CONFIG.safeZone) {
      this.stableTime += dt;
      this.zone = "stable";
    } else if (absolute <= WATER_CARRY_CONFIG.spillStartZone) {
      this.warningTime += dt;
      this.zone = "warning";
    } else {
      this.dangerTime += dt;
      this.zone = absolute >= WATER_CARRY_CONFIG.fullLossThreshold ? "lost" : "spill";
      this.spill(dt);
    }

    if (absolute >= WATER_CARRY_CONFIG.fullLossThreshold) {
      this.lossHoldTime += dt;
      if (this.lossHoldTime >= WATER_CARRY_CONFIG.fullLossHoldSeconds) this.triggerLoss();
    } else {
      this.lossHoldTime = 0;
    }
    return this.snapshot();
  }

  snapshot(): BalanceSnapshot {
    return {
      balancePosition: this.balancePosition,
      balanceVelocity: this.balanceVelocity,
      waterLeft: this.waterLeft,
      waterRight: this.waterRight,
      stabilityScore: this.stabilityScore,
      stableTime: this.stableTime,
      warningTime: this.warningTime,
      dangerTime: this.dangerTime,
      spillCount: this.spillCount,
      lostWaterAmount: this.lostWaterAmount,
      lossEvents: this.lossEvents,
      zone: this.zone,
    };
  }

  private createDisturbance(elapsedSeconds: number) {
    const difficulty = elapsedSeconds <= 5 ? 0
      : elapsedSeconds <= 15 ? (elapsedSeconds - 5) / 10 * 0.58
      : 0.58 + (elapsedSeconds - 15) / 10 * 0.42;
    const magnitude = WATER_CARRY_CONFIG.baseDisturbance
      + (WATER_CARRY_CONFIG.maxDisturbance - WATER_CARRY_CONFIG.baseDisturbance) * difficulty;
    this.externalForce += (Math.random() < 0.5 ? -1 : 1) * magnitude * (0.55 + Math.random() * 0.45);
    this.nextDisturbanceAt = elapsedSeconds
      + WATER_CARRY_CONFIG.disturbanceMinSeconds
      + Math.random() * (WATER_CARRY_CONFIG.disturbanceMaxSeconds - WATER_CARRY_CONFIG.disturbanceMinSeconds);
  }

  private spill(dt: number) {
    const severity = Math.min(
      1,
      (Math.abs(this.balancePosition) - WATER_CARRY_CONFIG.spillStartZone)
        / (1.15 - WATER_CARRY_CONFIG.spillStartZone),
    );
    const amount = WATER_CARRY_CONFIG.maxSpillPerSecond * severity * dt;
    if (this.balancePosition < 0) this.waterLeft = Math.max(0, this.waterLeft - amount);
    else this.waterRight = Math.max(0, this.waterRight - amount);
    this.lostWaterAmount += amount;
    if (!this.wasSpilling) this.spillCount += 1;
    this.wasSpilling = true;
  }

  private triggerLoss() {
    const left = this.balancePosition < 0;
    if (left) this.waterLeft = Math.max(0, this.waterLeft - WATER_CARRY_CONFIG.fullLossWaterPenalty);
    else this.waterRight = Math.max(0, this.waterRight - WATER_CARRY_CONFIG.fullLossWaterPenalty);
    this.lostWaterAmount += WATER_CARRY_CONFIG.fullLossWaterPenalty;
    this.lossEvents += 1;
    this.balancePosition = (left ? -1 : 1) * WATER_CARRY_CONFIG.reboundPosition;
    this.balanceVelocity *= -0.38;
    this.lossHoldTime = 0;
    this.wasSpilling = false;
  }
}

