import Phaser from "phaser";

export interface CultivationResultRow {
  label: string;
  value: string | number;
  accent?: boolean;
}

export interface CultivationResultOptions {
  title?: string;
  rows: readonly CultivationResultRow[];
  cultivation: number;
  primaryLabel: string;
  secondaryLabel: string;
  onPrimary: () => void;
  onSecondary: () => void;
  primaryDisabled?: boolean;
  primaryDisabledMessage?: string;
}

export class CultivationResultPanel {
  constructor(
    scene: Phaser.Scene,
    parent: Phaser.GameObjects.Container,
    options: CultivationResultOptions,
  ) {
    const backing = scene.add.image(600, 342, "shared-result-panel").setDisplaySize(820, 510).setDepth(70);
    const title = scene.add.text(600, 150, options.title ?? "修行完成", {
      fontFamily: '"Noto Serif TC", "Microsoft JhengHei", serif',
      fontSize: "40px",
      color: "#30342f",
    }).setOrigin(0.5).setDepth(72);
    const objects: Phaser.GameObjects.GameObject[] = [backing, title];
    options.rows.slice(0, 7).forEach((row, index) => {
      const y = 205 + index * 36;
      const label = scene.add.text(430, y, row.label, {
        fontFamily: '"Noto Serif TC", "Microsoft JhengHei", serif',
        fontSize: "20px",
        color: row.accent ? "#8b6a28" : "#313a35",
      }).setOrigin(0, 0.5).setDepth(72);
      const value = scene.add.text(770, y, String(row.value), {
        fontFamily: '"Noto Serif TC", "Microsoft JhengHei", serif',
        fontSize: "21px",
        color: row.accent ? "#8b6a28" : "#313a35",
        align: "right",
        fixedWidth: 150,
      }).setOrigin(1, 0.5).setDepth(72);
      value.setStyle({ fontVariantNumeric: "tabular-nums" } as Phaser.Types.GameObjects.Text.TextStyle);
      objects.push(label, value);
    });
    const reward = scene.add.text(600, 456, `獲得修為　+${options.cultivation}`, {
      fontFamily: '"Noto Serif TC", "Microsoft JhengHei", serif',
      fontSize: "27px",
      color: "#8b6a28",
    }).setOrigin(0.5).setDepth(72);
    objects.push(reward);

    const notice = scene.add.text(600, 492, "", {
      fontFamily: '"Noto Serif TC", "Microsoft JhengHei", serif',
      fontSize: "17px",
      color: "#725f42",
    }).setOrigin(0.5).setDepth(73).setAlpha(0);
    objects.push(notice);
    const makeButton = (x: number, label: string, callback: () => void, disabled = false) => {
      const paper = scene.add.rectangle(x, 535, 210, 58, 0xeee7d8, 0.96)
        .setStrokeStyle(1, 0x75654f, 0.62).setDepth(72);
      const text = scene.add.text(x, 535, label, {
        fontFamily: '"Noto Serif TC", "Microsoft JhengHei", serif',
        fontSize: "20px",
        color: "#27322d",
      }).setOrigin(0.5).setDepth(73);
      const zone = scene.add.zone(x, 535, 210, 58).setInteractive({ useHandCursor: true }).setDepth(74);
      if (disabled) {
        paper.setAlpha(0.48);
        text.setAlpha(0.55);
      }
      zone.on("pointerdown", () => paper.setAlpha(0.72));
      zone.on("pointerup", () => {
        paper.setAlpha(disabled ? 0.48 : 1);
        if (!disabled) {
          callback();
          return;
        }
        notice.setText(options.primaryDisabledMessage ?? "當前修為已達境界圓滿，請先突破境界。").setAlpha(1);
        scene.tweens.add({ targets: notice, alpha: 0, delay: 1800, duration: 380 });
      });
      objects.push(paper, text, zone);
    };
    makeButton(475, options.primaryLabel, options.onPrimary, options.primaryDisabled);
    makeButton(725, options.secondaryLabel, options.onSecondary);
    parent.add(objects);
  }
}
