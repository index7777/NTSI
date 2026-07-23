import Phaser from "phaser";
import {
  ATTRIBUTE_LABELS,
  ATTRIBUTES,
  INITIAL_ATTRIBUTE_RANGE,
  REALMS,
  ROOT_MULTIPLIERS,
  GROWTH_QUALITY_POOLS,
  componentCapAtLevel,
  effectiveGrowth,
  effectiveBreakthroughScore,
  insightRating,
  qiComponentCapAtLevel,
  scoreBand,
  type Attribute,
} from "../config/balance";
import { BambooGameController } from "../minigames/bamboo/BambooGameController";
import { BAMBOO_GAME_CONFIG, type BambooJudgement } from "../minigames/bamboo/config";
import { HeartManualGameController } from "../minigames/heart-manual/HeartManualGameController";
import { HEART_MANUAL_CONFIG } from "../minigames/heart-manual/config";
import type { RhythmJudgement } from "../minigames/shared/RhythmTimingController";
import { WaterCarryGameController } from "../minigames/water-carry/WaterCarryGameController";
import { WATER_CARRY_CONFIG, type BalanceZone } from "../minigames/water-carry/config";

type Gender = "male" | "female";
type RootId = keyof typeof ROOT_MULTIPLIERS;

interface PlayerState {
  gender: Gender;
  name: string;
  root: RootId;
  attributes: Record<Attribute, number>;
  cultivation: number;
  identity: "雜役弟子" | "外門弟子";
  realm: "uninitiated" | "qi" | "foundation";
  level: number;
  initialAttributes: Record<Attribute, number>;
  foundationComponent: Record<Attribute, number>;
  foundationPills: number;
  metLiuRuyan: boolean;
  breathingTutorialComplete: boolean;
  foundationLessonSeen: boolean;
  sectDay: number;
  timeSlot: number;
  activityStats: Record<string, { count: number; cultivation: number }>;
  totalTrainingCount: number;
  tribulationCount: number;
  breakthroughCount: number;
  realmFallCount: number;
  realmFallLevels: number;
  playSeconds: number;
}

interface SaveData {
  version: 1;
  player: PlayerState;
}

const ROOT_LABELS: Record<RootId, string> = {
  mixed: "雜靈根",
  triple: "三靈根",
  dual: "雙靈根",
  single: "單靈根",
};

const ROOT_REVELATIONS: Record<RootId, string> = {
  single: "一脈通天，靈機純澈。此身若不負道，仙途可期。",
  dual: "二氣相生，陰陽互濟。守心勤修，自可行遠。",
  triple: "三脈並立，靈機交錯。調和諸氣，亦能問道長生。",
  mixed: "諸靈混雜，道途多艱。然天門未閉，大道未絕。",
};

const COLORS = {
  ink: 0x18312f,
  jade: 0x5f9287,
  pale: 0xf4f1e7,
  mist: 0xc8ddd6,
  gold: 0xd6b866,
  lilac: 0x9d8bb4,
};

const SAVE_KEY = "ntsi.save.v1";
const LANDSCAPE_VIEW_SCALE = 1920 / 1200;
const LEGACY_VIEW_SCALE = 1080 / 960;
const LEGACY_VIEW_X = (1920 - 540 * LEGACY_VIEW_SCALE) / 2;

export class OpeningScene extends Phaser.Scene {
  private layer!: Phaser.GameObjects.Container;
  private dailyMusicStarted = false;
  private dailyMusicIndex = 0;
  private readonly dailyMusicKeys = ["daily-music-1", "daily-music-2", "daily-music-3"];
  private currentBgm?: Phaser.Sound.BaseSound;
  private readonly fadeTimers = new Map<Phaser.Sound.BaseSound, number>();
  private musicMode: "none" | "menu" | "game-start" | "daily" = "none";
  private playtimeCheckpoint = Date.now();
  private systemOverlay?: Phaser.GameObjects.Container;
  private titleSettingsOverlay?: Phaser.GameObjects.Container;
  private player: PlayerState = {
    gender: "male",
    name: "無名",
    root: "mixed",
    attributes: { spirit: 0, bone: 0, body: 0, sense: 0 },
    cultivation: 0,
    identity: "雜役弟子",
    realm: "uninitiated",
    level: 0,
    initialAttributes: { spirit: 0, bone: 0, body: 0, sense: 0 },
    foundationComponent: { spirit: 0, bone: 0, body: 0, sense: 0 },
    foundationPills: 0,
    metLiuRuyan: false,
    breathingTutorialComplete: false,
    foundationLessonSeen: false,
    sectDay: 1,
    timeSlot: 0,
    activityStats: {},
    totalTrainingCount: 0,
    tribulationCount: 0,
    breakthroughCount: 0,
    realmFallCount: 0,
    realmFallLevels: 0,
    playSeconds: 0,
  };

  constructor() {
    super("opening");
  }

  preload() {
    this.load.image("game-title", "assets/title/background-v3.png");
    this.load.image("game-title-landscape", "assets/title/background-landscape-morning-v1.png");
    this.load.image("game-logo", "assets/title/logo-v1.png");
    this.load.image("title-traveler", "assets/title/traveler-v1.png");
    this.load.image("question-stone-scene", "assets/scenes/question-stone-dormant-v1.png");
    this.load.image("question-stone-landscape-bg", "assets/scenes/question-stone-registration-square-landscape-v1.png");
    this.load.image("question-stone-inscription", "assets/vfx/question-stone-inscription-exact-v1.png");
    this.load.image("bamboo-minigame-bg", "assets/scenes/bamboo-minigame-morning-v1.png");
    this.load.image("heart-manual-bg", "assets/scenes/heart-manual-room-landscape-v1.png");
    this.load.image("player-bamboo-male", "assets/characters/player-male-v2.png");
    this.load.image("player-bamboo-female", "assets/characters/player-female-v3.png");
    this.load.image("character-selection-bg", "assets/scenes/character-selection-presect-registration-morning-v1.png");
    this.load.image("question-stone-neutral", "assets/scenes/question-stone-isolated-neutral-v2.png");
    this.load.image("question-stone-hand", "assets/ui/question-stone/hand-contact-base-v1.png");
    this.load.image("sect-courtyard", "assets/scenes/sect-courtyard-v1.png");
    this.load.image("foundation-cave", "assets/scenes/foundation-cave-v1.png");
    this.load.image("chore-office-story-card", "assets/scenes/chore-office-story-card-v1.png");
    this.load.image("sect-elder", "assets/characters/sect-elder-v1.png");
    this.load.image("outer-sect-steward", "assets/characters/outer-sect-steward-v1.png");
    this.load.image("title-mist-1", "assets/vfx/kenney-particle-pack/mist-01.png");
    this.load.image("title-mist-2", "assets/vfx/kenney-particle-pack/mist-02.png");
    this.load.image("title-icon-mechanism", "assets/ui/title/mechanism-ink-clean-v3.png");
    this.load.image("title-icon-question-stone", "assets/ui/title/question-stone-ink-clean-v3.png");
    this.load.image("title-icon-identity-jade", "assets/ui/title/identity-jade-slip-ink-clean-v4.png");
    this.load.image("hud-icon-backpack", "assets/ui/hud/backpack-ink-v2.png");
    this.load.image("title-primary-button-paper", "assets/ui/title/primary-button-paper-v1.png");
    this.load.image("title-settings-panel", "assets/ui/title/settings-panel-simple-v2.png");
    this.load.audio("daily-music-1", "assets/audio/music/daily-01.mp3");
    this.load.audio("daily-music-2", "assets/audio/music/daily-02.mp3");
    this.load.audio("daily-music-3", "assets/audio/music/daily-03.mp3");
    this.load.audio("menu-music", "assets/audio/music/menu.mp3");
    this.load.audio("game-start-music", "assets/audio/music/game-start.mp3");
  }

  create() {
    this.cameras.main.setBackgroundColor("#e7eee9");
    // Keep the legacy 540×960 screens fully playable while each screen is rebuilt
    // for the native 1200×675 landscape layout. Container transforms also carry
    // interactive hit areas, so title buttons no longer sit below the canvas.
    this.layer = this.add.container(LEGACY_VIEW_X, 0).setScale(LEGACY_VIEW_SCALE);
    this.input.once("pointerdown", () => this.startLoopingMusic("menu-music", "menu"));
    this.input.keyboard?.once("keydown", () => this.startLoopingMusic("menu-music", "menu"));
    this.input.keyboard?.on("keydown-ESC", () => this.toggleSystemMenu());
    const testScreen = import.meta.env.DEV ? new URLSearchParams(window.location.search).get("test") : null;
    if (testScreen === "bamboo") {
      this.playBambooTask();
      return;
    }
    if (testScreen === "heart-manual") {
      this.playMantraTask();
      return;
    }
    if (testScreen === "water-carry") {
      this.playWaterTask();
      return;
    }
    this.showTitle();
  }

  private fadeTrack(track: Phaser.Sound.BaseSound, from: number, to: number, duration: number, onComplete?: () => void) {
    const existingTimer = this.fadeTimers.get(track);
    if (existingTimer !== undefined) window.clearInterval(existingTimer);
    const adjustableTrack = track as Phaser.Sound.BaseSound & { volume: number; setVolume: (value: number) => void };
    adjustableTrack.setVolume(from);
    const startedAt = performance.now();
    const timer = window.setInterval(() => {
      const progress = Math.min(1, (performance.now() - startedAt) / duration);
      adjustableTrack.setVolume(Phaser.Math.Linear(from, to, progress));
      if (progress >= 1) {
        window.clearInterval(timer);
        this.fadeTimers.delete(track);
        onComplete?.();
      }
    }, 50);
    this.fadeTimers.set(track, timer);
  }

  private stopCurrentMusic() {
    const previous = this.currentBgm;
    if (!previous) return;
    this.currentBgm = undefined;
    const previousVolume = (previous as Phaser.Sound.BaseSound & { volume: number }).volume;
    this.fadeTrack(previous, previousVolume, 0, 650, () => {
      previous.stop();
      previous.destroy();
    });
  }

  private startLoopingMusic(key: string, mode: "menu" | "game-start") {
    if (this.musicMode === mode) return;
    this.stopCurrentMusic();
    this.musicMode = mode;
    this.dailyMusicStarted = false;
    const track = this.sound.add(key, { loop: true, volume: 0 });
    this.currentBgm = track;
    track.play();
    this.fadeTrack(track, 0, 0.38, 2400);
  }

  private startDailyMusic() {
    if (this.dailyMusicStarted && this.musicMode === "daily") return;
    this.stopCurrentMusic();
    this.musicMode = "daily";
    this.dailyMusicStarted = true;
    let isInitialPlayback = true;
    const playNext = () => {
      const fadeIn = isInitialPlayback;
      isInitialPlayback = false;
      const key = this.dailyMusicKeys[this.dailyMusicIndex];
      this.dailyMusicIndex = (this.dailyMusicIndex + 1) % this.dailyMusicKeys.length;
      const track = this.sound.add(key, { volume: fadeIn ? 0 : 0.38 });
      this.currentBgm = track;
      track.once(Phaser.Sound.Events.COMPLETE, () => {
        if (this.musicMode !== "daily") return;
        this.currentBgm = undefined;
        track.destroy();
        playNext();
      });
      track.play();
      if (fadeIn) {
        this.fadeTrack(track, 0, 0.38, 2800);
      }
    };
    playNext();
  }

  private reset() {
    this.tweens.killAll();
    this.time.removeAllEvents();
    this.layer.removeAll(true);
    this.titleSettingsOverlay = undefined;
    this.layer.setPosition(LEGACY_VIEW_X, 0).setScale(LEGACY_VIEW_SCALE);
    this.drawBackdrop();
  }

  private resetLandscape() {
    this.reset();
    this.layer.removeAll(true);
    this.layer.setPosition(0, 0).setScale(LANDSCAPE_VIEW_SCALE);
  }

  private drawBackdrop() {
    const g = this.add.graphics();
    if (this.textures.exists("sect-courtyard")) {
      const image = this.add.image(270, 480, "sect-courtyard");
      const scale = Math.max(540 / image.width, 960 / image.height);
      image.setScale(scale).setAlpha(0.82);
      this.layer.add(image);
      g.fillStyle(COLORS.pale, 0.12).fillRect(0, 0, 540, 960);
    } else {
      g.fillStyle(COLORS.pale, 1).fillRect(0, 0, 540, 960);
      g.fillStyle(COLORS.mist, 0.42);
      g.fillTriangle(0, 430, 155, 180, 320, 430);
      g.fillTriangle(190, 430, 390, 135, 540, 430);
      g.fillStyle(0xffffff, 0.68).fillEllipse(270, 445, 700, 180);
    }
    this.layer.add(g);
  }

  private text(x: number, y: number, value: string, size = 28, color = "#18312f") {
    const object = this.add.text(x, y, value, {
      fontFamily: '"Noto Serif TC", "Microsoft JhengHei", serif',
      fontSize: `${size}px`,
      color,
      align: "center",
      wordWrap: { width: 470 },
      lineSpacing: 8,
    }).setOrigin(0.5);
    this.layer.add(object);
    return object;
  }

  private button(x: number, y: number, label: string, action: () => void, width = 330) {
    const background = this.add.graphics();
    background.fillStyle(0xf4efe2, 0.94).fillRoundedRect(x - width / 2, y - 36, width, 72, 14);
    background.lineStyle(2, COLORS.ink, 0.72).strokeRoundedRect(x - width / 2, y - 36, width, 72, 14);
    background.fillStyle(COLORS.gold, 0.78).fillCircle(x - width / 2 + 18, y, 4).fillCircle(x + width / 2 - 18, y, 4);
    const hitArea = this.add.zone(x, y, width, 72).setInteractive({ useHandCursor: true });
    const caption = this.text(x, y, label, 25, "#f8f3df");
    caption.setColor("#18312f");
    hitArea.on("pointerdown", () => background.setAlpha(0.7));
    hitArea.on("pointerup", () => {
      background.setAlpha(1);
      action();
    });
    this.layer.addAt(background, Math.max(0, this.layer.getIndex(caption) - 1));
    this.layer.add(hitArea);
    return hitArea;
  }

  private toggleSystemMenu() {
    if (this.systemOverlay) {
      this.systemOverlay.destroy(true);
      this.systemOverlay = undefined;
      this.time.paused = false;
      this.tweens.resumeAll();
      return;
    }
    this.time.paused = true;
    this.tweens.pauseAll();
    const overlay = this.add.container(LEGACY_VIEW_X, 0).setScale(LEGACY_VIEW_SCALE).setDepth(1000);
    this.systemOverlay = overlay;
    const blocker = this.add.rectangle(270, 480, 540, 960, 0x0b1715, 0.82).setInteractive();
    const panel = this.add.graphics();
    panel.fillStyle(0xf3eee1, 0.98).fillRoundedRect(70, 115, 400, 730, 22);
    panel.lineStyle(3, COLORS.jade, 0.72).strokeRoundedRect(70, 115, 400, 730, 22);
    const title = this.add.text(270, 165, "遊戲選單", { fontFamily: '"Noto Serif TC", "Microsoft JhengHei", serif', fontSize: "34px", color: "#18312f" }).setOrigin(0.5);
    overlay.add([blocker, panel, title]);
    const modalButton = (y: number, label: string, action: () => void) => {
      const paper = this.add.graphics();
      paper.fillStyle(0xe9e4d7, 0.96).fillRoundedRect(120, y - 31, 300, 62, 12);
      paper.lineStyle(2, COLORS.ink, 0.55).strokeRoundedRect(120, y - 31, 300, 62, 12);
      const caption = this.add.text(270, y, label, { fontFamily: '"Noto Serif TC", "Microsoft JhengHei", serif', fontSize: "23px", color: "#18312f" }).setOrigin(0.5);
      const zone = this.add.zone(270, y, 300, 62).setInteractive({ useHandCursor: true });
      zone.on("pointerup", action);
      overlay.add([paper, caption, zone]);
    };
    modalButton(250, "繼續遊戲", () => this.toggleSystemMenu());
    modalButton(335, "修行紀錄", () => { this.toggleSystemMenu(); this.showActivityHistory(); });
    modalButton(420, "設定", () => { this.toggleSystemMenu(); this.showSettingsScreen(); });
    modalButton(505, "離開遊戲", () => {
      this.toggleSystemMenu();
      this.saveGame();
      window.close();
      this.time.delayedCall(120, () => this.showTitle());
    });
    const hint = this.add.text(270, 775, "ESC 返回", { fontFamily: '"Microsoft JhengHei", sans-serif', fontSize: "18px", color: "#607d77" }).setOrigin(0.5);
    overlay.add(hint);
  }

