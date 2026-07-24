import Phaser from "phaser";

export interface CircularChargeGaugeOptions {
  x: number;
  y: number;
  radius?: number;
  onChargeComplete?: () => void;
}

export class CircularChargeGauge {
  private readonly graphics: Phaser.GameObjects.Graphics;
  private readonly label: Phaser.GameObjects.Text;
  private readonly x: number;
  private readonly y: number;
  private readonly radius: number;
  private readonly onChargeComplete?: () => void;
  private lastRawProgress = 0;
  private displayedProgress = 0;
  private completeLocked = false;

  constructor(
    scene: Phaser.Scene,
    parent: Phaser.GameObjects.Container,
    options: CircularChargeGaugeOptions,
  ) {
    this.x = options.x;
    this.y = options.y;
    this.radius = options.radius ?? 58;
    this.onChargeComplete = options.onChargeComplete;
    this.graphics = scene.add.graphics();
    this.label = scene.add.text(this.x, this.y, "0%", {
      fontFamily: '"Noto Serif TC", "Microsoft JhengHei", serif',
      fontSize: "18px",
      color: "#e5d6aa",
    }).setOrigin(0.5);
    parent.add([this.graphics, this.label]);
    this.draw(0, false);
  }

  update(rawProgress: number, now: number, paused: boolean) {
    const progress = Phaser.Math.Clamp(rawProgress, 0, 1);
    const restarted = progress + 0.5 < this.lastRawProgress;
    this.lastRawProgress = progress;
    if (progress >= 1 && !this.completeLocked) {
      this.completeLocked = true;
      this.onChargeComplete?.();
    }
    if (progress <= 0.001) {
      this.completeLocked = false;
    }

    if (!paused || restarted) {
      this.displayedProgress = progress;
    }

    this.draw(this.displayedProgress, progress >= 1);
  }

  private draw(progress: number, complete: boolean) {
    const start = -Math.PI / 2;
    const end = start + Math.PI * 2 * progress;
    this.graphics.clear()
      .lineStyle(1.5, 0xceb36e, 0.42)
      .strokeCircle(this.x, this.y, this.radius + 8)
      .lineStyle(12, 0x192a27, 0.78)
      .strokeCircle(this.x, this.y, this.radius)
      .lineStyle(complete ? 18 : 16, 0xd5b86f, complete ? 0.22 : 0.12)
      .beginPath()
      .arc(this.x, this.y, this.radius, start, end, false)
      .strokePath()
      .lineStyle(12, complete ? 0xe1c882 : 0xd5b86f, 0.98)
      .beginPath()
      .arc(this.x, this.y, this.radius, start, end, false)
      .strokePath();
    this.label.setText(`${Math.round(progress * 100)}%`);
    this.label.setColor(complete ? "#f0d899" : "#e5d6aa");
  }
}
