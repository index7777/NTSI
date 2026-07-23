import Phaser from "phaser";

export class ComboCounter {
  private readonly dom: Phaser.GameObjects.DOMElement;
  private readonly root: HTMLDivElement;
  private combo = -1;

  constructor(
    scene: Phaser.Scene,
    parent: Phaser.GameObjects.Container,
    x: number,
    y: number,
  ) {
    this.root = document.createElement("div");
    this.root.className = "combo-counter combo-counter--inactive combo-counter--normal";
    this.root.setAttribute("aria-live", "polite");
    this.root.innerHTML = [
      '<div class="combo-counter__number-wrap">',
      '<span class="combo-counter__number">0</span>',
      "</div>",
    ].join("");
    this.dom = scene.add.dom(x, y, this.root).setDepth(70);
    parent.add(this.dom);
  }

  setCombo(value: number) {
    const combo = Math.max(0, Math.floor(value));
    if (combo === this.combo) return;
    this.combo = combo;

    this.root.classList.toggle("combo-counter--active", combo > 0);
    this.root.classList.toggle("combo-counter--inactive", combo === 0);
    this.dom.setVisible(combo > 0);
    this.root.classList.remove(
      "combo-counter--normal",
      "combo-counter--medium",
      "combo-counter--high",
    );
    this.root.classList.add(
      combo >= 25
        ? "combo-counter--high"
        : combo >= 10
          ? "combo-counter--medium"
          : "combo-counter--normal",
    );

    if (combo === 0) return;
    const previous = this.root.querySelector(".combo-counter__number");
    const number = document.createElement("span");
    number.className = "combo-counter__number";
    number.textContent = String(combo);
    previous?.replaceWith(number);
  }

  setPaused(paused: boolean) {
    this.root.classList.toggle("combo-counter--paused", paused);
  }
}