  private showTitle() {
    this.reset();
    this.layer.removeAll(true);
    this.layer.setPosition(0, 0).setScale(LANDSCAPE_VIEW_SCALE);
    const titleArt = this.add.image(600, 337.5, "game-title-landscape");
    titleArt.setScale(Math.max(1200 / titleArt.width, 675 / titleArt.height));
    this.layer.add(titleArt);
    const shade = this.add.graphics();
    shade.fillGradientStyle(0xf8f3e8, 0xf8f3e8, 0xf8f3e8, 0xf8f3e8, 0.28, 0.07, 0, 0)
      .fillRect(0, 0, 1200, 360);
    shade.fillGradientStyle(0x102321, 0x102321, 0x102321, 0x102321, 0, 0.5, 0, 0.5)
      .fillRect(650, 0, 550, 675);
    this.layer.add(shade);
    this.animateTitleEnvironment();
    const save = this.readSave();
    if (!save) {
      const traveler = this.add.image(430, 478, "title-traveler");
      traveler.setScale(420 / traveler.height);
      this.layer.add(traveler);
    }
    const logo = this.add.image(280, 132, "game-logo").setDisplaySize(387, 259);
    this.layer.add(logo);
    this.animateTitleLogo();
    const buttonX = 940;
    const buttonY = 465;
    if (save) {
      this.titlePrimaryButton(buttonX, buttonY - 40, "繼續修行", () => {
        this.player = save.player;
        this.startDailyMusic();
        this.resumeFromSave();
      });
      this.titlePrimaryButton(buttonX, buttonY + 40, "踏入仙途", () => this.startNewGame());
    } else {
      this.titlePrimaryButton(buttonX, buttonY, "踏入仙途", () => this.startNewGame());
    }
    this.titleFeatureButton(920, 110, "title-icon-mechanism", "機關", () => this.toggleTitleSettings());
    this.titleFeatureButton(1020, 110, "title-icon-question-stone", "問仙石", () => this.showTitleNotice("尚未開放"));
    this.titleFeatureButton(1120, 110, "title-icon-identity-jade", "身份玉簡", () => {
      if (!save) return this.showTitleNotice("尚無修行紀錄");
      this.player = save.player;
      this.showActivityHistory();
    });
  }

  private titleFeatureButton(x: number, y: number, iconKey: string, label: string, action: () => void) {
    const icon = this.add.image(x, y - 35, iconKey).setDisplaySize(100, 100);
    const iconScale = icon.scaleX;
    const caption = this.add.text(x, y + 23, label, {
      fontFamily: '"Noto Serif TC", "Microsoft JhengHei", serif',
      fontSize: "17px",
      color: "#171916",
    }).setOrigin(0.5);
    const hitArea = this.add.zone(x, y + 2, 108, 112).setInteractive({ useHandCursor: true });
    hitArea.on("pointerover", () => { icon.setScale(iconScale * 1.04); caption.setAlpha(0.72); });
    hitArea.on("pointerout", () => { icon.setScale(iconScale); caption.setAlpha(1); });
    hitArea.on("pointerdown", () => { icon.setScale(iconScale * 0.97); caption.setAlpha(0.58); });
    hitArea.on("pointerup", () => { icon.setScale(iconScale * 1.04); caption.setAlpha(0.72); action(); });
    this.layer.add([icon, caption, hitArea]);
  }

  private titlePrimaryButton(x: number, y: number, label: string, action: () => void) {
    const source = label === "繼續修行"
      ? "assets/ui/title/title-text-continue-cultivation-white-v1.png"
      : "assets/ui/title/title-text-begin-journey-white-v1.png";
    const control = this.add.dom(x - 44, y).createFromHTML(`
      <button class="title-primary-action" type="button" aria-label="${label}">
        <img src="${source}" alt="${label}" draggable="false" />
      </button>
    `);
    control.addListener("click");
    control.on("click", action);
    this.layer.add(control);
  }

  private showTitleNotice(message: string) {
    const paper = this.add.graphics().setDepth(950);
    paper.fillStyle(0xded5c2, 0.9).fillRoundedRect(910, 172, 220, 40, 8);
    paper.lineStyle(1, 0x75644c, 0.58).strokeRoundedRect(910, 172, 220, 40, 8);
    const label = this.add.text(1020, 192, message, {
      fontFamily: '"Noto Serif TC", "Microsoft JhengHei", serif',
      fontSize: "16px",
      color: "#2f342f",
    }).setOrigin(0.5).setDepth(951);
    this.layer.add([paper, label]);
    this.tweens.add({ targets: [paper, label], alpha: 0, duration: 300, delay: 1050, onComplete: () => {
      paper.destroy();
      label.destroy();
    }});
  }

  private toggleTitleSettings() {
    if (this.titleSettingsOverlay) {
      this.titleSettingsOverlay.destroy(true);
      this.titleSettingsOverlay = undefined;
      return;
    }
    const overlay = this.add.container(0, 0).setDepth(1000);
    this.titleSettingsOverlay = overlay;
    this.layer.add(overlay);
    const blocker = this.add.rectangle(600, 337.5, 1200, 675, 0x101b19, 0.46).setInteractive();
    const panel = this.add.image(600, 325, "title-settings-panel").setDisplaySize(430, 420);
    const title = this.add.text(600, 215, "機關", {
      fontFamily: '"Noto Serif TC", "Microsoft JhengHei", serif', fontSize: "30px", color: "#28332f",
    }).setOrigin(0.5);
    const titleDivider = this.add.graphics();
    titleDivider.lineStyle(1, 0x75654f, 0.54).lineBetween(490, 242, 710, 242);
    overlay.add([blocker, panel, title, titleDivider]);
    const modalButton = (y: number, label: () => string, action: () => void) => {
      const caption = this.add.text(600, y, label(), {
        fontFamily: '"Noto Serif TC", "Microsoft JhengHei", serif', fontSize: "20px", color: "#29332f",
      }).setOrigin(0.5);
      const zone = this.add.zone(600, y, 270, 52).setInteractive({ useHandCursor: true });
      zone.on("pointerdown", () => caption.setAlpha(0.58));
      zone.on("pointerup", () => { caption.setAlpha(1); action(); if (caption.active) caption.setText(label()); });
      overlay.add([caption, zone]);
    };
    modalButton(280, () => `音樂：${this.sound.mute ? "關閉" : "開啟"}`, () => { this.sound.mute = !this.sound.mute; });
    modalButton(345, () => `畫面：${this.scale.isFullscreen ? "全螢幕" : "視窗化"}`, () => {
      if (this.scale.isFullscreen) this.scale.stopFullscreen(); else this.scale.startFullscreen();
    });
    modalButton(410, () => "關閉", () => this.toggleTitleSettings());
    const settingsToggleZone = this.add.zone(920, 110, 108, 90).setInteractive({ useHandCursor: true });
    settingsToggleZone.on("pointerup", () => this.toggleTitleSettings());
    overlay.add(settingsToggleZone);
  }

  private animateTitleEnvironment() {
    const mistLayers = [
      { key: "title-mist-1", x: 74, y: 466, scale: 0.14, angle: -18, duration: 5200, delay: 0 },
      { key: "title-mist-2", x: 118, y: 472, scale: 0.11, angle: 22, duration: 6100, delay: 900 },
      { key: "title-mist-1", x: 102, y: 452, scale: 0.09, angle: 45, duration: 4700, delay: 1750 },
      { key: "title-mist-2", x: 86, y: 481, scale: 0.08, angle: -42, duration: 6800, delay: 2500 },
    ];
    mistLayers.forEach((config, index) => {
      const vapor = this.add.image(config.x, config.y, config.key)
        .setScale(config.scale)
        .setAngle(config.angle)
        .setTint(0xdbe9e5)
        .setAlpha(0.09 + index * 0.012)
        .setBlendMode(Phaser.BlendModes.SCREEN);
      this.layer.add(vapor);
      this.tweens.add({
        targets: vapor,
        x: config.x + (index % 2 === 0 ? 38 : -34),
        y: config.y - 18 - index * 3,
        scaleX: config.scale * 1.65,
        scaleY: config.scale * 1.25,
        angle: config.angle + (index % 2 === 0 ? 12 : -10),
        alpha: 0,
        duration: config.duration,
        delay: config.delay,
        repeat: -1,
        ease: "Sine.out",
      });
    });

  }

