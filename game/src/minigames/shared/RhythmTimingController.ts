export type RhythmJudgement = "PERFECT" | "GOOD" | "NORMAL" | "MISS";
export type RhythmGameState = "ready" | "playing" | "paused" | "finished" | "quitConfirm";

export interface RhythmTimingConfig {
  roundDurationMs: number;
  timingWindows: { PERFECT: number; GOOD: number; NORMAL: number };
  scoreValues: Record<RhythmJudgement, number>;
  comboSpeedTable: readonly { minCombo: number; intervalMs: number }[];
  minIntervalMs: number;
  randomVariationMs: number;
  nextRoundDelayMs: number;
}

export interface RhythmGameStats {
  score: number;
  combo: number;
  maxCombo: number;
  strikes: number;
  perfect: number;
  good: number;
  normal: number;
  miss: number;
}

export class RhythmTimingController {
  state: RhythmGameState = "ready";
  stats: RhythmGameStats = {
    score: 0, combo: 0, maxCombo: 0, strikes: 0,
    perfect: 0, good: 0, normal: 0, miss: 0,
  };

  protected roundEndsAt = 0;
  protected targetTime = 0;
  protected cycleStartedAt = 0;
  protected inputLocked = true;
  private pausedAt = 0;
  private stateBeforeConfirm: RhythmGameState = "playing";
  protected readonly config: RhythmTimingConfig;

  constructor(config: RhythmTimingConfig) {
    this.config = config;
  }

  begin(now: number) {
    this.state = "playing";
    this.roundEndsAt = now + this.config.roundDurationMs;
    this.scheduleTarget(now);
  }

  update(now: number): RhythmJudgement | "FINISHED" | null {
    if (this.state !== "playing") return null;
    if (now >= this.roundEndsAt) {
      this.state = "finished";
      this.inputLocked = true;
      return "FINISHED";
    }
    if (!this.inputLocked && now >= this.cycleStartedAt && now > this.targetTime + this.config.timingWindows.NORMAL) {
      return this.resolve("MISS", now);
    }
    return null;
  }

  input(now: number): RhythmJudgement | null {
    if (this.state !== "playing" || this.inputLocked || now < this.cycleStartedAt) return null;
    const delta = Math.abs(now - this.targetTime);
    const judgement: RhythmJudgement =
      delta <= this.config.timingWindows.PERFECT ? "PERFECT"
      : delta <= this.config.timingWindows.GOOD ? "GOOD"
      : delta <= this.config.timingWindows.NORMAL ? "NORMAL"
      : "MISS";
    return this.resolve(judgement, now);
  }

  pause(now: number) {
    if (this.state !== "playing") return;
    this.pausedAt = now;
    this.state = "paused";
  }

  resume(now: number) {
    if (this.state !== "paused") return;
    this.shiftTimers(now - this.pausedAt);
    this.state = "playing";
  }

  openQuitConfirm(now: number) {
    if (this.state !== "playing" && this.state !== "paused") return;
    this.stateBeforeConfirm = this.state;
    if (this.state === "playing") this.pausedAt = now;
    this.state = "quitConfirm";
  }

  cancelQuit(now: number) {
    if (this.state !== "quitConfirm") return;
    if (this.stateBeforeConfirm === "playing") this.shiftTimers(now - this.pausedAt);
    this.state = this.stateBeforeConfirm;
  }

  finishEarly() {
    this.state = "finished";
    this.inputLocked = true;
  }

  snapshot(now: number) {
    const travelDuration = Math.max(1, this.targetTime - this.cycleStartedAt);
    return {
      state: this.state,
      remainingMs: Math.max(0, this.roundEndsAt - now),
      cycleProgress: Math.max(0, Math.min(1, (now - this.cycleStartedAt) / travelDuration)),
      inputLocked: this.inputLocked,
    };
  }

  elapsedRatio(now: number) {
    if (this.roundEndsAt <= 0) return 0;
    const remainingMs = Math.max(0, this.roundEndsAt - now);
    return Math.max(0, Math.min(1, 1 - remainingMs / this.config.roundDurationMs));
  }

  protected intervalForCombo() {
    const entry = this.config.comboSpeedTable.find((row) => this.stats.combo >= row.minCombo);
    return Math.max(this.config.minIntervalMs, entry?.intervalMs ?? this.config.minIntervalMs);
  }

  protected resolve(judgement: RhythmJudgement, now: number) {
    if (this.inputLocked) return judgement;
    this.inputLocked = true;
    if (judgement === "MISS") {
      this.stats.miss += 1;
      this.stats.combo = 0;
    } else {
      this.stats.strikes += 1;
      const key = judgement.toLowerCase() as "perfect" | "good" | "normal";
      this.stats[key] += 1;
      this.stats.score += this.config.scoreValues[judgement];
      this.stats.combo += 1;
      this.stats.maxCombo = Math.max(this.stats.maxCombo, this.stats.combo);
    }
    this.scheduleTarget(now + this.config.nextRoundDelayMs);
    return judgement;
  }

  protected scheduleTarget(from: number) {
    const variation = (Math.random() * 2 - 1) * this.config.randomVariationMs;
    this.targetTime = from + this.intervalForCombo() + variation;
    this.cycleStartedAt = from;
    this.inputLocked = false;
  }

  private shiftTimers(offset: number) {
    const safeOffset = Math.max(0, offset);
    this.roundEndsAt += safeOffset;
    this.targetTime += safeOffset;
    this.cycleStartedAt += safeOffset;
  }
}
