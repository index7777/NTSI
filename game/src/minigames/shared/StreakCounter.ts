import Phaser from "phaser";

export type StreakTier = "normal" | "medium" | "high";

export interface StreakCounterState {
  label: string;
  value: number;
  tier: StreakTier;
  visible: boolean;
}

export class StreakCounter {
  private readonly scene: Phaser.Scene;
  private readonly dom: Phaser.GameObjects.DOMElement;
  private readonly root: HTMLDivElement;
  private label = "";
  private value = -1;
  private hideEvent?: Phaser.Time.TimerEvent;

  constructor(
    scene: Phaser.Scene,
    parent: Phaser.GameObjects.Container,
    x: number,
    y: number,
  ) {
    this.scene = scene;
    this.root = document.createElement("div");
    this.root.className = "streak-counter streak-counter--inactive streak-counter--normal";
    this.root.setAttribute("aria-live", "polite");
    this.root.innerHTML = [
      '<img class="streak-counter__ink" alt="">',
      '<img class="streak-counter__label" alt="">',
      '<div class="streak-counter__number-wrap">',
      '<span class="streak-counter__number">0</span>',
      "</div>",
    ].join("");
    this.dom = scene.add.dom(x, y, this.root).setDepth(70);
    parent.add(this.dom);
  }

  setState(state: StreakCounterState) {
    const value = Math.max(0, Math.floor(state.value));
    const isVisible = state.visible && value > 0;
    this.hideEvent?.remove(false);
    this.hideEvent = undefined;
    if (isVisible) this.dom.setVisible(true);
    this.root.classList.toggle("streak-counter--active", isVisible);
    this.root.classList.toggle("streak-counter--inactive", !isVisible);
    if (!isVisible && this.dom.visible) {
      this.hideEvent = this.scene.time.delayedCall(180, () => {
        if (this.root.classList.contains("streak-counter--inactive")) this.dom.setVisible(false);
      });
    }
    this.root.classList.remove(
      "streak-counter--normal",
      "streak-counter--medium",
      "streak-counter--high",
    );
    this.root.classList.add(`streak-counter--${state.tier}`);

    if (state.label !== this.label) {
      this.label = state.label;
      this.root.setAttribute("aria-label", state.label);
      const labelImage = this.root.querySelector(".streak-counter__label") as HTMLImageElement | null;
      const textureKey = `streak-label-${state.label}`;
      if (labelImage && this.scene.textures.exists(textureKey)) {
        labelImage.src = this.scene.textures.getBase64(textureKey);
        labelImage.alt = state.label;
      }
      const inkImage = this.root.querySelector(".streak-counter__ink") as HTMLImageElement | null;
      if (inkImage && this.scene.textures.exists("streak-ink-backing")) {
        inkImage.src = this.scene.textures.getBase64("streak-ink-backing");
      }
    }

    if (value === this.value) return;
    this.value = value;
    if (value === 0) return;
    const previous = this.root.querySelector(".streak-counter__number");
    const number = document.createElement("span");
    number.className = "streak-counter__number";
    number.textContent = String(value);
    previous?.replaceWith(number);
  }

  setPaused(paused: boolean) {
    this.root.classList.toggle("streak-counter--paused", paused);
  }
}
