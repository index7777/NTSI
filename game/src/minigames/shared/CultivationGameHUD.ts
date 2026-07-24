import Phaser from "phaser";

export interface CultivationGameHUDOptions {
  title: string;
  durationSeconds: number;
  info: string;
  hint: string;
  progressCurrent?: number;
  progressGoal?: number;
  rightLabel?: string;
  rightValue?: string;
  identity?: string;
  cultivation?: string;
  onReturnPause?: () => void;
  onReturnResume?: () => void;
  onReturn: () => void;
  onPause: () => void;
}

export class CultivationGameHUD {
  private readonly timeText: Phaser.GameObjects.Text;
  private readonly infoText: Phaser.GameObjects.Text;
  private readonly hintText: Phaser.GameObjects.Text;
  private readonly progressText: Phaser.GameObjects.Text;
  private readonly progressFill: Phaser.GameObjects.Rectangle;
  private readonly rightLabel?: Phaser.GameObjects.Text;
  private readonly rightValue?: Phaser.GameObjects.Text;

  constructor(
    scene: Phaser.Scene,
    parent: Phaser.GameObjects.Container,
    options: CultivationGameHUDOptions,
  ) {
    const textStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: '"Noto Serif TC", "Microsoft JhengHei", serif',
      color: "#1f2926",
      align: "center",
    };
    const top = scene.add.image(600, 56, "cultivation-hud-top").setDisplaySize(1200, 112).setDepth(60);
    const info = scene.add.image(145, 280, "cultivation-hud-info").setDisplaySize(230, 260).setDepth(60);
    const hint = scene.add.image(600, 632, "cultivation-hud-hint").setDisplaySize(640, 78).setDepth(60);
    const backIcon = scene.add.image(42, 56, "cultivation-hud-back").setDisplaySize(36, 36).setDepth(63);
    const hourglass = scene.add.image(348, 67, "cultivation-hud-hourglass").setDisplaySize(21, 29).setDepth(63);
    const pauseIcon = scene.add.image(1088, 56, "cultivation-hud-pause").setDisplaySize(39, 39).setDepth(63);
    const backZone = scene.add.zone(73, 56, 135, 86).setInteractive({ useHandCursor: true }).setDepth(65);
    const pauseZone = scene.add.zone(1125, 56, 128, 86).setInteractive({ useHandCursor: true }).setDepth(65);
    const backText = scene.add.text(88, 56, "返回", { ...textStyle, fontSize: "20px" }).setOrigin(0.5).setDepth(64);
    const pauseText = scene.add.text(1142, 56, "暫停", { ...textStyle, fontSize: "20px" }).setOrigin(0.5).setDepth(64);
    const timeLabel = scene.add.text(292, 27, "時間", { ...textStyle, fontSize: "15px" }).setOrigin(0.5).setDepth(64);
    const titleText = scene.add.text(665, 27, options.title, { ...textStyle, fontSize: "20px" }).setOrigin(0.5).setDepth(64);
    this.timeText = scene.add.text(292, 67, this.formatTime(options.durationSeconds), {
      ...textStyle,
      fontSize: "23px",
    }).setOrigin(0.5).setDepth(64);
    const progressTrack = scene.add.rectangle(665, 60, 270, 10, 0x5a5d59, 0.72).setDepth(63);
    this.progressFill = scene.add.rectangle(530, 60, 0, 8, 0x3d86b3, 0.98)
      .setOrigin(0, 0.5).setDepth(64);
    this.progressText = scene.add.text(665, 83, "", { ...textStyle, fontSize: "15px" })
      .setOrigin(0.5).setDepth(64);
    this.infoText = scene.add.text(145, 280, options.info, {
      ...textStyle,
      fontSize: "18px",
      wordWrap: { width: 185 },
      lineSpacing: 8,
    }).setOrigin(0.5).setDepth(64);
    this.hintText = scene.add.text(600, 632, options.hint, {
      ...textStyle,
      fontSize: "18px",
      wordWrap: { width: 580 },
    }).setOrigin(0.5).setDepth(64);
    const readableWorldStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      ...textStyle,
      align: "left",
      fontSize: "17px",
      color: "#f3ead4",
      stroke: "#14201d",
      strokeThickness: 4,
      shadow: { color: "#0d1513", blur: 4, fill: true, offsetX: 0, offsetY: 2 },
    };
    const identityText = scene.add.text(38, 430, options.identity ?? "", {
      ...readableWorldStyle,
      lineSpacing: 7,
    }).setOrigin(0, 0).setDepth(64);
    const cultivationText = scene.add.text(38, 486, options.cultivation ?? "", readableWorldStyle)
      .setOrigin(0, 0).setDepth(64);

    const objects: Phaser.GameObjects.GameObject[] = [
      top, info, hint, backIcon, hourglass, pauseIcon,
      backZone, pauseZone, backText, pauseText, timeLabel, titleText,
      this.timeText, progressTrack, this.progressFill, this.progressText,
      this.infoText, this.hintText, identityText, cultivationText,
    ];
    if (options.rightLabel) {
      const backing = scene.add.image(1080, 315, "cultivation-hud-right-ink").setDisplaySize(190, 255).setDepth(60);
      this.rightLabel = scene.add.text(1080, 270, options.rightLabel, {
        ...textStyle, color: "#eee6d2", fontSize: "25px",
      }).setOrigin(0.5).setDepth(64);
      this.rightValue = scene.add.text(1080, 342, options.rightValue ?? "0", {
        ...textStyle, color: "#e5c475", fontSize: "62px",
      }).setOrigin(0.5).setDepth(64);
      objects.push(backing, this.rightLabel, this.rightValue);
    }
    parent.add(objects);

    const press = (target: Phaser.GameObjects.Image, callback: () => void) => {
      target.setAlpha(0.72);
      scene.time.delayedCall(90, () => {
        if (target.active) target.setAlpha(1);
        callback();
      });
    };
    backZone.on("pointerup", () => press(backIcon, () => this.openReturnConfirm(scene, parent, options, textStyle)));
    pauseZone.on("pointerup", () => press(pauseIcon, options.onPause));
    this.setProgress(options.progressCurrent ?? 0, options.progressGoal ?? 0);
  }

  setTime(seconds: number) {
    this.timeText.setText(this.formatTime(seconds));
  }

  setProgress(current: number, goal: number) {
    const safeGoal = Math.max(0, Math.floor(goal));
    const safeCurrent = Math.max(0, Math.floor(current));
    const ratio = safeGoal > 0 ? Phaser.Math.Clamp(safeCurrent / safeGoal, 0, 1) : 0;
    this.progressFill.width = 270 * ratio;
    const excess = Math.max(0, safeCurrent - safeGoal);
    this.progressText.setText(safeGoal > 0
      ? `${safeCurrent} / ${safeGoal}${excess > 0 ? `　超額 +${excess}` : ""}`
      : "");
  }

  setInfo(value: string) {
    this.infoText.setText(value);
  }

  setHint(value: string, alpha = 1) {
    this.hintText.setText(value).setAlpha(alpha);
  }

  setRightMetric(label: string, value: string | number) {
    this.rightLabel?.setText(label);
    this.rightValue?.setText(String(value));
  }

  private openReturnConfirm(
    scene: Phaser.Scene,
    parent: Phaser.GameObjects.Container,
    options: CultivationGameHUDOptions,
    textStyle: Phaser.Types.GameObjects.Text.TextStyle,
  ) {
    options.onReturnPause?.();
    scene.tweens.pauseAll();
    scene.anims.pauseAll();
    const confirm = scene.add.container(0, 0).setDepth(100);
    const shade = scene.add.rectangle(600, 337.5, 1200, 675, 0x0c1412, 0.66).setInteractive();
    const paper = scene.add.image(600, 337, "cultivation-hud-info").setDisplaySize(460, 250);
    const question = scene.add.text(600, 292, "是否取消修練", {
      ...textStyle, fontSize: "27px",
    }).setOrigin(0.5);
    const yes = scene.add.text(520, 390, "是", { ...textStyle, fontSize: "22px" })
      .setOrigin(0.5).setInteractive({ useHandCursor: true });
    const no = scene.add.text(680, 390, "否", { ...textStyle, fontSize: "22px" })
      .setOrigin(0.5).setInteractive({ useHandCursor: true });
    const resumeVisuals = () => {
      scene.tweens.resumeAll();
      scene.anims.resumeAll();
    };
    yes.on("pointerup", () => {
      confirm.destroy(true);
      resumeVisuals();
      options.onReturn();
    });
    no.on("pointerup", () => {
      confirm.destroy(true);
      resumeVisuals();
      options.onReturnResume?.();
    });
    confirm.add([shade, paper, question, yes, no]);
    parent.add(confirm);
  }

  private formatTime(seconds: number) {
    const safe = Math.max(0, Math.ceil(seconds));
    const minutes = Math.floor(safe / 60).toString().padStart(2, "0");
    const remainder = (safe % 60).toString().padStart(2, "0");
    return `${minutes}:${remainder}`;
  }
}
