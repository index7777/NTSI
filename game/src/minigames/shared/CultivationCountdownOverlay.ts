import Phaser from "phaser";

export interface CultivationCountdownStep {
  label: string;
  number: number;
}

export interface CultivationCountdownOptions {
  steps: readonly CultivationCountdownStep[];
  finalLabel?: string;
  stepDurationMs?: number;
  finalHoldDurationMs?: number;
  onComplete: () => void;
}

export class CultivationCountdownOverlay {
  private readonly scene: Phaser.Scene;
  private readonly dom: Phaser.GameObjects.DOMElement;
  private readonly root: HTMLDivElement;
  private readonly options: Required<Omit<CultivationCountdownOptions, "onComplete">>
    & Pick<CultivationCountdownOptions, "onComplete">;
  private elapsedMs = 0;
  private lastFrameAt = 0;
  private paused = false;
  private completed = false;
  private started = false;

  constructor(
    scene: Phaser.Scene,
    parent: Phaser.GameObjects.Container,
    options: CultivationCountdownOptions,
  ) {
    this.scene = scene;
    this.options = {
      steps: options.steps,
      finalLabel: options.finalLabel ?? "",
      stepDurationMs: options.stepDurationMs ?? 800,
      finalHoldDurationMs: options.finalHoldDurationMs ?? 220,
      onComplete: options.onComplete,
    };
    this.root = document.createElement("div");
    this.root.className = "cultivation-countdown";
    this.root.setAttribute("aria-live", "polite");
    this.dom = scene.add.dom(600, 112, this.root).setDepth(75).setVisible(false);
    parent.add(this.dom);
  }

  start(now = performance.now()) {
    if (this.started || this.completed) return;
    this.started = true;
    this.lastFrameAt = now;
    this.dom.setVisible(true);
    this.render();
    this.scene.events.on(Phaser.Scenes.Events.UPDATE, this.update, this);
    this.scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);
  }

  setPaused(paused: boolean, now = performance.now()) {
    if (!this.started || this.completed || paused === this.paused) return;
    this.paused = paused;
    this.lastFrameAt = now;
    this.root.classList.toggle("cultivation-countdown--paused", paused);
  }

  isComplete() {
    return this.completed;
  }

  destroy() {
    this.scene.events.off(Phaser.Scenes.Events.UPDATE, this.update, this);
    this.dom.destroy();
  }

  private readonly update = (_time: number, delta: number) => {
    if (!this.started || this.paused || this.completed) return;
    const safeDelta = Number.isFinite(delta)
      ? Math.min(Math.max(0, delta), 100)
      : Math.min(Math.max(0, performance.now() - this.lastFrameAt), 100);
    this.lastFrameAt = performance.now();
    this.elapsedMs += safeDelta;
    const stepsDuration = this.options.steps.length * this.options.stepDurationMs;
    const totalDuration = stepsDuration + this.options.finalHoldDurationMs;
    if (this.elapsedMs >= totalDuration) {
      this.completed = true;
      this.scene.events.off(Phaser.Scenes.Events.UPDATE, this.update, this);
      this.root.classList.add("cultivation-countdown--leaving");
      this.scene.time.delayedCall(180, () => this.dom.active && this.dom.setVisible(false));
      this.options.onComplete();
      return;
    }
    this.render();
  };

  private render() {
    const stepIndex = Math.floor(this.elapsedMs / this.options.stepDurationMs);
    if (stepIndex < this.options.steps.length) {
      const step = this.options.steps[stepIndex];
      const key = `${step.label}-${step.number}`;
      if (this.root.dataset.step === key) return;
      this.root.dataset.step = key;
      this.root.innerHTML = [
        `<div class="cultivation-countdown__step" style="--countdown-step-duration:${this.options.stepDurationMs}ms">`,
        `<div class="cultivation-countdown__label">${step.label}</div>`,
        "</div>",
      ].join("");
      return;
    }
    if (this.root.dataset.step === "final") return;
    this.root.dataset.step = "final";
    this.root.innerHTML = this.options.finalLabel
      ? `<div class="cultivation-countdown__final">${this.options.finalLabel}</div>`
      : "";
  }
}
