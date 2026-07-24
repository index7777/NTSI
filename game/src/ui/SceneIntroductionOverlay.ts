import Phaser from "phaser";

export interface SceneIntroductionOverlayOptions {
  title: string;
  holdMs?: number;
  onComplete: () => void;
}

export class SceneIntroductionOverlay {
  constructor(
    private readonly scene: Phaser.Scene,
    private readonly parent: Phaser.GameObjects.Container,
  ) {}

  play(options: SceneIntroductionOverlayOptions) {
    const overlay = this.scene.add.container(0, 0).setDepth(90);
    const shade = this.scene.add.rectangle(600, 337.5, 1200, 675, 0x07110f, 0.58);
    const titleGroup = this.scene.add.container(600, 315);
    const title = this.scene.add.text(0, 0, options.title, {
      fontFamily: '"Noto Serif TC", "Microsoft JhengHei", serif',
      fontSize: "40px",
      color: "#f2ead8",
      // Phaser includes trailing letter spacing in the measured text width,
      // which makes a mathematically centered underline look visually offset.
      letterSpacing: 0,
    }).setOrigin(0.5);
    const underlineWidth = Math.max(160, Math.min(320, title.displayWidth * 0.82));
    const underlineX = this.visualGlyphCenterOffset(title);
    const underline = this.scene.add.rectangle(underlineX, 39, 0, 1.5, 0xd6c6a4, 0.9);
    titleGroup.add([title, underline]);
    overlay.add([shade, titleGroup]);
    this.parent.add(overlay);
    title.setAlpha(0);
    underline.setAlpha(0);
    this.scene.tweens.add({ targets: title, alpha: 1, duration: 620, ease: "Sine.out" });
    this.scene.tweens.add({
      targets: underline,
      alpha: 1,
      width: underlineWidth,
      duration: 760,
      ease: "Sine.out",
    });
    this.scene.time.delayedCall(options.holdMs ?? 1500, () => {
      this.scene.tweens.add({
        targets: overlay,
        alpha: 0,
        duration: 620,
        ease: "Sine.inOut",
        onComplete: () => {
          overlay.destroy(true);
          options.onComplete();
        },
      });
    });
  }

  private visualGlyphCenterOffset(title: Phaser.GameObjects.Text) {
    title.updateText();
    const canvas = title.canvas;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context || canvas.width <= 0 || canvas.height <= 0) return 0;
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let left = canvas.width;
    let right = -1;
    for (let y = 0; y < canvas.height; y += 1) {
      for (let x = 0; x < canvas.width; x += 1) {
        if (pixels[(y * canvas.width + x) * 4 + 3] <= 8) continue;
        left = Math.min(left, x);
        right = Math.max(right, x);
      }
    }
    if (right < left) return 0;
    const resolution = title.style.resolution || 1;
    return ((left + right) / 2 - canvas.width / 2) / resolution;
  }
}
