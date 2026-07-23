import Phaser from "phaser";
import "./style.css";
import { OpeningScene } from "./scenes/OpeningScene";

const preventBrowserAssetActions = (event: Event) => event.preventDefault();
document.addEventListener("contextmenu", preventBrowserAssetActions, { capture: true });
document.addEventListener("dragstart", preventBrowserAssetActions, { capture: true });

if (import.meta.env.PROD) {
  window.addEventListener("keydown", (event) => {
    const key = event.key.toLowerCase();
    const blockedShortcut = event.key === "F12"
      || (event.ctrlKey && event.shiftKey && ["i", "j", "c"].includes(key))
      || (event.ctrlKey && key === "u");
    if (blockedShortcut) event.preventDefault();
  }, { capture: true });
}

new Phaser.Game({
  type: Phaser.AUTO,
  parent: "game",
  width: 1920,
  height: 1080,
  disableContextMenu: true,
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
