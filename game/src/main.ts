import Phaser from "phaser";
import "./style.css";
import { OpeningScene } from "./scenes/OpeningScene";

new Phaser.Game({
  type: Phaser.AUTO,
  parent: "game",
  width: 1200,
  height: 675,
  backgroundColor: "#e7eee9",
  scene: [OpeningScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  render: {
    antialias: true,
    pixelArt: false,
  },
  dom: {
    createContainer: true,
  },
});