  private animateTitleLogo() {
    // The jade pass is clipped to the cloud-rune band under 問仙.
    const cloudLight = this.add.image(278, 137, "game-logo")
      .setDisplaySize(392, 262)
      .setTint(0xa8e2d2)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0.06);
    const cloudMaskShape = this.add.rectangle(278, 205, 356, 67, 0xffffff, 1).setVisible(false);
    cloudLight.setMask(cloudMaskShape.createGeometryMask());
    this.layer.add([cloudLight, cloudMaskShape]);
    this.tweens.add({
      targets: cloudLight,
      alpha: { from: 0.03, to: 0.16 },
      x: { from: 274, to: 282 },
      duration: 8500,
      hold: 900,
      yoyo: true,
      repeat: -1,
      ease: "Sine.inOut",
    });

  }

  private startNewGame() {
    this.startLoopingMusic("game-start-music", "game-start");
    this.player = {
      gender: "male",
      name: "無名",
      root: "mixed",
      attributes: { spirit: 0, bone: 0, body: 0, sense: 0 },
      cultivation: 0,
      identity: "雜役弟子",
      realm: "uninitiated",
      level: 0,
      initialAttributes: { spirit: 0, bone: 0, body: 0, sense: 0 },
      foundationComponent: { spirit: 0, bone: 0, body: 0, sense: 0 },
      foundationPills: 0,
      metLiuRuyan: false,
      breathingTutorialComplete: false,
      foundationLessonSeen: false,
      sectDay: 1,
      timeSlot: 0,
      activityStats: {},
      totalTrainingCount: 0,
      tribulationCount: 0,
      breakthroughCount: 0,
      realmFallCount: 0,
      realmFallLevels: 0,
      playSeconds: 0,
    };
    this.showGenderChoice();
  }

  private resumeFromSave() {
    if (this.player.realm === "foundation") {
      this.showMainMenu();
      return;
    }
    if (this.player.realm === "qi" && this.player.level >= 1) {
      if (!this.player.breathingTutorialComplete) {
        this.showMuQingli();
        return;
      }
      this.showMainMenu();
      return;
    }
    if (this.player.cultivation >= 100) {
      this.showInsight();
      return;
    }
    if (Object.values(this.player.attributes).some((value) => value > 0)) {
      this.showActivities();
      return;
    }
    this.showStoneIntro();
  }

  private readSave(): SaveData | null {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw) as SaveData;
      if (data.version !== 1 || !data.player) return null;
      data.player.initialAttributes ??= { ...data.player.attributes };
      data.player.foundationComponent ??= { spirit: 0, bone: 0, body: 0, sense: 0 };
      data.player.foundationPills ??= 0;
      data.player.metLiuRuyan ??= false;
      data.player.breathingTutorialComplete ??= data.player.realm !== "uninitiated" && data.player.level >= 2;
      data.player.foundationLessonSeen ??= false;
      data.player.sectDay ??= 1;
      data.player.timeSlot ??= 0;
      data.player.activityStats ??= {};
      data.player.totalTrainingCount ??= Object.values(data.player.activityStats).reduce((sum, item) => sum + item.count, 0);
      data.player.tribulationCount ??= 0;
      data.player.breakthroughCount ??= 0;
      data.player.realmFallCount ??= 0;
      data.player.realmFallLevels ??= 0;
      data.player.playSeconds ??= 0;
      return data;
    } catch {
      return null;
    }
  }

  private saveGame() {
    const now = Date.now();
    this.player.playSeconds += Math.max(0, Math.floor((now - this.playtimeCheckpoint) / 1000));
    this.playtimeCheckpoint = now;
    const data: SaveData = { version: 1, player: this.player };
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  }

  private showSettingsScreen() {
    this.resetLandscape();
    this.text(600, 90, "機關", 42);
    this.button(600, 265, this.sound.mute ? "音樂：關閉" : "音樂：開啟", () => {
      this.sound.mute = !this.sound.mute;
      this.showSettingsScreen();
    }, 280);
    this.button(600, 440, "返回", () => this.showMainMenu(), 240);
  }

  private showGenderChoice() {
    this.resetLandscape();
    const scene = this.add.image(600, 337.5, "character-selection-bg").setDisplaySize(1200, 675);
    const titleShade = this.add.rectangle(600, 56, 1200, 112, 0xf2eee4, 0.18);
    const footerShade = this.add.rectangle(600, 638, 1200, 74, 0x14211f, 0.24);
    this.layer.add([scene, titleShade, footerShade]);
    this.text(600, 54, "選擇角色", 38, "#263735");
    this.characterCard(315, 378, "male");
    this.characterCard(885, 378, "female");
    this.text(600, 646, "角色性別僅影響外觀，不影響遊戲內容與成長", 17, "#f0e7d2");
  }

  private characterCard(x: number, y: number, gender: Gender) {
    const label = gender === "male" ? "男" : "女";
    const card = this.add.dom(x, y).createFromHTML(`
      <button class="character-choice-card character-choice-${gender}" type="button" aria-label="選擇${label}角色">
        <span class="character-choice-label">${label}</span>
      </button>
    `);
    card.addListener("click");
    card.on("click", () => {
      this.player.gender = gender;
      this.tweens.add({
        targets: this.layer,
        alpha: 0,
        duration: 320,
        ease: "Sine.inOut",
        onComplete: () => {
          this.showNameEntry();
          this.layer.setAlpha(0);
          this.tweens.add({ targets: this.layer, alpha: 1, duration: 320, ease: "Sine.inOut" });
        },
      });
    });
    this.layer.add(card);
  }

  private showNameEntry() {
    this.resetLandscape();
    const scene = this.add.image(600, 337.5, "character-selection-bg").setDisplaySize(1200, 675);
    const blocker = this.add.rectangle(600, 337.5, 1200, 675, 0x101b19, 0.5).setInteractive();
    const panel = this.add.image(600, 330, "title-settings-panel").setDisplaySize(500, 430);
    const instruction = this.add.text(600, 218, "此名將記入宗門名冊", {
      fontFamily: '"Noto Serif TC", "Microsoft JhengHei", serif',
      fontSize: "18px",
      color: "#60706a",
    }).setOrigin(0.5);
    this.layer.add([scene, blocker, panel, instruction]);
    const suggestedName = this.player.gender === "male" ? "沈青川" : "蘇晚晴";
    const dom = this.add.dom(600, 365).createFromHTML(`
      <div class="name-entry">
        <input aria-label="角色姓名" maxlength="8" value="${suggestedName}" autocomplete="off" />
        <div class="error" aria-live="polite"></div>
        <button class="name-entry-confirm" type="button" data-action="confirm">確認姓名</button>
        <button class="name-entry-return" type="button" data-action="return">返回選角</button>
      </div>
    `);
    this.layer.add(dom);
    dom.addListener("click");
    dom.on("click", (event: Event) => {
      const target = event.target as HTMLElement;
      if (target.tagName !== "BUTTON") return;
      if (target.dataset.action === "return") {
        this.showGenderChoice();
        return;
      }
      const input = dom.getChildByProperty("tagName", "INPUT") as HTMLInputElement | null;
      const error = dom.getChildByProperty("className", "error") as HTMLDivElement | null;
      const name = input?.value.trim() ?? "";
      if (name.length < 1 || name.length > 8) {
        if (error) error.textContent = "姓名需為1～8個字";
        return;
      }
      this.player.name = name;
      this.saveGame();
      this.showStoneIntro();
    });
  }

  private showStoneIntro() {
    this.resetLandscape();
    const scene = this.add.image(600, 337.5, "question-stone-landscape-bg").setDisplaySize(1200, 675);
    const shade = this.add.rectangle(600, 337.5, 1200, 675, 0x102321, 0.08);
    const narration = this.add.text(600, 92, "", {
      fontFamily: '"Noto Serif TC", "Microsoft JhengHei", serif',
      fontSize: "31px",
      color: "#f5edda",
      stroke: "#273a35",
      strokeThickness: 5,
      shadow: { color: "#17231f", blur: 8, fill: true, offsetX: 0, offsetY: 2 },
    }).setOrigin(0.5).setAlpha(0);
    const inscription = this.add.image(574, 307, "question-stone-inscription")
      .setDisplaySize(58, 132)
      .setTint(0xffe7ae)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0);
    this.layer.add([scene, shade, narration, inscription]);

    const stoneZone = this.add.zone(574, 326, 170, 270);
    this.layer.add(stoneZone);

    const dialogue = this.add.container(0, 0).setAlpha(0);
    const dialoguePanel = this.add.graphics();
    dialoguePanel.fillStyle(0xeee6d4, 0.94).fillRoundedRect(185, 493, 830, 150, 10);
    dialoguePanel.lineStyle(1, 0x6c5d48, 0.72).strokeRoundedRect(185, 493, 830, 150, 10);
    const elderPortrait = this.add.image(285, 568, "sect-elder");
    elderPortrait.setScale(Math.min(142 / elderPortrait.width, 170 / elderPortrait.height));
    const nameplate = this.add.text(375, 518, "宗門執事", {
      fontFamily: '"Noto Serif TC", serif', fontSize: "19px", color: "#72552f",
    });
    const instruction = this.add.text(375, 566, "將手放上去。", {
      fontFamily: '"Noto Serif TC", serif', fontSize: "27px", color: "#20312e",
    });
    dialogue.add([dialoguePanel, elderPortrait, nameplate, instruction]);
    this.layer.add(dialogue);

    stoneZone.disableInteractive();
    const lines = ["此石名曰問仙", "可照靈根", "可辨仙緣", "願入宗者，皆須一問！"];
    const playLine = (index: number) => {
      if (index >= lines.length) {
        this.tweens.add({ targets: dialogue, alpha: 1, duration: 320, onComplete: () => {
          this.time.delayedCall(1250, () => this.tweens.add({ targets: dialogue, alpha: 0, duration: 300, onComplete: () => {
            stoneZone.setInteractive({ cursor: "pointer" });
            this.tweens.add({
              targets: inscription,
              alpha: { from: 0.05, to: 0.14 },
              duration: 1200,
              yoyo: true,
              repeat: -1,
              ease: "Sine.inOut",
            });
          }}));
        }});
        return;
      }
      narration.setText(lines[index]);
      this.tweens.add({
        targets: narration,
        alpha: 1,
        y: { from: 99, to: 92 },
        duration: 620,
        hold: 1450,
        yoyo: true,
        ease: "Sine.inOut",
        onComplete: () => playLine(index + 1),
      });
    };
    this.time.delayedCall(700, () => playLine(0));

    let holdTween: Phaser.Tweens.Tween | undefined;
    let completed = false;
    const cancelHold = () => {
      if (completed) return;
      holdTween?.stop();
      holdTween = undefined;
      this.tweens.add({ targets: inscription, alpha: 0, duration: 220 });
    };
    const completeHold = () => {
      completed = true;
      stoneZone.disableInteractive();
      this.tweens.add({
        targets: inscription,
        alpha: 1,
        scaleX: 1.08,
        scaleY: 1.08,
        duration: 760,
        yoyo: true,
        hold: 260,
      });
      this.cameras.main.flash(420, 242, 229, 191, false);
      this.time.delayedCall(1350, () => this.revealAptitude());
    };
    stoneZone.on("pointerdown", () => {
      if (completed) return;
      const meter = { value: 0 };
      holdTween = this.tweens.add({ targets: meter, value: 1, duration: 1650, onUpdate: () => {
        inscription.setAlpha(0.12 + meter.value * 0.88);
        const tint = Phaser.Display.Color.Interpolate.ColorWithColor(
          new Phaser.Display.Color(171, 211, 197),
          new Phaser.Display.Color(255, 235, 178),
          100,
          Math.round(meter.value * 100),
        );
        inscription.setTint(Phaser.Display.Color.GetColor(tint.r, tint.g, tint.b));
      }, onComplete: completeHold });
    });
    stoneZone.on("pointerup", cancelHold);
    stoneZone.on("pointerout", cancelHold);
  }

  private revealAptitude() {
    this.resetLandscape();
    const roots: RootId[] = ["mixed", "triple", "triple", "dual", "dual", "single"];
    this.player.root = Phaser.Utils.Array.GetRandom(roots);
    for (const attribute of ATTRIBUTES) {
      const [min, max] = INITIAL_ATTRIBUTE_RANGE[attribute];
      this.player.attributes[attribute] = Phaser.Math.Between(min, max);
      this.player.initialAttributes[attribute] = this.player.attributes[attribute];
    }
    this.saveGame();
    const scene = this.add.image(600, 337.5, "question-stone-landscape-bg").setDisplaySize(1200, 675);
    const shade = this.add.rectangle(600, 337.5, 1200, 675, 0x102321, 0.22);
    const inscription = this.add.image(574, 307, "question-stone-inscription")
      .setDisplaySize(58, 132).setTint(0xffe7ae).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.86);
    this.layer.add([scene, shade, inscription]);
    const readableText = (x: number, y: number, value: string, size: number, color: string) => {
      const label = this.add.text(x, y, value, {
        fontFamily: '"Noto Serif TC", "Microsoft JhengHei", serif',
        fontSize: `${size}px`,
        color,
        stroke: "#1f302c",
        strokeThickness: 4,
        align: "center",
        wordWrap: { width: 820 },
        shadow: { color: "#16211e", blur: 7, fill: true, offsetX: 0, offsetY: 2 },
      }).setOrigin(0.5).setAlpha(0);
      this.layer.add(label);
      return label;
    };
    const preface = readableText(600, 105, "你的靈根逐漸顯現", 25, "#f1e8d4");
    const rootLabel = readableText(600, 155, ROOT_LABELS[this.player.root], 42, "#f0ce78");
    const revelation = readableText(600, 218, `「${ROOT_REVELATIONS[this.player.root]}」`, 21, "#eee5cf");
    const attributeLabels = ATTRIBUTES.map((attribute, index) => {
      const x = index % 2 === 0 ? 420 : 780;
      const y = 315 + Math.floor(index / 2) * 68;
      return readableText(x, y, `${ATTRIBUTE_LABELS[attribute]}  ${this.player.attributes[attribute]}`, 25, "#d9eadf");
    });
    const dialogue = this.add.container(0, 0).setAlpha(0);
    const panel = this.add.graphics();
    panel.fillStyle(0xeee6d4, 0.95).fillRoundedRect(185, 493, 830, 150, 10);
    panel.lineStyle(1, 0x6c5d48, 0.72).strokeRoundedRect(185, 493, 830, 150, 10);
    const portrait = this.add.image(285, 568, "sect-elder");
    portrait.setScale(Math.min(142 / portrait.width, 170 / portrait.height));
    const name = this.add.text(375, 518, "宗門執事", {
      fontFamily: '"Noto Serif TC", serif', fontSize: "19px", color: "#72552f",
    });
    const line = this.add.text(375, 563, "", {
      fontFamily: '"Noto Serif TC", serif', fontSize: "23px", color: "#20312e",
      wordWrap: { width: 590 },
    });
    dialogue.add([panel, portrait, name, line]);
    this.layer.add(dialogue);
    const destination = this.add.text(600, 565, "前往雜役處", {
      fontFamily: '"Noto Serif TC", "Microsoft JhengHei", serif',
      fontSize: "27px",
      color: "#f3e8ce",
      stroke: "#253733",
      strokeThickness: 4,
    }).setOrigin(0.5).setAlpha(0).setInteractive({ useHandCursor: true });
    destination.on("pointerup", () => this.showChoreOfficeSceneCard());
    this.layer.add(destination);

    this.tweens.add({
      targets: preface, alpha: 1, duration: 650, hold: 1500, yoyo: true,
      onComplete: () => this.tweens.add({
        targets: rootLabel, alpha: 1, y: { from: 166, to: 155 }, duration: 780, ease: "Sine.out",
        onComplete: () => this.time.delayedCall(700, () => this.tweens.add({
          targets: revelation, alpha: 1, duration: 1000,
          onComplete: () => {
            attributeLabels.forEach((label, index) => {
              this.tweens.add({
                targets: label, alpha: 1, y: `-=6`, duration: 500, delay: index * 260,
              });
            });
            this.time.delayedCall(1800, () => {
              this.tweens.add({ targets: [rootLabel, revelation, ...attributeLabels], alpha: 0, duration: 420 });
              this.tweens.add({ targets: dialogue, alpha: 1, duration: 520, delay: 360, onComplete: () => {
                line.setText("有靈根。先去雜役處報到。");
                this.time.delayedCall(1500, () => {
                  line.setText("想引氣入體，得先積累足夠修為，先去領功法吧！");
                  this.time.delayedCall(1900, () => this.tweens.add({
                    targets: dialogue, alpha: 0, duration: 420, onComplete: () => {
                      this.tweens.add({ targets: destination, alpha: 1, y: { from: 575, to: 565 }, duration: 620 });
                    },
                  }));
                });
              }});
            });
          },
        })),
      }),
    });
  }

  private showChoreOfficeSceneCard() {
    this.resetLandscape();
    const scene = this.add.image(600, 337.5, "chore-office-story-card");
    scene.setScale(Math.max(1200 / scene.width, 675 / scene.height));
    const shade = this.add.graphics();
    shade.fillGradientStyle(0x101916, 0x101916, 0x101916, 0x101916, 0, 0, 0.68, 0.68)
      .fillRect(0, 390, 1200, 285);
    this.layer.add([scene, shade]);
    this.text(600, 465, "雜役處", 42, "#f1e7ce");
    this.text(600, 515, "同門依序排在窗口前，等候執事分派差事。", 21, "#e6dfcf");
    this.button(600, 590, "繼續", () => this.showChoreOfficeReceipt(), 240);
  }

  private showChoreOfficeReceipt() {
    this.resetLandscape();
    const scene = this.add.image(600, 337.5, "chore-office-story-card");
    scene.setScale(Math.max(1200 / scene.width, 675 / scene.height)).setAlpha(0.72);
    const panel = this.add.graphics();
    panel.fillStyle(0xf1eadb, 0.96).fillRect(170, 430, 860, 185);
    panel.lineStyle(1, 0x75654f, 0.62).strokeRect(170, 430, 860, 185);
    panel.lineStyle(1, 0x75654f, 0.35).lineBetween(205, 482, 995, 482);
    this.layer.add([scene, panel]);
    this.text(255, 458, "雜役處執事", 20, "#72552f");
    this.text(600, 525, "執事將一本《納氣訣》推到桌前。", 24, "#2e332f");
    this.button(600, 580, "收下《納氣訣》", () => {
      this.startDailyMusic();
      this.showActivities();
    }, 280);
  }

  private showActivities() {
    this.resetLandscape();
    const targetCultivation = this.player.realm === "foundation"
      ? REALMS.foundation.cultivation[Math.min(this.player.level, 8)]
      : this.player.realm === "qi"
      ? REALMS.qi.cultivation[Math.min(this.player.level, 8)]
      : 100;
    this.text(600, 55, "修行安排", 38);
    this.text(600, 100, `入門第 ${this.player.sectDay} 日 · ${this.timeLabel()}`, 20, "#58746e");
    this.text(600, 135, `修為 ${this.player.cultivation} / ${targetCultivation}`, 22, "#54736c");
    const tasks = this.player.realm === "uninitiated"
      ? ["砍竹", "參悟心法"]
      : this.player.breathingTutorialComplete
      ? ["砍竹", "挑水", "顧藥園", "參悟心法", "吐納"]
      : ["砍竹", "參悟心法"];
    tasks.forEach((task, index) => {
      const x = tasks.length <= 2 ? 465 + index * 270 : 180 + index * 210;
      const y = 320;
      const card = this.add.rectangle(x, y, 180, 150, 0xf8f4e9, 0.95)
        .setStrokeStyle(3, COLORS.jade, 0.75)
        .setInteractive({ useHandCursor: true });
      this.layer.add(card);
      this.text(x, y, task, 28);
      card.on("pointerup", () => this.playTask(task));
    });
    if (this.player.cultivation >= targetCultivation) {
      if (this.player.realm === "uninitiated") {
        this.button(600, 550, "引氣入體", () => this.showInsight());
      } else {
        if (this.player.realm === "foundation") {
          if (this.player.level < 9) this.button(600, 550, `挑戰筑基${this.player.level + 1}層`, () => this.showFoundationLevelBreakthrough());
          else this.button(600, 550, "筑基九層圓滿", () => this.showFoundationCompleteNotice());
        } else if (this.player.level < 9) {
          this.button(600, 550, `挑戰練氣${this.player.level + 1}層`, () => this.showQiBreakthrough());
        } else {
          this.button(600, 550, "準備突破筑基", () => this.showFoundationPreparation());
        }
      }
    } else {
      this.text(600, 550, "完成修行，感應天地靈機", 20, "#66817c");
    }
    if (this.player.realm !== "uninitiated") {
      this.text(600, 625, "返回主介面", 18, "#58746e").setInteractive({ useHandCursor: true })
        .on("pointerup", () => this.showMainMenu());
    }
  }

  private playTask(task: string) {
    if (task === "吐納") return this.playBreathingTask(false);
    if (task === "挑水") return this.playWaterTask();
    if (task === "顧藥園") return this.playHerbTask();
    if (task === "參悟心法") return this.playMantraTask();
    return this.playBambooTask();
  }

  private cultivationTarget() {
    if (this.player.realm === "foundation") return REALMS.foundation.cultivation[Math.min(this.player.level, 8)];
    if (this.player.realm === "qi") return REALMS.qi.cultivation[Math.min(this.player.level, 8)];
    return 100;
  }

  private grantTaskCultivation(task: string, score: number, success = true) {
    const normalizedScore = Phaser.Math.Clamp(Math.ceil(score), 0, 100);
    const gain = Math.ceil(12 + normalizedScore * 0.36);
    const cap = this.player.realm === "qi" ? REALMS.qi.cultivation[8] : this.cultivationTarget();
    this.player.cultivation = Math.min(cap, this.player.cultivation + gain);
    this.recordActivity(task, gain);
    this.saveGame();
    this.showTaskResult(task, gain, normalizedScore, success);
  }

  private timeLabel() {
    return ["卯時（早上）", "午時（中午）", "酉時（晚上）"][this.player.timeSlot] ?? "卯時（早上）";
  }

  private recordActivity(task: string, cultivation: number) {
    const current = this.player.activityStats[task] ?? { count: 0, cultivation: 0 };
    this.player.activityStats[task] = {
      count: current.count + 1,
      cultivation: current.cultivation + cultivation,
    };
    if (this.player.timeSlot >= 2) {
      this.player.timeSlot = 0;
      this.player.sectDay += 1;
    } else {
      this.player.timeSlot += 1;
    }
  }

  private playBambooTask() {
    this.resetLandscape();
    const background = this.add.image(600, 337.5, "bamboo-minigame-bg").setDisplaySize(1200, 675);
    const atmosphere = this.add.image(600, 337.5, "title-mist-1")
      .setDisplaySize(760, 250).setAlpha(0.08).setBlendMode(Phaser.BlendModes.SCREEN);
    const character = this.add.image(755, 405, this.player.gender === "male" ? "player-bamboo-male" : "player-bamboo-female");
    character.setScale(Math.min(265 / character.width, 360 / character.height)).setOrigin(0.5, 0.72);
    const effectLayer = this.add.graphics();
    const ringLayer = this.add.graphics();
    const timeBar = this.add.graphics();
    const hudPaper = this.add.graphics();
    hudPaper.fillStyle(0xeee6d4, 0.9).fillRoundedRect(36, 198, 250, 190, 7);
    hudPaper.lineStyle(1, 0x75654f, 0.55).strokeRoundedRect(36, 198, 250, 190, 7);
    hudPaper.fillStyle(0xeee6d4, 0.9).fillRoundedRect(36, 401, 250, 102, 7);
    hudPaper.lineStyle(1, 0x75654f, 0.55).strokeRoundedRect(36, 401, 250, 102, 7);
    this.layer.add([background, atmosphere, character, effectLayer, ringLayer, timeBar, hudPaper]);
    this.tweens.add({ targets: atmosphere, x: 660, alpha: 0.13, duration: 6200, yoyo: true, repeat: -1 });

    const controller = new BambooGameController();
    const targetX = 398;
    const targetY = 470;
    const inputZone = this.add.zone(600, 337.5, 1200, 675).setInteractive({ useHandCursor: true });
    this.layer.add(inputZone);

    const timeLabel = this.text(600, 38, "時間 30", 24, "#f1ead7");
    const cultivationLabel = this.text(1025, 38, "本局修為 10", 21, "#f1ead7");
    const comboLabel = this.text(1060, 130, "連擊 0", 30, "#e8d08b");
    const progressLabel = this.text(160, 270, `砍竹\n砍十根竹子\n進度：0 / ${BAMBOO_GAME_CONFIG.goalCount}`, 22, "#2d352f");
    progressLabel.setLineSpacing(12);
    const rewardLabel = this.text(160, 450, "修為 +10\n今日剩餘 3 次修行", 19, "#35453f");
    rewardLabel.setLineSpacing(10);
    const guide = this.text(600, 625, "凝神調息，在氣與刃合一之時落斧。", 21, "#f4ead2");
    const judgementLabel = this.text(targetX, targetY - 115, "", 30, "#e9ca74").setAlpha(0);
    const countdown = this.text(600, 315, "3", 82, "#f4e8ca");

    const back = this.text(70, 48, "←\n返回", 19, "#f1e5cc").setInteractive({ useHandCursor: true });
    const pause = this.text(1085, 50, "暫停", 19, "#f1e5cc").setInteractive({ useHandCursor: true });
    const finishEarly = this.text(1070, 605, "收式", 23, "#2f3b35").setInteractive({ useHandCursor: true });
    const modal = this.add.container(0, 0).setDepth(80).setVisible(false);
    this.layer.add(modal);

    let finalized = false;
    let modalKind: "pause" | "quit" | "finish" = "pause";
    const cleanup = () => {
      this.events.off(Phaser.Scenes.Events.UPDATE, update);
      this.input.keyboard?.off("keydown-SPACE", handleInput);
    };
    const showResult = (rewardMode: "normal" | "minimum" | "proportional" = "normal") => {
      if (finalized) return;
      finalized = true;
      cleanup();
      inputZone.disableInteractive();
      const now = performance.now();
      const reward = rewardMode === "minimum"
        ? BAMBOO_GAME_CONFIG.rewardFormula.baseCultivation
        : rewardMode === "proportional"
          ? controller.earlyCultivationReward(now)
          : controller.cultivationReward();
      const cap = this.player.realm === "qi" ? REALMS.qi.cultivation[8] : this.cultivationTarget();
      this.player.cultivation = Math.min(cap, this.player.cultivation + reward);
      this.recordActivity("砍竹", reward);
      this.saveGame();
      this.showBambooTaskResult(controller, reward);
    };
    const closeModal = () => {
      modal.removeAll(true);
      modal.setVisible(false);
    };
    const openModal = (kind: "pause" | "quit" | "finish") => {
      if (finalized || controller.state === "ready") return;
      modalKind = kind;
      if (kind === "pause") controller.pause(performance.now());
      else controller.openQuitConfirm(performance.now());
      modal.removeAll(true).setVisible(true);
      const dim = this.add.rectangle(600, 337.5, 1200, 675, 0x101816, 0.64).setInteractive();
      const paper = this.add.graphics();
      paper.fillStyle(0xeee6d4, 0.97).fillRoundedRect(380, 195, 440, 285, 10);
      paper.lineStyle(1, 0x75654f, 0.72).strokeRoundedRect(380, 195, 440, 285, 10);
      const message = kind === "pause" ? "修行暫停"
        : kind === "quit" ? "確定結束本次修行？"
        : "確定提前收式？\n將按目前成果結算";
      const title = this.add.text(600, 260, message, {
        fontFamily: '"Noto Serif TC", serif', fontSize: "27px", color: "#28332f", align: "center",
      }).setOrigin(0.5);
      const primary = this.add.text(600, 355, kind === "pause" ? "繼續" : "確認", {
        fontFamily: '"Noto Serif TC", serif', fontSize: "22px", color: "#334b43",
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      const secondary = this.add.text(600, 415, kind === "pause" ? "離開" : "取消", {
        fontFamily: '"Noto Serif TC", serif', fontSize: "19px", color: "#65726d",
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      primary.on("pointerup", () => {
        if (modalKind === "pause") {
          controller.resume(performance.now());
          closeModal();
        } else if (modalKind === "quit") {
          controller.finishEarly();
          showResult("minimum");
        } else {
          controller.finishEarly();
          showResult("proportional");
        }
      });
      secondary.on("pointerup", () => {
        if (modalKind === "pause") {
          controller.finishEarly();
          showResult("minimum");
        } else {
          controller.cancelQuit(performance.now());
          closeModal();
        }
      });
      modal.add([dim, paper, title, primary, secondary]);
    };

    const displayJudgement = (judgement: BambooJudgement) => {
      judgementLabel.setText(BAMBOO_GAME_CONFIG.labels[judgement]);
      judgementLabel.setColor(judgement === "PERFECT" ? "#f0ca6a" : judgement === "MISS" ? "#d5c8b3" : "#e8dfc9");
      judgementLabel.setAlpha(1).setY(targetY - 95).setScale(judgement === "PERFECT" ? 1.12 : 1);
      this.tweens.add({ targets: judgementLabel, y: targetY - 135, alpha: 0, duration: 620, ease: "Sine.out" });
      if (judgement !== "MISS") {
        this.tweens.add({ targets: character, x: 725, angle: -2, duration: 105, yoyo: true, ease: "Quad.out" });
        effectLayer.clear().lineStyle(judgement === "PERFECT" ? 8 : 4, 0xffe09a, judgement === "PERFECT" ? 0.95 : 0.7)
          .lineBetween(targetX - 65, targetY + 20, targetX + 72, targetY - 28);
        this.time.delayedCall(130, () => effectLayer.clear());
        if (judgement === "PERFECT") this.cameras.main.shake(90, 0.0018);
      }
      if (controller.stats.combo > 0) {
        this.tweens.add({ targets: comboLabel, scale: 1.18, duration: 90, yoyo: true });
      }
      comboLabel.setText(`連擊 ${controller.stats.combo}`);
      progressLabel.setText(`砍竹\n砍十根竹子\n進度：${Math.min(controller.stats.strikes, BAMBOO_GAME_CONFIG.goalCount)} / ${BAMBOO_GAME_CONFIG.goalCount}`);
      cultivationLabel.setText(`本局修為 ${controller.cultivationReward()}`);
      rewardLabel.setText(`修為 +${controller.cultivationReward()}\n今日剩餘 3 次修行`);
    };
    const handleInput = () => {
      const judgement = controller.input(performance.now());
      if (judgement) displayJudgement(judgement);
    };
    inputZone.on("pointerdown", handleInput);
    this.input.keyboard?.on("keydown-SPACE", handleInput);
    back.on("pointerup", () => openModal("quit"));
    pause.on("pointerup", () => openModal("pause"));
    finishEarly.on("pointerup", () => openModal("finish"));

    const update = () => {
      if (finalized) return;
      const now = performance.now();
      const event = controller.update(now);
      if (event === "FINISHED") {
        showResult("normal");
        return;
      }
      if (event) displayJudgement(event);
      const snapshot = controller.snapshot(now);
      if (snapshot.state !== "playing") return;
      const remaining = Math.ceil(snapshot.remainingMs / 1000);
      timeLabel.setText(`時間 ${remaining}`);
      const timeRatio = snapshot.remainingMs / BAMBOO_GAME_CONFIG.roundDurationMs;
      timeBar.clear()
        .fillStyle(0x17231f, 0.64).fillRoundedRect(430, 62, 340, 13, 6)
        .fillStyle(0x426f58, 0.96).fillRoundedRect(433, 65, 334 * Math.max(0, timeRatio), 7, 3);
      const radius = Phaser.Math.Linear(
        BAMBOO_GAME_CONFIG.ringStartRadius,
        BAMBOO_GAME_CONFIG.targetRadius,
        snapshot.cycleProgress,
      );
      ringLayer.clear()
        .lineStyle(4, 0xe5d2a0, 0.78).strokeCircle(targetX, targetY, BAMBOO_GAME_CONFIG.targetRadius)
        .lineStyle(5, 0x76a985, 0.9).strokeCircle(targetX, targetY, radius);
    };
    this.events.on(Phaser.Scenes.Events.UPDATE, update);

    let count = BAMBOO_GAME_CONFIG.countdownSeconds;
    const countdownEvent = this.time.addEvent({
      delay: 1000,
      repeat: BAMBOO_GAME_CONFIG.countdownSeconds - 1,
      callback: () => {
        count -= 1;
        if (count > 0) {
          countdown.setText(String(count)).setScale(1.15);
          this.tweens.add({ targets: countdown, scale: 1, duration: 240 });
        } else {
          countdown.setText("開始");
          this.tweens.add({ targets: countdown, alpha: 0, duration: 420, onComplete: () => countdown.destroy() });
          controller.begin(performance.now());
        }
      },
    });
    countdownEvent.paused = false;
  }

  private showBambooTaskResult(controller: BambooGameController, reward: number) {
    this.resetLandscape();
    const background = this.add.image(600, 337.5, "bamboo-minigame-bg").setDisplaySize(1200, 675).setAlpha(0.58);
    const shade = this.add.rectangle(600, 337.5, 1200, 675, 0x14211e, 0.36);
    this.layer.add([background, shade]);
    this.text(600, 75, "修行完成", 42, "#f2e7cf");
    this.text(425, 180, `砍竹次數  ${controller.stats.strikes}`, 22, "#eee4d0");
    this.text(425, 225, `人刃合一  ${controller.stats.perfect}`, 22, "#e9cb78");
    this.text(425, 270, `運勁得宜  ${controller.stats.good}`, 22, "#eee4d0");
    this.text(775, 180, `勉強斬中  ${controller.stats.normal}`, 22, "#eee4d0");
    this.text(775, 225, `氣息紊亂  ${controller.stats.miss}`, 22, "#d8cec0");
    this.text(775, 270, `最高連擊  ${controller.stats.maxCombo}`, 22, "#e9cb78");
    this.text(600, 350, `獲得修為  +${reward}`, 29, "#e9cb78");
    this.text(600, 405, `熟練度  ${controller.proficiency()}%`, 23, "#d6e4da");
    this.button(465, 535, "再次修行", () => this.playBambooTask(), 220);
    this.button(735, 535, "返回竹林", () => this.showMainMenu(), 220);
  }

  private playWaterTask() {
    this.resetLandscape();
    const background = this.add.image(600, 337.5, "bamboo-minigame-bg").setDisplaySize(1200, 675);
    const foreground = this.add.image(630, 355, "title-mist-1")
      .setDisplaySize(720, 190).setAlpha(0.06).setBlendMode(Phaser.BlendModes.SCREEN);
    const hudPaper = this.add.graphics();
    hudPaper.fillStyle(0xeee6d4, 0.92).fillRoundedRect(35, 145, 265, 285, 8);
    hudPaper.lineStyle(1, 0x75654f, 0.58).strokeRoundedRect(35, 145, 265, 285, 8);
    const timeBar = this.add.graphics();
    const gauge = this.add.graphics();
    const spillLayer = this.add.graphics();
    this.layer.add([background, foreground, hudPaper, timeBar, gauge, spillLayer]);

    const character = this.add.image(650, 390, this.player.gender === "male" ? "player-bamboo-male" : "player-bamboo-female");
    character.setScale(Math.min(235 / character.width, 330 / character.height)).setOrigin(0.5, 0.74);
    const pole = this.add.rectangle(650, 315, 410, 10, 0x4f3827).setStrokeStyle(2, 0x251b14);
    const leftRope = this.add.line(0, 0, 0, 0, 0, 0, 0x31261d, 0.9).setOrigin(0);
    const rightRope = this.add.line(0, 0, 0, 0, 0, 0, 0x31261d, 0.9).setOrigin(0);
    const leftBucket = this.add.container(0, 0);
    const rightBucket = this.add.container(0, 0);
    const makeBucket = (container: Phaser.GameObjects.Container) => {
      const body = this.add.rectangle(0, 0, 72, 82, 0x4a3c2f).setStrokeStyle(3, 0x211b16);
      const bandA = this.add.rectangle(0, -22, 72, 5, 0x261f19);
      const bandB = this.add.rectangle(0, 22, 72, 5, 0x261f19);
      const water = this.add.rectangle(0, -31, 62, 11, 0x6fa8b0, 0.92);
      container.add([body, bandA, bandB, water]);
      return water;
    };
    const leftWater = makeBucket(leftBucket);
    const rightWater = makeBucket(rightBucket);
    this.layer.add([character, pole, leftRope, rightRope, leftBucket, rightBucket]);

    const controller = new WaterCarryGameController();
    const timeLabel = this.text(600, 38, "時間 25", 24, "#f1ead7");
    const balanceLabel = this.text(975, 40, "平衡 100%", 23, "#f1ead7");
    const infoLabel = this.text(168, 282, "挑水\n每日任務：挑水修行\n\n修為 +10\n今日剩餘 3 次修行", 20, "#2d352f");
    infoLabel.setLineSpacing(10);
    const feedback = this.text(600, 520, "", 25, "#e9cb78").setAlpha(0);
    const guide = this.text(600, 625, "保持重心在中央，避免水灑出！\n使用 ← → 鍵調整平衡", 20, "#f4ead2");
    guide.setAlign("center").setLineSpacing(5);
    const countdown = this.text(600, 315, "3", 82, "#f4e8ca");
    const back = this.text(70, 48, "←\n返回", 19, "#f1e5cc").setInteractive({ useHandCursor: true });
    const pause = this.text(1085, 50, "暫停", 19, "#f1e5cc").setInteractive({ useHandCursor: true });
    const leftTouch = this.add.zone(190, 555, 280, 190).setInteractive({ useHandCursor: true });
    const rightTouch = this.add.zone(1010, 555, 280, 190).setInteractive({ useHandCursor: true });
    this.layer.add([leftTouch, rightTouch]);
    const leftTouchLabel = this.text(155, 585, "←", 34, "#ead8ad").setAlpha(0.58);
    const rightTouchLabel = this.text(1045, 585, "→", 34, "#ead8ad").setAlpha(0.58);
    const modal = this.add.container(0, 0).setDepth(80).setVisible(false);
    this.layer.add(modal);

    const keys = this.input.keyboard?.addKeys("A,D,LEFT,RIGHT") as Record<string, Phaser.Input.Keyboard.Key> | undefined;
    let touchDirection: -1 | 0 | 1 = 0;
    let finalized = false;
    let previousZone: BalanceZone = "stable";
    let stableNoticeAt = 0;
    let lastFrameAt = performance.now();
    let visualElapsed = 0;

    const releaseTouch = () => { touchDirection = 0; };
    leftTouch.on("pointerdown", () => { touchDirection = -1; leftTouchLabel.setAlpha(1); });
    rightTouch.on("pointerdown", () => { touchDirection = 1; rightTouchLabel.setAlpha(1); });
    this.input.on("pointerup", releaseTouch);
    const cleanup = () => {
      this.events.off(Phaser.Scenes.Events.UPDATE, update);
      this.input.off("pointerup", releaseTouch);
      Object.values(keys ?? {}).forEach((key) => key.destroy());
    };
    const showFeedback = (message: string) => {
      feedback.setText(message).setAlpha(1).setY(520);
      this.tweens.killTweensOf(feedback);
      this.tweens.add({ targets: feedback, y: 490, alpha: 0, duration: 760, ease: "Sine.out" });
    };
    const leaveWithoutReward = () => {
      if (finalized) return;
      finalized = true;
      cleanup();
      this.showActivities();
    };
    const finish = () => {
      if (finalized) return;
      finalized = true;
      cleanup();
      const reward = WATER_CARRY_CONFIG.rewardCultivation;
      const cap = this.player.realm === "qi" ? REALMS.qi.cultivation[8] : this.cultivationTarget();
      this.player.cultivation = Math.min(cap, this.player.cultivation + reward);
      this.recordActivity("挑水", reward);
      this.saveGame();
      this.showWaterCarryResult(controller, reward);
    };
    const closeModal = () => {
      modal.removeAll(true);
      modal.setVisible(false);
    };
    const openModal = (kind: "pause" | "quit") => {
      if (finalized || controller.phase === "ready") return;
      if (kind === "pause") controller.pause(performance.now());
      else controller.openQuitConfirm(performance.now());
      modal.removeAll(true).setVisible(true);
      const dim = this.add.rectangle(600, 337.5, 1200, 675, 0x101816, 0.64).setInteractive();
      const paper = this.add.graphics();
      paper.fillStyle(0xeee6d4, 0.97).fillRoundedRect(380, 195, 440, 285, 10);
      paper.lineStyle(1, 0x75654f, 0.72).strokeRoundedRect(380, 195, 440, 285, 10);
      const title = this.add.text(600, 260, kind === "pause" ? "修行暫停" : "確定結束本次修行？", {
        fontFamily: '"Noto Serif TC", serif', fontSize: "27px", color: "#28332f",
      }).setOrigin(0.5);
      const primary = this.add.text(600, 355, kind === "pause" ? "繼續" : "確認", {
        fontFamily: '"Noto Serif TC", serif', fontSize: "22px", color: "#334b43",
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      const secondary = this.add.text(600, 415, kind === "pause" ? "離開" : "取消", {
        fontFamily: '"Noto Serif TC", serif', fontSize: "19px", color: "#65726d",
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      primary.on("pointerup", () => {
        if (kind === "pause") {
          controller.resume(performance.now());
          lastFrameAt = performance.now();
          closeModal();
        } else {
          controller.finish();
          leaveWithoutReward();
        }
      });
      secondary.on("pointerup", () => {
        if (kind === "pause") leaveWithoutReward();
        else {
          controller.cancelQuit(performance.now());
          lastFrameAt = performance.now();
          closeModal();
        }
      });
      modal.add([dim, paper, title, primary, secondary]);
    };
    back.on("pointerup", () => openModal("quit"));
    pause.on("pointerup", () => openModal("pause"));

    const updateRig = (position: number, velocity: number, waterL: number, waterR: number, spilling: boolean) => {
      const lean = position * 13;
      const walk = Math.sin(visualElapsed * 8) * 3;
      character.setAngle(lean * 0.52).setY(390 + walk);
      const poleAngle = lean * 0.34 - velocity * 10;
      pole.setAngle(poleAngle).setY(315 + walk);
      const radians = Phaser.Math.DegToRad(poleAngle);
      const half = 205;
      const leftX = 650 - Math.cos(radians) * half;
      const leftY = 315 - Math.sin(radians) * half + 96 + walk;
      const rightX = 650 + Math.cos(radians) * half;
      const rightY = 315 + Math.sin(radians) * half + 96 + walk;
      leftBucket.setPosition(leftX, leftY).setAngle(lean * 0.7 - velocity * 20);
      rightBucket.setPosition(rightX, rightY).setAngle(lean * 0.7 + velocity * 16);
      leftRope.setTo(650 - Math.cos(radians) * half, 315 - Math.sin(radians) * half + walk, leftX, leftY - 40);
      rightRope.setTo(650 + Math.cos(radians) * half, 315 + Math.sin(radians) * half + walk, rightX, rightY - 40);
      leftWater.setScale(1, Math.max(0.08, waterL)).setAngle(-leftBucket.angle);
      rightWater.setScale(1, Math.max(0.08, waterR)).setAngle(-rightBucket.angle);
      if (spilling) {
        const source = position < 0 ? leftBucket : rightBucket;
        spillLayer.fillStyle(0x88bcc8, 0.66);
        for (let i = 0; i < 3; i += 1) {
          spillLayer.fillCircle(source.x + Phaser.Math.Between(-34, 34), source.y + Phaser.Math.Between(35, 70), 3);
        }
      } else {
        spillLayer.clear();
      }
    };

    const update = () => {
      if (finalized) return;
      const now = performance.now();
      const delta = Math.min(0.05, Math.max(0, (now - lastFrameAt) / 1000));
      lastFrameAt = now;
      if (controller.phase !== "playing") return;
      const keyboardDirection: -1 | 0 | 1 = keys?.A.isDown || keys?.LEFT.isDown ? -1
        : keys?.D.isDown || keys?.RIGHT.isDown ? 1 : 0;
      visualElapsed += delta;
      const result = controller.update(now, delta, touchDirection || keyboardDirection);
      if (result === "FINISHED") {
        finish();
        return;
      }
      if (!result) return;
      const remaining = Math.ceil(controller.remainingMs(now) / 1000);
      timeLabel.setText(`時間 ${remaining}`);
      balanceLabel.setText(`平衡 ${Math.round(result.stabilityScore)}%`);
      const ratio = controller.remainingMs(now) / (WATER_CARRY_CONFIG.durationSeconds * 1000);
      timeBar.clear()
        .fillStyle(0x17231f, 0.64).fillRoundedRect(430, 62, 340, 13, 6)
        .fillStyle(0x426f58, 0.96).fillRoundedRect(433, 65, 334 * Math.max(0, ratio), 7, 3);
      gauge.clear()
        .fillStyle(0x1c211e, 0.7).fillRoundedRect(345, 555, 510, 22, 9)
        .fillStyle(0x5f7e68, 0.62).fillRoundedRect(510, 558, 180, 16, 6)
        .fillStyle(0xb89055, 0.72).fillRoundedRect(365, 558, 145, 16, 6)
        .fillStyle(0xb89055, 0.72).fillRoundedRect(690, 558, 145, 16, 6)
        .fillStyle(0xead08c, 1).fillCircle(600 + result.balancePosition * 225, 566, 13);
      updateRig(
        result.balancePosition,
        result.balanceVelocity,
        result.waterLeft,
        result.waterRight,
        result.zone === "spill" || result.zone === "lost",
      );
      if (result.zone !== previousZone) {
        if (result.zone === "warning") showFeedback(previousZone === "spill" || previousZone === "lost" ? "穩住身形" : "重心偏移");
        if (result.zone === "spill") showFeedback("水勢不穩");
        if (result.zone === "lost") showFeedback("腳步踉蹌");
        previousZone = result.zone;
      }
      if (result.zone === "stable" && visualElapsed - stableNoticeAt > 5) {
        showFeedback("步履沉穩");
        stableNoticeAt = visualElapsed;
      }
    };
    this.events.on(Phaser.Scenes.Events.UPDATE, update);

    let count = WATER_CARRY_CONFIG.countdownSeconds;
    this.time.addEvent({
      delay: 1000,
      repeat: WATER_CARRY_CONFIG.countdownSeconds - 1,
      callback: () => {
        count -= 1;
        if (count > 0) {
          countdown.setText(String(count)).setScale(1.15);
          this.tweens.add({ targets: countdown, scale: 1, duration: 240 });
        } else {
          countdown.setText("開始");
          this.tweens.add({ targets: countdown, alpha: 0, duration: 420, onComplete: () => countdown.destroy() });
          controller.begin(performance.now());
          lastFrameAt = performance.now();
          this.tweens.add({ targets: guide, alpha: 0, delay: 3000, duration: 600 });
        }
      },
    });
  }

  private showWaterCarryResult(controller: WaterCarryGameController, reward: number) {
    this.resetLandscape();
    const background = this.add.image(600, 337.5, "bamboo-minigame-bg").setDisplaySize(1200, 675).setAlpha(0.55);
    const shade = this.add.rectangle(600, 337.5, 1200, 675, 0x14211e, 0.4);
    this.layer.add([background, shade]);
    const result = controller.result();
    this.text(600, 70, "挑水修行完成", 40, "#f2e7cf");
    this.text(600, 155, result.evaluation, 27, "#e9cb78");
    this.text(480, 230, "平均平衡", 21, "#eee4d0");
    this.text(720, 230, `${Math.round(result.stabilityScore)}%`, 22, "#eee4d0");
    this.text(480, 275, "保持穩定", 21, "#eee4d0");
    this.text(720, 275, `${result.stableTime.toFixed(1)} 秒`, 22, "#eee4d0");
    this.text(480, 320, "失衡次數", 21, "#eee4d0");
    this.text(720, 320, `${result.lossEvents}`, 22, "#eee4d0");
    this.text(480, 365, "剩餘水量", 21, "#eee4d0");
    this.text(720, 365, `${result.remainingWaterPercent}%`, 22, "#eee4d0");
    this.text(600, 430, `獲得修為  +${reward}`, 28, "#e9cb78");
    this.button(465, 545, "再次修行", () => this.playWaterTask(), 220);
    this.button(735, 545, "返回", () => this.showActivities(), 220);
  }

  private playHerbTask() {
    this.resetLandscape();
    this.text(600, 48, "顧藥園", 42);
    this.text(600, 94, "選工具，處理藥圃突發狀況", 19, "#58746e");
    const events = ["成熟", "缺水", "蟲害", "雜草"] as const;
    const tools = ["採藥", "澆水", "驅蟲", "除草"] as const;
    let selectedTool = 0;
    let correct = 0;
    let attempts = 0;
    let health = 100;
    let elapsed = 0;
    let finished = false;
    const status: Array<number | null> = Array(6).fill(null);
    const statusLabels: Phaser.GameObjects.Text[] = [];
    tools.forEach((tool, index) => {
      const x = 270 + index * 220;
      const button = this.add.rectangle(x, 155, 180, 58, index === 0 ? COLORS.gold : COLORS.ink, 0.94)
        .setInteractive({ useHandCursor: true });
      this.layer.add(button);
      this.text(x, 155, tool, 18, "#f8f3df");
      button.on("pointerup", () => { selectedTool = index; });
    });
    for (let index = 0; index < 6; index += 1) {
      const x = 350 + (index % 3) * 250;
      const y = 310 + Math.floor(index / 3) * 175;
      const plot = this.add.circle(x, y, 70, 0x6d9270, 1).setStrokeStyle(4, 0x315449)
        .setInteractive({ useHandCursor: true });
      this.layer.add(plot);
      const label = this.text(x, y, "安穩", 19, "#f7f2df");
      statusLabels.push(label);
      plot.on("pointerup", () => {
        if (finished || status[index] === null) return;
        attempts += 1;
        if (selectedTool === status[index]) {
          correct += 1;
          status[index] = null;
          label.setText("安穩");
          plot.setFillStyle(0x6d9270);
        } else {
          health = Math.max(0, health - 6);
          this.cameras.main.shake(70, 0.003);
        }
      });
    }
    const healthLabel = this.text(600, 590, "藥園健康 100%", 21, "#58746e");
    const timeLabel = this.text(600, 625, "剩餘 30 秒", 18, "#58746e");
    this.time.addEvent({ delay: 1000, repeat: 29, callback: () => {
      if (finished) return;
      elapsed += 1;
      const open = status.map((value, index) => value === null ? index : -1).filter((index) => index >= 0);
      if (open.length && elapsed % 2 === 0) {
        const plotIndex = Phaser.Utils.Array.GetRandom(open);
        const eventIndex = Phaser.Math.Between(0, events.length - 1);
        status[plotIndex] = eventIndex;
        statusLabels[plotIndex].setText(events[eventIndex]);
      }
      const unresolved = status.filter((value) => value !== null).length;
      health = Math.max(0, health - unresolved * 0.35);
      healthLabel.setText(`藥園健康 ${Math.ceil(health)}%`);
      timeLabel.setText(`剩餘 ${Math.max(0, 30 - elapsed)} 秒`);
      if (elapsed >= 30) {
        finished = true;
        const accuracy = attempts ? correct / attempts * 100 : 0;
        const success = health > 0 && correct >= 6;
        this.grantTaskCultivation("顧藥園", accuracy * 0.6 + health * 0.4, success);
      }
    } });
  }

  private playMantraTask() {
    this.resetLandscape();
    const background = this.add.image(600, 337.5, "heart-manual-bg").setDisplaySize(1200, 675);
    const hudShade = this.add.rectangle(600, 337.5, 1200, 675, 0x101713, 0.12);
    const qiLayer = this.add.graphics();
    const effectLayer = this.add.graphics();
    const timeBar = this.add.graphics();
    const hudPaper = this.add.graphics();
    hudPaper.fillStyle(0xeee6d4, 0.91).fillRoundedRect(36, 210, 250, 205, 7);
    hudPaper.lineStyle(1, 0x75654f, 0.58).strokeRoundedRect(36, 210, 250, 205, 7);
    this.layer.add([background, hudShade, qiLayer, effectLayer, timeBar, hudPaper]);

    const controller = new HeartManualGameController();
    const meridianX = 476;
    const meridianPoints = [529, 446, 375, 312, 257].map((y, index) => ({
      x: meridianX,
      y,
      name: HEART_MANUAL_CONFIG.meridians[index],
    }));
    let targetIndex = 0;
    let finalized = false;
    let modalKind: "pause" | "quit" | "finish" = "pause";

    const inputZone = this.add.zone(600, 337.5, 1200, 675).setInteractive({ useHandCursor: true });
    this.layer.add(inputZone);
    const timeLabel = this.text(600, 38, "時間 25", 24, "#f1ead7");
    const cultivationLabel = this.text(985, 38, "修為 +10", 21, "#f1ead7");
    const resonanceLabel = this.text(1040, 128, "連續共鳴 0", 28, "#e8d08b");
    const infoLabel = this.text(160, 310, "參悟心法\n修為 +10\n今日尚餘 3 次修行", 21, "#2d352f");
    infoLabel.setLineSpacing(13);
    const guide = this.text(600, 615, "靈氣即將抵達【氣海】\n請把握時機點擊", 20, "#f4ead2");
    guide.setAlign("center").setLineSpacing(6);
    const judgementLabel = this.text(meridianX + 115, 365, "", 30, "#e9ca74").setAlpha(0);
    const countdown = this.text(600, 315, "3", 82, "#f4e8ca");
    const back = this.text(70, 48, "←\n返回", 19, "#f1e5cc").setInteractive({ useHandCursor: true });
    const pause = this.text(1085, 50, "暫停", 19, "#f1e5cc").setInteractive({ useHandCursor: true });
    const finishEarly = this.text(1070, 605, "收式", 23, "#f1e5cc").setInteractive({ useHandCursor: true });
    const modal = this.add.container(0, 0).setDepth(80).setVisible(false);
    this.layer.add(modal);

    [back, pause, finishEarly].forEach((button) => {
      button.on("pointerover", () => button.setAlpha(0.72));
      button.on("pointerout", () => button.setAlpha(1));
      button.on("pointerdown", () => button.setScale(0.96));
      button.on("pointerup", () => button.setScale(1));
    });

    const cleanup = () => {
      this.events.off(Phaser.Scenes.Events.UPDATE, update);
      this.input.keyboard?.off("keydown-SPACE", handleInput);
    };
    const showResult = (rewardMode: "normal" | "minimum" | "proportional" = "normal") => {
      if (finalized) return;
      finalized = true;
      cleanup();
      inputZone.disableInteractive();
      const now = performance.now();
      const reward = rewardMode === "minimum"
        ? HEART_MANUAL_CONFIG.rewardFormula.baseCultivation
        : rewardMode === "proportional"
          ? controller.earlyCultivationReward(now)
          : controller.cultivationReward();
      const cap = this.player.realm === "qi" ? REALMS.qi.cultivation[8] : this.cultivationTarget();
      this.player.cultivation = Math.min(cap, this.player.cultivation + reward);
      this.recordActivity("參悟心法", reward);
      this.saveGame();
      this.showHeartManualResult(controller, reward);
    };
    const closeModal = () => {
      modal.removeAll(true);
      modal.setVisible(false);
    };
    const openModal = (kind: "pause" | "quit" | "finish") => {
      if (finalized || controller.state === "ready") return;
      modalKind = kind;
      if (kind === "pause") controller.pause(performance.now());
      else controller.openQuitConfirm(performance.now());
      modal.removeAll(true).setVisible(true);
      const dim = this.add.rectangle(600, 337.5, 1200, 675, 0x101816, 0.64).setInteractive();
      const paper = this.add.graphics();
      paper.fillStyle(0xeee6d4, 0.97).fillRoundedRect(380, 195, 440, 285, 10);
      paper.lineStyle(1, 0x75654f, 0.72).strokeRoundedRect(380, 195, 440, 285, 10);
      const message = kind === "pause" ? "修行暫停"
        : kind === "quit" ? "確定結束本次修行？"
        : "確定提前收式？\n將按目前成果結算";
      const title = this.add.text(600, 260, message, {
        fontFamily: '"Noto Serif TC", serif', fontSize: "27px", color: "#28332f", align: "center",
      }).setOrigin(0.5);
      const primary = this.add.text(600, 355, kind === "pause" ? "繼續" : "確認", {
        fontFamily: '"Noto Serif TC", serif', fontSize: "22px", color: "#334b43",
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      const secondary = this.add.text(600, 415, kind === "pause" ? "離開" : "取消", {
        fontFamily: '"Noto Serif TC", serif', fontSize: "19px", color: "#65726d",
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      primary.on("pointerup", () => {
        if (modalKind === "pause") {
          controller.resume(performance.now());
          closeModal();
        } else if (modalKind === "quit") {
          controller.finishEarly();
          showResult("minimum");
        } else {
          controller.finishEarly();
          showResult("proportional");
        }
      });
      secondary.on("pointerup", () => {
        if (modalKind === "pause") {
          controller.finishEarly();
          showResult("minimum");
        } else {
          controller.cancelQuit(performance.now());
          closeModal();
        }
      });
      modal.add([dim, paper, title, primary, secondary]);
    };
    const displayJudgement = (judgement: RhythmJudgement) => {
      const point = meridianPoints[targetIndex];
      judgementLabel.setText(HEART_MANUAL_CONFIG.labels[judgement]);
      judgementLabel.setColor(judgement === "PERFECT" ? "#f0ca6a" : judgement === "MISS" ? "#d5c8b3" : "#e8dfc9");
      judgementLabel.setPosition(point.x + 118, point.y).setAlpha(1).setScale(judgement === "PERFECT" ? 1.12 : 1);
      this.tweens.add({ targets: judgementLabel, y: point.y - 42, alpha: 0, duration: 600, ease: "Sine.out" });
      if (judgement !== "MISS") {
        effectLayer.clear()
          .lineStyle(3, 0xe9c872, 0.82).strokeCircle(point.x, point.y, 17)
          .lineStyle(2, 0xe9c872, 0.35).strokeCircle(point.x, point.y, 31);
        this.time.delayedCall(190, () => effectLayer.clear());
      }
      if (controller.stats.combo > 0) {
        this.tweens.add({ targets: resonanceLabel, scale: 1.14, duration: 90, yoyo: true });
      }
      targetIndex = (targetIndex + 1) % meridianPoints.length;
      resonanceLabel.setText(`連續共鳴 ${controller.stats.combo}`);
      cultivationLabel.setText(`修為 +${controller.cultivationReward()}`);
      infoLabel.setText(`參悟心法\n修為 +${controller.cultivationReward()}\n今日尚餘 3 次修行`);
      guide.setText(`靈氣即將抵達【${meridianPoints[targetIndex].name}】\n請把握時機點擊`);
    };
    const handleInput = () => {
      const judgement = controller.input(performance.now());
      if (judgement) displayJudgement(judgement);
    };
    inputZone.on("pointerdown", handleInput);
    this.input.keyboard?.on("keydown-SPACE", handleInput);
    back.on("pointerup", () => openModal("quit"));
    pause.on("pointerup", () => openModal("pause"));
    finishEarly.on("pointerup", () => openModal("finish"));

    const update = () => {
      if (finalized) return;
      const now = performance.now();
      const event = controller.update(now);
      if (event === "FINISHED") {
        showResult("normal");
        return;
      }
      if (event) displayJudgement(event);
      const snapshot = controller.snapshot(now);
      if (snapshot.state !== "playing") return;
      const remaining = Math.ceil(snapshot.remainingMs / 1000);
      timeLabel.setText(`時間 ${remaining}`);
      const ratio = snapshot.remainingMs / HEART_MANUAL_CONFIG.roundDurationMs;
      timeBar.clear()
        .fillStyle(0x17231f, 0.64).fillRoundedRect(430, 62, 340, 13, 6)
        .fillStyle(0x426f58, 0.96).fillRoundedRect(433, 65, 334 * Math.max(0, ratio), 7, 3);
      const to = meridianPoints[targetIndex];
      const from = meridianPoints[(targetIndex + meridianPoints.length - 1) % meridianPoints.length];
      const progress = Phaser.Math.Easing.Sine.InOut(snapshot.cycleProgress);
      const qx = Phaser.Math.Linear(from.x, to.x, progress);
      const qy = Phaser.Math.Linear(from.y, to.y, progress);
      qiLayer.clear()
        .fillStyle(0xf2d27b, 0.26).fillCircle(qx, qy, 15)
        .fillStyle(0xf6df9a, 0.92).fillCircle(qx, qy, 6);
    };
    this.events.on(Phaser.Scenes.Events.UPDATE, update);

    let count = HEART_MANUAL_CONFIG.countdownSeconds;
    this.time.addEvent({
      delay: 1000,
      repeat: HEART_MANUAL_CONFIG.countdownSeconds - 1,
      callback: () => {
        count -= 1;
        if (count > 0) {
          countdown.setText(String(count)).setScale(1.15);
          this.tweens.add({ targets: countdown, scale: 1, duration: 240 });
        } else {
          countdown.setText("開始");
          this.tweens.add({ targets: countdown, alpha: 0, duration: 420, onComplete: () => countdown.destroy() });
          controller.begin(performance.now());
        }
      },
    });
  }

  private showHeartManualResult(controller: HeartManualGameController, reward: number) {
    this.resetLandscape();
    const background = this.add.image(600, 337.5, "heart-manual-bg").setDisplaySize(1200, 675).setAlpha(0.52);
    const shade = this.add.rectangle(600, 337.5, 1200, 675, 0x14211e, 0.4);
    this.layer.add([background, shade]);
    this.text(600, 70, "修行完成", 42, "#f2e7cf");
    this.text(425, 180, `頓悟  ${controller.stats.perfect}`, 22, "#e9cb78");
    this.text(425, 225, `明悟  ${controller.stats.good}`, 22, "#eee4d0");
    this.text(425, 270, `參悟  ${controller.stats.normal}`, 22, "#eee4d0");
    this.text(775, 180, `雜念  ${controller.stats.miss}`, 22, "#d8cec0");
    this.text(775, 225, `最高共鳴  ${controller.stats.maxCombo}`, 22, "#e9cb78");
    this.text(600, 350, `修為  +${reward}`, 29, "#e9cb78");
    this.button(465, 535, "再次修行", () => this.playMantraTask(), 220);
    this.button(735, 535, "返回", () => this.showActivities(), 220);
  }

  private showTaskResult(task: string, gain: number, score: number, success: boolean) {
    this.resetLandscape();
    const excellent = score >= 85;
    this.text(600, 130, success ? (excellent ? "靈機相合" : score >= 50 ? "略有所得" : "勤能補拙") : "修行未成", 42, success && excellent ? "#46796e" : "#6e756f");
    const eventLines: Record<string, string> = {
      砍竹: "竹節中逸出一縷靈氣。",
      挑水: "桶中竟混入一滴靈泉。",
      顧藥園: "你認出一株剛成熟的凝露草。",
      參悟心法: "一句晦澀口訣忽然通順。",
      吐納: "呼吸漸穩，靈氣沿經脈緩緩流轉。",
    };
    this.text(600, 225, eventLines[task], 22);
    this.text(600, 300, `操作分數 ${score}`, 24, "#58746e");
    this.text(600, 350, `修為 +${gain}`, 32, "#9b762c");
    this.text(600, 400, "靈氣有所感應", 22, "#54736c");
    const progress = Math.min(100, Math.floor((this.player.cultivation / this.cultivationTarget()) * 100));
    const progressLabel = this.player.realm === "uninitiated" ? "距離引氣入體" : "當前境界修為";
    this.text(600, 455, `${progressLabel}：${progress}%`, 22, "#54736c");
    this.button(600, 550, this.player.cultivation >= this.cultivationTarget() ? "修為已滿" : "繼續", () => this.showActivities());
  }

  private showInsight() {
    this.resetLandscape();
    this.text(600, 60, "引氣入體", 42);
    this.text(600, 110, "第一步 · 按住吸收靈氣", 21, "#58746e");
    const orb = this.add.circle(600, 350, 70, COLORS.jade, 0.75).setInteractive({ useHandCursor: true });
    const ring = this.add.circle(600, 350, 105).setStrokeStyle(4, COLORS.gold, 0.7);
    this.layer.add([ring, orb]);
    let holding = false;
    let heldFor = 0;
    orb.on("pointerdown", () => { holding = true; });
    this.input.on("pointerup", () => { holding = false; heldFor = 0; orb.setScale(1); });
    this.time.addEvent({ delay: 50, loop: true, callback: () => {
      if (!holding) return;
      heldFor += 50;
      orb.setScale(1 + heldFor / 2200);
      if (heldFor >= 900) this.showInsightDrag();
    }});
    this.text(600, 540, "長按光團，讓靈氣聚於掌心", 19, "#66817c");
  }

  private showInsightDrag() {
    this.resetLandscape();
    this.text(600, 60, "引氣入體", 42);
    this.text(600, 110, "第二步 · 拖曳靈氣進入丹田", 21, "#58746e");
    const orb = this.add.circle(600, 220, 48, COLORS.gold, 0.9).setInteractive({ draggable: true, useHandCursor: true });
    const dantian = this.add.circle(600, 485, 82, COLORS.jade, 0.18).setStrokeStyle(4, COLORS.jade, 0.9);
    this.layer.add([dantian, orb]);
    this.input.setDraggable(orb);
    orb.on("drag", (_pointer: Phaser.Input.Pointer, x: number, y: number) => orb.setPosition(x, y));
    orb.on("dragend", () => {
      if (Phaser.Math.Distance.Between(orb.x, orb.y, dantian.x, dantian.y) < 95) this.showInsightTiming();
      else orb.setPosition(600, 220);
    });
    this.text(600, 600, "將光團拖入下方丹田", 19, "#66817c");
  }

  private showInsightTiming() {
    this.resetLandscape();
    this.text(600, 60, "引氣入體", 42);
    this.text(600, 110, "第三步 · 光圈重合時點擊", 21, "#58746e");
    const target = this.add.circle(600, 355, 72, COLORS.jade, 0.2).setStrokeStyle(5, COLORS.gold, 0.9);
    const pulse = this.add.circle(600, 355, 170).setStrokeStyle(6, COLORS.jade, 0.9).setInteractive({ useHandCursor: true });
    this.layer.add([target, pulse]);
    this.tweens.add({ targets: pulse, scale: 0.42, duration: 1500, repeat: -1 });
    pulse.on("pointerup", () => {
      const closeEnough = Math.abs(pulse.displayWidth - target.displayWidth) < 90;
      if (closeEnough) this.enterQiOne();
      else this.text(600, 585, "莫急，待光圈再次重合", 20, "#8b4a43");
    });
  }

  private enterQiOne() {
    for (const attribute of ATTRIBUTES) {
      const [min, max] = REALMS.qi.rollRanges[0];
      const roll = Phaser.Math.Between(min, max);
      const cap = qiComponentCapAtLevel(attribute, this.player.initialAttributes[attribute], 1);
      this.player.attributes[attribute] = Math.min(
        cap,
        this.player.attributes[attribute] + effectiveGrowth(roll, ROOT_MULTIPLIERS[this.player.root]),
      );
    }
    this.player.realm = "qi";
    this.player.level = 1;
    this.player.cultivation = 0;
    this.saveGame();
    this.resetLandscape();
    const flash = this.add.rectangle(600, 337.5, 1200, 675, 0xffffff, 0.85);
    this.layer.add(flash);
    this.tweens.add({ targets: flash, alpha: 0, duration: 700 });
    this.text(600, 65, "引氣入體", 36, "#4d776e");
    this.text(600, 120, "練氣一層", 52, "#9b762c");
    this.text(600, 185, "身份：雜役弟子", 22);
    ATTRIBUTES.forEach((attribute, index) => {
      const x = index % 2 === 0 ? 440 : 760;
      const y = 285 + Math.floor(index / 2) * 75;
      this.text(x, y, `${ATTRIBUTE_LABELS[attribute]}  ${this.player.attributes[attribute]}`, 24);
    });
    this.text(600, 475, "靈氣流轉，衣袂間泛起淡淡靈光", 18, "#54736c");
    this.button(600, 565, "接受師姐指引", () => this.showMuQingli());
  }

  private showMuQingli() {
    this.resetLandscape();
    this.text(600, 55, "第一次吐納", 37);
    const portrait = this.add.circle(350, 315, 105, 0xdceaf0).setStrokeStyle(4, 0x7697a5);
    const hair = this.add.arc(350, 285, 200, 175, 365, false, 0x182725);
    this.layer.add([portrait, hair]);
    this.text(350, 465, "慕清璃", 28, "#496b79");
    this.text(760, 255, "「既已引氣入體，師姐再教你一些基礎。」", 21);
    this.text(760, 325, "「盤膝，吐納。」", 25);
    this.text(760, 390, "「感受天地靈氣如何流轉。」", 21);
    this.button(760, 500, "開始吐納", () => this.playBreathingTask(true));
  }

  private playBreathingTask(tutorial: boolean) {
    this.resetLandscape();
    this.text(600, 50, tutorial ? "吐納教學" : "吐納", 40);
    this.text(600, 95, "光團收縮時按住吸氣，放大時放開吐氣", 18, "#58746e");
    const aura = this.add.circle(600, 330, 105, COLORS.jade, 0.55).setStrokeStyle(5, COLORS.gold, 0.75);
    const inner = this.add.circle(600, 330, 52, 0xe8fff7, 0.5);
    const zone = this.add.zone(600, 330, 420, 420).setInteractive({ useHandCursor: true });
    this.layer.add([aura, inner, zone]);
    let elapsed = 0;
    let holding = false;
    let breaths = 0;
    let goodBreaths = 0;
    let phase = 0;
    let finished = false;
    const status = this.text(600, 525, "跟隨靈氣的呼吸", 22, "#54736c");
    const timerLabel = this.text(600, 575, "剩餘 30 秒", 20, "#58746e");
    zone.on("pointerdown", () => {
      holding = true;
      status.setText(phase < 0.55 ? "吸氣 · 靈氣入體" : "太快，靈氣散開");
    });
    this.input.on("pointerup", () => {
      if (!holding) return;
      holding = false;
      breaths += 1;
      if (phase >= 0.45) {
        goodBreaths += 1;
        status.setText("吐氣 · 靈氣歸丹田");
      } else {
        status.setText("太慢，靈氣正在外洩");
      }
    });
    this.time.addEvent({ delay: 50, loop: true, callback: () => {
      if (finished) return;
      elapsed += 50;
      phase = (Math.sin((elapsed / 2200) * Math.PI * 2 - Math.PI / 2) + 1) / 2;
      const scale = 0.72 + phase * 0.42;
      aura.setScale(scale);
      inner.setScale(0.85 + phase * 0.25);
      const seconds = Math.max(0, 30 - Math.floor(elapsed / 1000));
      timerLabel.setText(`剩餘 ${seconds} 秒 · 穩定吐納 ${goodBreaths} 次`);
      if (elapsed >= 30000) {
        finished = true;
        zone.disableInteractive();
        this.finishBreathingTask(tutorial, breaths, goodBreaths);
      }
    }});
  }

  private finishBreathingTask(tutorial: boolean, breaths: number, goodBreaths: number) {
    const score = breaths === 0 ? 0 : Math.round((goodBreaths / breaths) * 100);
    if (!tutorial) {
      this.grantTaskCultivation("吐納", score, goodBreaths >= 4);
      return;
    }
    if (goodBreaths < 4) {
      this.resetLandscape();
      this.text(600, 180, `${this.player.name}：「師姐，我總是聚不起靈氣……」`, 22);
      this.text(600, 300, "慕清璃：「心浮，則氣散。」", 25, "#496b79");
      this.text(600, 365, "「再來。」", 30, "#496b79");
      this.button(600, 500, "重新吐納", () => this.playBreathingTask(true));
      return;
    }
    this.player.cultivation = Math.max(this.player.cultivation, REALMS.qi.cultivation[1]);
    this.saveGame();
    this.resetLandscape();
    this.text(600, 155, "慕清璃：「尚可。」", 31, "#496b79");
    this.text(600, 265, "本次引導修為已滿", 27, "#9b762c");
    this.text(600, 325, `修為 ${this.player.cultivation} / ${REALMS.qi.cultivation[1]}`, 23, "#54736c");
    this.text(600, 410, "「完成一次吐納，嘗試突破練氣二層。」", 21);
    this.button(600, 515, "突破練氣二層", () => this.showQiBreakthrough(true));
  }

  private showMainMenu() {
    this.resetLandscape();
    const realmLabel = this.player.realm === "foundation" ? "筑基" : "練氣";
    this.text(600, 55, `${realmLabel}${this.player.level}層`, 38);
    this.text(600, 100, `${this.player.name} · ${this.player.identity}`, 20, "#607d77");
    this.text(600, 175, "慕清璃：「勉強入門。」", 23);
    const actions: Record<string, () => void> = {
      修煉: () => this.showActivities(),
      問仙石: () => this.showStoneStatus(),
      [this.player.realm === "foundation" ? "外門差事" : "雜役差事"]: () => this.showActivities(),
      角色狀態: () => this.showCharacterStatus(),
    };
    ["修煉", "問仙石", this.player.realm === "foundation" ? "外門差事" : "雜役差事", "角色狀態"].forEach((label, index) => {
      const x = 285 + index * 210;
      this.button(x, 350, label, actions[label], 180);
    });
    const nextGoal = this.player.realm === "qi"
      ? (this.player.level < 9 ? `下一目標：修至練氣${this.player.level + 1}層` : "下一目標：突破筑基")
      : (this.player.level < 9 ? `下一目標：修至筑基${this.player.level + 1}層` : "筑基九層圓滿 · 渡劫尚未開放");
    this.text(600, 525, nextGoal, 24, "#9b762c");
    this.button(1060, 610, "場景移動", () => this.showSceneTravelLocked(), 210);
  }

  private showSceneTravelLocked() {
    const panel = this.add.graphics().setDepth(900);
    panel.fillStyle(0xf3eee1, 0.97).fillRoundedRect(775, 500, 360, 76, 14);
    panel.lineStyle(2, COLORS.ink, 0.65).strokeRoundedRect(775, 500, 360, 76, 14);
    const message = this.add.text(955, 538, "宗門權限不足，無法前往", {
      fontFamily: '"Noto Serif TC", "Microsoft JhengHei", serif',
      fontSize: "22px",
      color: "#18312f",
    }).setOrigin(0.5).setDepth(901);
    this.layer.add([panel, message]);
    this.tweens.add({ targets: [panel, message], alpha: 0, duration: 450, delay: 1500, onComplete: () => {
      panel.destroy();
      message.destroy();
    }});
  }

  private showStoneStatus() {
    this.resetLandscape();
    const current = ATTRIBUTES.reduce((sum, attribute) => sum + this.player.attributes[attribute], 0);
    const maximum = ATTRIBUTES.reduce((sum, attribute) => sum + (
      this.player.realm === "foundation"
        ? REALMS.qi.componentCaps[attribute] + REALMS.foundation.componentCaps[attribute]
        : REALMS.qi.componentCaps[attribute]
    ), 0);
    const rating = insightRating(current, maximum);
    this.text(600, 65, "問仙石驗證", 40);
    this.text(600, 155, `${rating.label}`, 48, rating.label === "道基不穩" ? "#8b4a43" : "#9b762c");
    this.text(600, 225, `四維總合完成度 ${rating.percent}%`, 24);
    const realmLabel = this.player.realm === "foundation" ? "筑基" : "練氣";
    this.text(600, 315, `目前總合 ${current}\n${realmLabel}圓滿總值 ${maximum}`, 22, "#58746e");
    this.text(600, 430, "此結果只作修煉參考，不改變突破概率。", 21);
    this.button(600, 535, "返回", () => this.showMainMenu(), 240);
  }

  private showCharacterStatus() {
    this.resetLandscape();
    this.text(600, 55, "角色狀態", 40);
    this.text(600, 105, `${this.player.name} · ${this.player.identity}`, 22, "#58746e");
    const realmLabel = this.player.realm === "foundation" ? "筑基" : "練氣";
    this.text(600, 150, `${ROOT_LABELS[this.player.root]} · ${realmLabel}${this.player.level}層`, 24, "#9b762c");
    ATTRIBUTES.forEach((attribute, index) => {
      const x = index % 2 === 0 ? 420 : 780;
      const y = 275 + Math.floor(index / 2) * 90;
      this.text(x, y, `${ATTRIBUTE_LABELS[attribute]}  ${this.player.attributes[attribute]}`, 26);
    });
    this.text(600, 455, `入門第 ${this.player.sectDay} 日 · ${this.timeLabel()}`, 20, "#58746e");
    this.text(600, 495, `累積修為 ${this.player.cultivation}`, 23);
    this.button(450, 575, "修行紀錄", () => this.showActivityHistory(), 240);
    this.button(750, 575, "返回", () => this.showMainMenu(), 240);
  }

  private showActivityHistory() {
    this.resetLandscape();
    this.text(600, 45, "修行紀錄", 38);
    this.text(600, 90, `${this.player.name} · ${this.player.identity}`, 21, "#58746e");
    this.text(600, 125, `入門第 ${this.player.sectDay} 日 · ${this.timeLabel()}`, 19, "#58746e");
    const realmLabel = this.player.realm === "foundation" ? "筑基境" : this.player.realm === "qi" ? "練氣境" : "尚未入境";
    this.text(600, 165, `${realmLabel}　${this.player.level > 0 ? `第 ${this.player.level} 層` : ""}`, 25, "#9b762c");
    this.text(600, 205, `累積修為 ${this.player.cultivation}`, 22, "#54736c");
    const activityOrder = ["砍竹", "挑水", "顧藥園", "參悟心法", "吐納", "經脈運氣", "閉關吐納"];
    activityOrder.forEach((task, index) => {
      const stats = this.player.activityStats[task] ?? { count: 0, cultivation: 0 };
      const x = index % 2 === 0 ? 380 : 820;
      const y = 285 + Math.floor(index / 2) * 70;
      this.text(x, y, `${task}　${stats.count} 次　累積修為 ${stats.cultivation}`, 19);
    });
    this.button(600, 590, "返回首頁", () => this.showTitle(), 280);
  }

  private showQiBreakthrough(tutorial = false) {
    this.resetLandscape();
    const targetLevel = this.player.level + 1;
    this.text(600, 65, `突破練氣${targetLevel}層`, 38);
    this.text(600, 115, "靈氣進入玉色區域時，連續定氣三次", 18, "#58746e");
    const track = this.add.rectangle(600, 340, 700, 54, 0x29413d, 0.94);
    const zoneWidth = Math.max(86, 155 - targetLevel * 6);
    const zone = this.add.rectangle(600, 340, zoneWidth, 54, COLORS.jade, 1);
    const marker = this.add.circle(270, 340, 22, COLORS.gold);
    this.layer.add([track, zone, marker]);
    this.tweens.add({ targets: marker, x: 930, duration: Math.max(650, 1100 - targetLevel * 35), yoyo: true, repeat: -1 });
    let rounds = 0;
    let scoreTotal = 0;
    const settle = this.button(600, 500, "定氣", () => {
      const distance = Math.abs(marker.x - 600);
      scoreTotal += distance <= zoneWidth / 2 ? 100 : distance <= zoneWidth ? 75 : 45;
      rounds += 1;
      if (rounds < 3) return;
      settle.disableInteractive();
      this.resolveQiBreakthrough(targetLevel, Math.ceil(scoreTotal / 3), tutorial);
    });
    this.text(600, 575, "判定寬鬆，失誤也可繼續完成", 17, "#66817c");
  }

  private resolveQiBreakthrough(targetLevel: number, score: number, tutorial = false) {
    if (tutorial) score = Math.max(50, score);
    if (score < 50) {
      const lost = Phaser.Math.Between(1, 3);
      this.player.level = Math.max(1, this.player.level - lost);
      this.player.cultivation = 0;
      this.saveGame();
      this.showBreakthroughResult(false, `氣息潰散，跌回練氣${this.player.level}層`);
      return;
    }
    const gains = { spirit: 0, bone: 0, body: 0, sense: 0 } as Record<Attribute, number>;
    for (const attribute of ATTRIBUTES) {
      const [min, max] = REALMS.qi.rollRanges[targetLevel <= 3 ? 0 : targetLevel <= 6 ? 1 : 2];
      const gain = effectiveGrowth(Phaser.Math.Between(min, max), ROOT_MULTIPLIERS[this.player.root]);
      const cap = qiComponentCapAtLevel(attribute, this.player.initialAttributes[attribute], targetLevel);
      const before = this.player.attributes[attribute];
      this.player.attributes[attribute] = Math.min(cap, before + gain);
      gains[attribute] = this.player.attributes[attribute] - before;
    }
    this.player.level = targetLevel;
    if (!tutorial) this.player.cultivation = Math.max(this.player.cultivation, REALMS.qi.cultivation[targetLevel - 1]);
    this.player.breathingTutorialComplete ||= tutorial;
    this.saveGame();
    if (tutorial) this.showTutorialBreakthroughResult(gains);
    else this.showBreakthroughResult(true, `練氣${targetLevel}層`);
  }

  private showTutorialBreakthroughResult(gains: Record<Attribute, number>) {
    this.resetLandscape();
    this.text(600, 65, "練氣一層 → 練氣二層", 34, "#9b762c");
    this.text(600, 120, "成長結果", 27);
    ATTRIBUTES.forEach((attribute, index) => {
      const x = index % 2 === 0 ? 440 : 760;
      const y = 230 + Math.floor(index / 2) * 85;
      this.text(x, y, `${ATTRIBUTE_LABELS[attribute]} +${gains[attribute]}`, 25, "#47786e");
    });
    this.text(600, 430, "不同靈根僅影響角色成長速度，但不會增加遊戲基本操作難度。", 20, "#58746e");
    this.button(600, 535, "聽師姐講解", () => this.showFoundationLesson());
  }

  private showFoundationLesson() {
    this.resetLandscape();
    this.text(600, 70, "慕清璃 · 境界指引", 34, "#496b79");
    this.text(600, 220, "「小境界的突破，不過是靈氣累積。」", 24);
    this.text(600, 310, "「真正的考驗，在練氣九層之後。」", 24);
    this.text(600, 400, "「現在，閉上眼睛。」", 28, "#496b79");
    this.button(600, 525, "閉上眼睛", () => this.showFoundationVision());
  }

  private showFoundationVision() {
    this.resetLandscape();
    const darkness = this.add.rectangle(600, 337.5, 1200, 675, 0x07100f, 0.96);
    this.layer.add(darkness);
    this.text(600, 55, "神識所見", 32, "#d6b866");
    this.text(600, 115, "練氣九層之後，便是築基。築基丹可提升跨境成功機率。", 22, "#e8e0c8");
    const panel = this.add.graphics();
    panel.fillStyle(0xf3eddf, 0.94).fillRoundedRect(250, 205, 700, 300, 18);
    panel.lineStyle(3, COLORS.gold, 0.72).strokeRoundedRect(250, 205, 700, 300, 18);
    panel.lineStyle(2, COLORS.jade, 0.55).lineBetween(600, 235, 600, 475);
    this.layer.add(panel);
    this.text(425, 275, "突破成功", 25, "#47786e");
    this.text(425, 365, "角色氣息與服裝\n進入新的境界", 19);
    this.text(775, 275, "突破失敗", 25, "#8b4a43");
    this.text(775, 365, "境界跌落\n既有素質保留", 19);
    this.text(600, 540, "跨境必須親自突破；丹藥只提高成功機率。", 18, "#e8e0c8");
    this.button(600, 610, "睜開眼睛", () => this.finishFoundationLesson());
  }

  private finishFoundationLesson() {
    this.player.foundationLessonSeen = true;
    this.saveGame();
    this.resetLandscape();
    this.text(600, 140, `${this.player.name}：「剛才那是……」`, 24);
    this.text(600, 255, "慕清璃：", 25, "#496b79");
    this.text(600, 325, "「等你走到那一步，自然會明白。」", 23);
    this.text(600, 385, "「去修練吧。」", 27, "#496b79");
    this.text(600, 445, "（不再解釋。）", 18, "#66817c");
    this.button(600, 535, "開放自由行動", () => this.showMainMenu());
  }

  private showBreakthroughResult(success: boolean, result: string) {
    this.resetLandscape();
    const pulse = this.add.circle(600, 330, 80, success ? COLORS.jade : 0x7e4b44, 0.7);
    this.layer.add(pulse);
    this.tweens.add({ targets: pulse, scale: 2.2, alpha: 0, duration: 850 });
    this.text(600, 130, success ? "突破成功" : "突破失敗", 48, success ? "#47786e" : "#8b4a43");
    this.text(600, 230, result, 30);
    this.text(600, 430, success ? "四維已各自獨立取得本層成長" : "屬性完整保留，可重新修煉", 19, "#58746e");
    this.button(600, 535, "返回主介面", () => this.showMainMenu(), 280);
  }

  private showFoundationPreparation() {
    const current = ATTRIBUTES.reduce((sum, attribute) => sum + this.player.attributes[attribute], 0);
    const maximum = ATTRIBUTES.reduce((sum, attribute) => sum + REALMS.qi.componentCaps[attribute], 0);
    const rating = insightRating(current, maximum);
    if (!this.player.metLiuRuyan) {
      this.showLiuRuyanEncounter(rating.label, rating.percent);
      return;
    }
    this.showFoundationChoice(rating.label, rating.percent);
  }

  private showLiuRuyanEncounter(label: string, percent: number) {
    this.resetLandscape();
    this.text(350, 65, "柳如煙", 38, "#806d93");
    const portrait = this.add.circle(350, 275, 105, 0xd7cce2).setStrokeStyle(4, COLORS.lilac);
    this.layer.add(portrait);
    this.text(760, 210, "「師弟／師妹好本事，竟修至練氣九層圓滿。」", 22);
    this.text(760, 305, "「這兩顆筑基丹，是我專門為你留的。」", 22, "#675b72");
    this.text(760, 390, `問仙石：${label}（${percent}%）`, 20, "#9b762c");
    this.button(760, 500, "收下筑基丹 ×2", () => {
      this.player.foundationPills += 2;
      this.player.metLiuRuyan = true;
      this.saveGame();
      this.showFoundationChoice(label, percent);
    });
  }

  private showFoundationChoice(label: string, percent: number) {
    this.resetLandscape();
    this.text(600, 60, "突破筑基", 42);
    this.text(600, 115, `問仙石：${label}（${percent}%）`, 21, "#9b762c");
    if (label === "道基不穩") {
      this.text(600, 170, "目前根基尚未穩固，仍可選擇快速突破。", 18, "#8b4a43");
    }
    this.text(600, 235, `筑基丹持有：${this.player.foundationPills}`, 22);
    this.button(420, 360, "裸衝", () => this.showFoundationMiniGame(false), 300);
    const pillButton = this.button(780, 360, "服丹突破（有效分數 +15）", () => this.showFoundationMiniGame(true), 390);
    if (this.player.foundationPills <= 0) pillButton.disableInteractive();
    this.button(600, 505, "主動墮境重修", () => {
      this.player.level = Phaser.Math.Between(6, 8);
      this.player.cultivation = 0;
      this.saveGame();
      this.showBreakthroughResult(false, `主動跌回練氣${this.player.level}層`);
    }, 320);
  }

  private showFoundationMiniGame(usedPill: boolean) {
    this.resetLandscape();
    const cave = this.add.image(600, 337.5, "foundation-cave");
    cave.setScale(Math.max(1200 / cave.width, 675 / cave.height)).setAlpha(0.9);
    this.layer.add(cave);
    this.text(600, 50, usedPill ? "服丹筑基" : "裸衝筑基", 40, "#e8ddaf");
    this.text(600, 95, "依序穩定四維靈氣", 19, "#f0ead7");
    const scores: number[] = [];
    const labels = ["靈", "骨", "身", "神"];
    let active = 0;
    const marker = this.add.circle(270, 340, 19, COLORS.gold);
    const track = this.add.rectangle(600, 340, 700, 48, 0x182b28, 0.95);
    const zone = this.add.rectangle(600, 340, usedPill ? 150 : 105, 48, COLORS.jade, 1);
    this.layer.add([track, zone, marker]);
    this.tweens.add({ targets: marker, x: 930, duration: usedPill ? 950 : 760, yoyo: true, repeat: -1 });
    this.text(600, 225, labels[active], 46, "#e8ddaf");
    const lock = this.button(600, 510, "定住", () => {
      const distance = Math.abs(marker.x - 600);
      scores.push(distance <= zone.width / 2 ? 100 : distance <= zone.width ? 75 : 40);
      active += 1;
      if (active < 4) {
        this.showTransientLabel(labels[active]);
        return;
      }
      lock.disableInteractive();
      const raw = Math.ceil(scores.reduce((sum, value) => sum + value, 0) / 4);
      this.resolveFoundationBreakthrough(raw, usedPill);
    }, 250);
  }

  private showTransientLabel(label: string) {
    const flash = this.add.text(600, 225, label, { fontSize: "46px", color: "#e8ddaf" }).setOrigin(0.5);
    this.layer.add(flash);
    this.tweens.add({ targets: flash, alpha: 0, duration: 500, delay: 300, onComplete: () => flash.destroy() });
  }

  private resolveFoundationBreakthrough(rawScore: number, usedPill: boolean) {
    if (usedPill) this.player.foundationPills = Math.max(0, this.player.foundationPills - 1);
    const effective = effectiveBreakthroughScore(rawScore, usedPill);
    const band = scoreBand(effective);
    if (band === "failed") {
      this.player.level = Phaser.Math.Between(6, 8);
      this.player.cultivation = 0;
      this.saveGame();
      this.showBreakthroughResult(false, `有效分數${effective}，跌回練氣${this.player.level}層`);
      return;
    }
    const mode = usedPill ? "pill" : "bare";
    const pool = GROWTH_QUALITY_POOLS[mode][band];
    for (const attribute of ATTRIBUTES) {
      const rollQuality = Phaser.Math.Between(1, 100);
      let growth: number;
      if (rollQuality <= pool.low) growth = Phaser.Math.Between(8, 11);
      else if (rollQuality <= pool.low + pool.standard) growth = Phaser.Math.Between(12, 15);
      else growth = Phaser.Math.Between(16, 18);
      const effectiveGrowthValue = effectiveGrowth(growth, ROOT_MULTIPLIERS[this.player.root]);
      const cap = componentCapAtLevel("foundation", attribute, 1);
      this.player.foundationComponent[attribute] = Math.min(cap, effectiveGrowthValue);
      this.player.attributes[attribute] += this.player.foundationComponent[attribute];
    }
    this.player.realm = "foundation";
    this.player.level = 1;
    this.player.identity = "外門弟子";
    this.player.cultivation = 0;
    this.saveGame();
    this.showFoundationSuccess(effective);
  }

  private showFoundationSuccess(score: number) {
    this.resetLandscape();
    const cave = this.add.image(600, 337.5, "foundation-cave");
    cave.setScale(Math.max(1200 / cave.width, 675 / cave.height)).setAlpha(0.9);
    this.layer.add(cave);
    const pillar = this.add.rectangle(600, 350, 150, 560, 0xbfe9dc, 0.55);
    this.layer.add(pillar);
    this.tweens.add({ targets: pillar, alpha: 0.1, scaleX: 1.8, duration: 1200, yoyo: true });
    this.text(600, 105, "道基凝成", 48, "#e8ddaf");
    this.text(600, 175, "筑基一層", 42, "#d6b866");
    this.text(600, 420, `有效分數 ${score}\n身份晉升：外門弟子`, 24, "#f3ecd9");
    this.text(600, 500, "新外門道袍已換上", 20, "#cfe4dc");
    this.button(600, 585, "開始外門修行", () => this.showMainMenu(), 330);
  }

  private showFoundationCompleteNotice() {
    this.resetLandscape();
    this.text(600, 140, "筑基九層圓滿", 42, "#47786e");
    this.text(600, 260, "道基已臻圓滿，此階段修行告一段落。", 26);
    this.text(600, 380, "九重雷劫尚未開放，待前置內容完成後再行定案。", 21, "#58746e");
    this.button(600, 505, "返回主介面", () => this.showMainMenu(), 280);
  }

  private showFoundationLevelBreakthrough() {
    this.resetLandscape();
    const targetLevel = this.player.level + 1;
    this.text(600, 65, `突破筑基${targetLevel}層`, 38);
    this.text(600, 115, "氣機越快，定氣區域越窄", 18, "#58746e");
    const track = this.add.rectangle(600, 340, 720, 58, 0x203633, 0.96);
    const width = Math.max(66, 142 - targetLevel * 8);
    const zone = this.add.rectangle(Phaser.Math.Between(450, 750), 340, width, 58, COLORS.jade, 1);
    const marker = this.add.circle(250, 340, 21, COLORS.gold);
    this.layer.add([track, zone, marker]);
    this.tweens.add({ targets: marker, x: 950, duration: Math.max(430, 900 - targetLevel * 42), yoyo: true, repeat: -1, ease: "Sine.inOut" });
    let rounds = 0;
    let total = 0;
    const settle = this.button(600, 500, "定氣", () => {
      const distance = Math.abs(marker.x - zone.x);
      total += distance <= width / 2 ? 100 : distance <= width ? 72 : 40;
      rounds += 1;
      if (rounds < 4) return;
      settle.disableInteractive();
      this.resolveFoundationLevelBreakthrough(targetLevel, Math.ceil(total / 4));
    }, 250);
    this.text(600, 575, "有效分數低於50將跌落1～3層，屬性保留", 17, "#785954");
  }

  private resolveFoundationLevelBreakthrough(targetLevel: number, score: number) {
    if (score < 50) {
      this.player.level = Math.max(1, this.player.level - Phaser.Math.Between(1, 3));
      this.player.cultivation = 0;
      this.saveGame();
      this.showBreakthroughResult(false, `有效分數${score}，跌回筑基${this.player.level}層`);
      return;
    }
    for (const attribute of ATTRIBUTES) {
      const [min, max] = REALMS.foundation.rollRanges[targetLevel <= 3 ? 0 : targetLevel <= 6 ? 1 : 2];
      const gain = effectiveGrowth(Phaser.Math.Between(min, max), ROOT_MULTIPLIERS[this.player.root]);
      const cap = componentCapAtLevel("foundation", attribute, targetLevel);
      const before = this.player.foundationComponent[attribute];
      const after = Math.min(cap, before + gain);
      this.player.foundationComponent[attribute] = after;
      this.player.attributes[attribute] += after - before;
    }
    this.player.level = targetLevel;
    this.player.cultivation = 0;
    this.saveGame();
    this.showBreakthroughResult(true, `筑基${targetLevel}層`);
  }

  private showTribulationIntro() {
    this.reset();
    const maximumLife = Math.ceil(100 + this.player.attributes.spirit * 0.1 + this.player.attributes.bone * 0.35
      + this.player.attributes.body * 0.25 + this.player.attributes.sense * 0.05);
    const shield = Math.ceil(this.player.attributes.spirit * 0.5);
    this.text(270, 90, "九重雷劫", 46, "#75591f");
    this.text(270, 180, "雷劫之間不會恢復生命與護盾", 20);
    this.text(270, 245, `最大生命 ${maximumLife}　靈氣護盾 ${shield}`, 23, "#58746e");
    this.text(270, 340, "閃避：完全免傷\n彈反：抓住短暫時機\n護盾：以容量承受傷害", 22);
    this.text(270, 500, "雷落前鏡頭拉遠提示，出手時快速推近。\n命中與彈反會有短停、回彈與速度線。", 19, "#6c6250");
    this.button(270, 690, "開始渡劫", () => this.playTribulation(maximumLife, shield), 280);
    this.button(270, 790, "返回準備", () => this.showMainMenu(), 250);
  }

  private playTribulation(maximumLife: number, initialShield: number) {
    this.reset();
    let life = maximumLife;
    let shield = initialShield;
    let tribulation = 1;
    const world = this.add.container(270, 475);
    const sky = this.add.rectangle(0, 0, 540, 950, 0x172a36, 1);
    const ground = this.add.ellipse(0, 270, 470, 115, 0x30443f, 1);
    const avatar = this.add.circle(0, 205, 34, 0xe9e5d7).setStrokeStyle(4, 0x172824);
    world.add([sky, ground, avatar]);
    this.layer.add(world);
    const title = this.text(270, 48, "第1劫", 35, "#eee5bf");
    const status = this.text(270, 95, "", 19, "#d7e8e2");
    const laneXs = [125, 270, 415];
    let targetLane = 1;
    let resolving = false;
    let reactionStart = 0;
    let pendingStrike: Phaser.Time.TimerEvent | undefined;
    let telegraph: Phaser.GameObjects.Arc | undefined;
    const refresh = () => status.setText(`生命 ${life}/${maximumLife}　護盾 ${shield}/${initialShield}`);
    const speedBurst = (success: boolean) => {
      this.tweens.add({ targets: world, scale: success ? 1.035 : 1.075, duration: 90, yoyo: true, ease: "Quad.out" });
      if (!success) this.cameras.main.shake(110, 0.006);
    };
    const next = () => {
      if (life <= 0) {
        this.player.level = Phaser.Math.Between(6, 8);
        this.player.cultivation = 0;
        this.saveGame();
        this.showBreakthroughResult(false, `渡劫失敗，跌回筑基${this.player.level}層`);
        return;
      }
      if (tribulation > 9) {
        this.showDemoEnding();
        return;
      }
      resolving = false;
      targetLane = Phaser.Math.Between(0, 2);
      title.setText(`第${tribulation}劫`);
      telegraph?.destroy();
      telegraph = this.add.circle(laneXs[targetLane], 680, 58, 0xe4d783, 0.18).setStrokeStyle(5, 0xf0d876, 0.8);
      this.layer.add(telegraph);
      world.setScale(0.965);
      this.tweens.add({ targets: world, scale: 1, duration: 260, ease: "Quad.out" });
      reactionStart = performance.now();
      pendingStrike = this.time.delayedCall(Math.max(520, 980 - tribulation * 42), () => resolve("hit"));
    };
    const resolve = (action: "dodge" | "parry" | "shield" | "hit") => {
      if (resolving) return;
      resolving = true;
      pendingStrike?.remove(false);
      pendingStrike = undefined;
      const elapsed = performance.now() - reactionStart;
      const baseDamage = tribulation <= 3 ? Phaser.Math.Between(40, 60) : tribulation <= 6 ? Phaser.Math.Between(70, 110) : Phaser.Math.Between(130, 180);
      const parryWindow = tribulation <= 3 ? 350 : tribulation <= 6 ? 250 : 180;
      const success = action === "dodge" || (action === "parry" && elapsed >= 260 && elapsed <= 260 + parryWindow);
      if (!success) {
        let damage = Math.ceil(baseDamage * (1 - Math.min(0.5, this.player.attributes.body / REALMS.foundation.componentCaps.body * 0.5)));
        if (action === "shield" && shield > 0) {
          const absorbed = Math.min(shield, damage);
          shield -= absorbed;
          damage -= absorbed;
        }
        life = Math.max(0, life - damage);
      }
      telegraph?.destroy();
      speedBurst(success);
      refresh();
      tribulation += 1;
      this.time.delayedCall(success ? 280 : 430, next);
    };
    this.button(105, 850, "閃避", () => resolve("dodge"), 145);
    this.button(270, 850, "彈反", () => resolve("parry"), 145);
    this.button(435, 850, "護盾", () => resolve("shield"), 145);
    refresh();
    next();
  }

  private showDemoEnding() {
    this.reset();
    this.text(270, 155, "九劫已渡", 50, "#9b762c");
    this.text(270, 270, "金丹之門，就在眼前。", 27);
    this.text(270, 455, "新的劫數正在天外凝聚", 22, "#58746e");
    this.text(270, 555, "COMING SOON", 32, "#9b762c");
    this.button(270, 760, "返回", () => this.showMainMenu(), 240);
  }
}

