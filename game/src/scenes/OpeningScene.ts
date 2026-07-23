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
import { CircularChargeGauge } from "../minigames/shared/CircularChargeGauge";
import { ComboCounter } from "../minigames/shared/ComboCounter";
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
  gameProficiency: Record<string, number>;
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
  private titleNoticeOverlay?: Phaser.GameObjects.Container;
  private activeGameplayPause?: () => void;
  private activeGameplayResume?: () => void;
  private selectedGender?: Gender;
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
    gameProficiency: {},
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
    this.load.image("game-logo", "assets/ui/title/approved-2026-07-23/jiujie-wenxian-logo-v3.png");
    this.load.image("title-traveler", "assets/title/traveler-v1.png");
    this.load.image("question-stone-scene", "assets/scenes/question-stone-dormant-v1.png");
    this.load.image("question-stone-landscape-bg", "assets/scenes/question-stone-registration-square-centered-v2.png");
    this.load.image("question-stone-inscription", "assets/vfx/question-stone-inscription-exact-v1.png");
    this.load.image("question-stone-golden-burst", "assets/vfx/question-stone/single-root-golden-burst-v1.png");
    this.load.image("question-stone-golden-mist", "assets/vfx/question-stone/single-root-golden-mist-v1.png");
    this.load.image("bamboo-minigame-bg", "assets/scenes/bamboo-minigame-morning-v1.png");
    this.load.image("heart-manual-bg", "assets/scenes/heart-manual-room-landscape-v1.png");
    this.load.image("player-bamboo-male", "assets/characters/player-male-v2.png");
    this.load.image("player-bamboo-female", "assets/characters/player-female-v3.png");
    this.load.image("player-bamboo-male-chop-1", "assets/characters/bamboo-actions/player-male-axe-chop-frame-1-v1.png");
    this.load.image("player-bamboo-male-chop-2", "assets/characters/bamboo-actions/player-male-axe-chop-frame-2-v1.png");
    this.load.image("player-bamboo-male-chop-3", "assets/characters/bamboo-actions/player-male-axe-chop-frame-3-v1.png");
    this.load.image("player-bamboo-male-chop-4", "assets/characters/bamboo-actions/player-male-axe-chop-frame-4-v1.png");
    this.load.image("player-bamboo-male-chop-5", "assets/characters/bamboo-actions/player-male-axe-chop-frame-5-v1.png");
    this.load.image("player-bamboo-female-chop-1", "assets/characters/bamboo-actions/player-female-axe-chop-frame-1-v1.png");
    this.load.image("player-bamboo-female-chop-2", "assets/characters/bamboo-actions/player-female-axe-chop-frame-2-v1.png");
    this.load.image("player-bamboo-female-chop-3", "assets/characters/bamboo-actions/player-female-axe-chop-frame-3-v1.png");
    this.load.image("player-bamboo-female-chop-4", "assets/characters/bamboo-actions/player-female-axe-chop-frame-4-v1.png");
    this.load.image("player-bamboo-female-chop-5", "assets/characters/bamboo-actions/player-female-axe-chop-frame-5-v1.png");
    this.load.image("bamboo-axe-impact", "assets/vfx/bamboo/bamboo-axe-impact-v1.png");
    this.load.image("bamboo-combo-calligraphy", "assets/ui/bamboo/combo-calligraphy-gold-v1.png");
    this.load.image("bamboo-combo-ink-backing", "assets/ui/bamboo/combo-ink-backing-v1.png");
    this.load.image("character-selection-bg", "assets/scenes/character-selection-presect-registration-morning-v1.png");
    this.load.image("question-stone-neutral", "assets/scenes/question-stone-isolated-neutral-v2.png");
    this.load.image("question-stone-hand", "assets/ui/question-stone/hand-contact-base-v1.png");
    this.load.image("sect-courtyard", "assets/scenes/sect-courtyard-v1.png");
    this.load.image("foundation-cave", "assets/scenes/foundation-cave-v1.png");
    this.load.image("chore-office-story-card", "assets/scenes/chore-office-registration-chibi-v3.png");
    this.load.image("sect-elder", "assets/characters/sect-elder-v1.png");
    this.load.image("sect-elder-portrait", "assets/characters/portraits/sect-elder-serious-1024-v1.png");
    this.load.image("outer-sect-steward", "assets/characters/outer-sect-steward-v1.png");
    this.load.image("outer-sect-steward-portrait", "assets/characters/portraits/outer-sect-steward-closeup-1024-v2.png");
    this.load.image("xuan-dialogue-panel", "assets/ui/dialogue/xuan-dialogue-panel-v1.png");
    this.load.image("title-mist-1", "assets/vfx/kenney-particle-pack/mist-01.png");
    this.load.image("title-mist-2", "assets/vfx/kenney-particle-pack/mist-02.png");
    this.load.image("title-ink-underlay", "assets/ui/title/icon-ink-ripple-underlay-v1.png");
    this.load.image("shared-result-panel", "assets/ui/results/shared-result-panel-v1.png");
    this.load.image("title-icon-settings", "assets/ui/title/approved-2026-07-23/settings-object-icon-v1.png");
    this.load.image("title-icon-training-record", "assets/ui/title/approved-2026-07-23/cultivation-log-object-icon-v1.png");
    this.load.image("title-icon-achievement", "assets/ui/title/approved-2026-07-23/achievement-object-icon-v1.png");
    this.load.image("title-text-continue", "assets/ui/title/title-text-continue-cultivation-v1.png");
    this.load.image("title-text-begin", "assets/ui/title/title-text-begin-journey-white-v1.png");
    this.load.image("hud-icon-backpack", "assets/ui/hud/backpack-ink-v2.png");
    this.load.image("title-primary-button-paper", "assets/ui/title/primary-button-paper-v1.png");
    this.load.image("title-settings-panel", "assets/ui/title/settings-panel-simple-v2.png");
    this.load.image("s01-gender-strip", "assets/ui/s01/character-gender-choice-strip-v1.png");
    this.load.image("s01-selection-confirm", "assets/ui/s01/character-selection-confirm-button-v1.png");
    this.load.image("s01-info-frame", "assets/ui/s01/character-selection-info-gold-frame-v1.png");
    this.load.image("s01-name-frame", "assets/ui/s01/name-entry-registry-gold-frame-v1.png");
    this.load.image("s01-gold-button-frame", "assets/ui/s01/generic-gold-button-frame-v1.png");
    this.load.image("shared-gold-circle", "assets/ui/shared-controls/gold-double-circle-plain-v1.png");
    this.load.image("shared-back-arrow", "assets/ui/shared-controls/back-arrow-ivory-gold-v1.png");
    this.load.image("shared-settings-gear", "assets/ui/shared-controls/settings-gear-arrow-style-center-cutout-v3.png");
    this.load.audio("daily-music-1", "assets/audio/music/daily-01.mp3");
    this.load.audio("daily-music-2", "assets/audio/music/daily-02.mp3");
    this.load.audio("daily-music-3", "assets/audio/music/daily-03.mp3");
    this.load.audio("menu-music", "assets/audio/music/menu.mp3");
    this.load.audio("game-start-music", "assets/audio/music/game-start.mp3");
    this.load.audio("bamboo-axe-swing-sfx", "assets/audio/sfx/bamboo/axe-swing-v1.ogg");
    this.load.audio("bamboo-axe-hit-sfx", "assets/audio/sfx/bamboo/axe-hit-bamboo-v1.ogg");
    this.load.audio("bamboo-axe-perfect-sfx", "assets/audio/sfx/bamboo/axe-hit-perfect-v1.ogg");
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
    this.titleNoticeOverlay = undefined;
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

  private dialogueNameRuleWidth(name: string, fontSize = 19) {
    return (Array.from(name).length + 1) * fontSize;
  }

  private dialogueLineText(value: string) {
    return `　　${value}`;
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
      this.activeGameplayResume?.();
      return;
    }
    this.activeGameplayPause?.();
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
    shade.fillGradientStyle(0xf8f3e8, 0xf8f3e8, 0xf8f3e8, 0xf8f3e8, 0.1, 0.04, 0, 0)
      .fillRect(0, 0, 1200, 290);
    shade.fillGradientStyle(0x102321, 0x102321, 0x102321, 0x102321, 0, 0, 0.28, 0.28)
      .fillRect(0, 540, 1200, 135);
    this.layer.add(shade);
    this.animateTitleEnvironment();
    const save = this.readSave();
    const logo = this.add.image(254, 143, "game-logo")
      .setDisplaySize(374, 135)
      .setBlendMode(Phaser.BlendModes.MULTIPLY)
      .setAlpha(0.96);
    this.layer.add(logo);
    const buttonX = 944;
    this.titlePrimaryButton(buttonX, 388, "繼續修行", () => {
      if (!save) {
        this.showTitleNotice("尚無修行紀錄");
        return;
      }
        this.player = save.player;
        this.startDailyMusic();
        this.resumeFromSave();
    }, "paper", !save);
    this.titlePrimaryButton(buttonX, 468, "踏入仙途", () => this.startNewGame(), "ink");
    this.titleFeatureButton(950, 78, "title-icon-settings", "設定", () => this.toggleTitleSettings());
    this.titleFeatureButton(1035, 78, "title-icon-training-record", "修行記錄", () => {
      if (!save) return this.showTitleNotice("尚無修行紀錄");
      this.player = save.player;
      this.showActivityHistory();
    });
    this.titleFeatureButton(1120, 78, "title-icon-achievement", "成就", () => this.showTitleNotice("尚未開放"));
    const version = this.add.text(24, 642, "版本 0.1.0", {
      fontFamily: '"Noto Serif TC", "Microsoft JhengHei", serif',
      fontSize: "14px",
      color: "#e7dec8",
    }).setAlpha(0.76);
    const exitIcon = this.add.graphics();
    exitIcon.lineStyle(1.5, 0xe7dec8, 0.82)
      .strokeRect(1028, 626, 17, 20)
      .lineBetween(1038, 636, 1052, 636)
      .lineBetween(1047, 631, 1052, 636)
      .lineBetween(1047, 641, 1052, 636);
    const exitLabel = this.add.text(1062, 636, "退出遊戲", {
      fontFamily: '"Noto Serif TC", "Microsoft JhengHei", serif',
      fontSize: "18px",
      color: "#e7dec8",
      letterSpacing: 3,
    }).setOrigin(0, 0.5);
    const exitHit = this.add.zone(1090, 636, 150, 45).setInteractive({ useHandCursor: true });
    exitHit.on("pointerover", () => exitLabel.setAlpha(0.72));
    exitHit.on("pointerout", () => exitLabel.setAlpha(1));
    exitHit.on("pointerup", () => {
      this.saveGame();
      window.close();
    });
    this.layer.add([version, exitIcon, exitLabel, exitHit]);
  }

  private titleFeatureButton(x: number, y: number, iconKey: string, label: string, action: () => void) {
    const icon = this.add.image(x, y - 19, iconKey).setDisplaySize(62, 60);
    const iconScale = icon.scaleX;
    const caption = this.add.text(x, y + 25, label, {
      fontFamily: '"Noto Serif TC", "Microsoft JhengHei", serif',
      fontSize: "15px",
      color: "#30342f",
      letterSpacing: 1,
    }).setOrigin(0.5);
    const hitArea = this.add.zone(x, y + 2, 82, 90).setInteractive({ useHandCursor: true });
    hitArea.on("pointerover", () => { icon.setScale(iconScale * 1.04); caption.setAlpha(0.72); });
    hitArea.on("pointerout", () => { icon.setScale(iconScale); caption.setAlpha(1); });
    hitArea.on("pointerdown", () => { icon.setScale(iconScale * 0.97); caption.setAlpha(0.58); });
    hitArea.on("pointerup", () => { icon.setScale(iconScale * 1.04); caption.setAlpha(0.72); action(); });
    this.layer.add([icon, caption, hitArea]);
  }

  private titlePrimaryButton(
    x: number,
    y: number,
    label: string,
    action: () => void,
    tone: "paper" | "ink",
    disabled = false,
  ) {
    const width = 270;
    const height = 64;
    const background = this.add.graphics();
    if (tone === "paper") {
      background.fillStyle(0xf4f0e6, disabled ? 0.74 : 0.94).fillRect(x - width / 2, y - height / 2, width, height);
      background.lineStyle(1.2, 0x8d816e, disabled ? 0.34 : 0.56).strokeRect(x - width / 2, y - height / 2, width, height);
      background.lineStyle(0.8, 0xb3a893, disabled ? 0.24 : 0.36)
        .strokeRect(x - width / 2 + 6, y - height / 2 + 6, width - 12, height - 12);
    } else {
      background.fillStyle(0x243638, 0.94).fillRect(x - width / 2, y - height / 2, width, height);
      background.lineStyle(1.5, 0xc4a866, 0.9).strokeRect(x - width / 2, y - height / 2, width, height);
      background.lineStyle(1, 0xd9c286, 0.34).strokeRect(x - width / 2 + 6, y - height / 2 + 6, width - 12, height - 12);
    }
    const color = tone === "paper" ? "#343c38" : "#eadfc7";
    const caption = this.add.image(x, y, label === "繼續修行" ? "title-text-continue" : "title-text-begin")
      .setDisplaySize(label === "繼續修行" ? 128 : 131, 34)
      .setAlpha(disabled ? 0.48 : 0.94);
    const leftDiamond = this.add.text(x - 88, y, "◇", {
      fontFamily: '"Noto Serif TC", serif',
      fontSize: "14px",
      color,
    }).setOrigin(0.5).setAlpha(disabled ? 0.4 : 0.72);
    const rightDiamond = this.add.text(x + 88, y, "◇", {
      fontFamily: '"Noto Serif TC", serif',
      fontSize: "14px",
      color,
    }).setOrigin(0.5).setAlpha(disabled ? 0.4 : 0.72);
    const hitArea = this.add.zone(x, y, width, height).setInteractive({ useHandCursor: true });
    hitArea.on("pointerover", () => {
      background.setAlpha(disabled ? 0.86 : 0.9);
      caption.setAlpha(disabled ? 0.7 : 0.82);
    });
    hitArea.on("pointerout", () => {
      background.setAlpha(1);
      caption.setAlpha(disabled ? 0.58 : 1);
    });
    hitArea.on("pointerup", action);
    this.layer.add([background, caption, leftDiamond, rightDiamond, hitArea]);
  }

  private showTitleNotice(message: string) {
    this.titleNoticeOverlay?.destroy(true);
    const overlay = this.add.container(0, 0).setDepth(950);
    this.titleNoticeOverlay = overlay;
    const blocker = this.add.rectangle(600, 337.5, 1200, 675, 0x0b1110, 0.34).setInteractive();
    const panel = this.add.graphics();
    panel.fillStyle(0x121b19, 0.82).fillRect(435, 264, 330, 148);
    panel.lineStyle(1.5, 0xc6ab72, 0.82).strokeRect(435, 264, 330, 148);
    panel.lineStyle(0.8, 0xd8c598, 0.32).strokeRect(443, 272, 314, 132);
    const ornament = this.add.text(600, 284, "◇", {
      fontFamily: '"Noto Serif TC", serif',
      fontSize: "17px",
      color: "#d4bc84",
    }).setOrigin(0.5);
    const label = this.add.text(600, 328, message, {
      fontFamily: '"Noto Serif TC", "Microsoft JhengHei", serif',
      fontSize: "23px",
      color: "#eee2c7",
      letterSpacing: 2,
    }).setOrigin(0.5);
    const dismiss = this.add.text(600, 376, "知曉", {
      fontFamily: '"Noto Serif TC", "Microsoft JhengHei", serif',
      fontSize: "17px",
      color: "#c9ae76",
      letterSpacing: 3,
    }).setOrigin(0.5);
    const dismissHit = this.add.zone(600, 376, 120, 40).setInteractive({ useHandCursor: true });
    const close = () => {
      overlay.destroy(true);
      if (this.titleNoticeOverlay === overlay) this.titleNoticeOverlay = undefined;
    };
    blocker.on("pointerup", close);
    dismissHit.on("pointerover", () => dismiss.setColor("#f0d79d"));
    dismissHit.on("pointerout", () => dismiss.setColor("#c9ae76"));
    dismissHit.on("pointerup", close);
    overlay.add([blocker, panel, ornament, label, dismiss, dismissHit]);
    this.layer.add(overlay);
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
      gameProficiency: {},
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
      data.player.gameProficiency ??= {};
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
    this.layer.add(scene);

    this.selectionCornerControl("back");
    this.selectionCornerControl("settings");

    const title = this.add.text(600, 44, "選擇角色", {
      fontFamily: '"Noto Serif TC", "Microsoft JhengHei", serif',
      fontSize: "39px",
      color: "#273937",
      letterSpacing: 5,
    }).setOrigin(0.5);
    const divider = this.add.graphics();
    divider.lineStyle(1, 0x5c6964, 0.46)
      .lineBetween(452, 88, 585, 88)
      .lineBetween(615, 88, 748, 88);
    const diamond = this.add.text(600, 88, "◇", {
      fontFamily: '"Noto Serif TC", serif',
      fontSize: "20px",
      color: "#52615d",
    }).setOrigin(0.5);
    this.layer.add([title, divider, diamond]);

    const hintBacking = this.add.graphics();
    hintBacking.fillStyle(0x101715, 0.48).fillPoints([
      new Phaser.Geom.Point(28, 324),
      new Phaser.Geom.Point(42, 274),
      new Phaser.Geom.Point(101, 274),
      new Phaser.Geom.Point(115, 286),
      new Phaser.Geom.Point(129, 274),
      new Phaser.Geom.Point(188, 274),
      new Phaser.Geom.Point(202, 324),
      new Phaser.Geom.Point(188, 378),
      new Phaser.Geom.Point(42, 378),
    ], true);
    const hintFrame = this.add.image(115, 324, "s01-info-frame").setDisplaySize(190, 140);
    const hintTitle = this.add.text(115, 292, "修行提示", {
      fontFamily: '"Noto Serif TC", "Microsoft JhengHei", serif',
      fontSize: "15px",
      color: "#d8c49a",
      letterSpacing: 2,
    }).setOrigin(0.5);
    const hintBody = this.add.text(115, 337, "性別僅影響外觀\n不影響遊戲內容與成長", {
      fontFamily: '"Noto Serif TC", "Microsoft JhengHei", serif',
      fontSize: "14px",
      color: "#e3d8bd",
      align: "center",
      lineSpacing: 7,
    }).setOrigin(0.5);
    this.layer.add([hintBacking, hintFrame, hintTitle, hintBody]);

    this.characterCard(300, 502, "male");
    this.characterCard(900, 502, "female");

    const confirm = this.add.image(600, 625, "s01-selection-confirm").setDisplaySize(310, 138);
    const confirmLabel = this.add.text(600, 625, "確認選擇", {
      fontFamily: '"Noto Serif TC", "Microsoft JhengHei", serif',
      fontSize: "24px",
      color: "#eee3cc",
      letterSpacing: 4,
    }).setOrigin(0.5);
    const confirmHit = this.add.zone(600, 625, 260, 64).setInteractive({ useHandCursor: true });
    confirm.setAlpha(this.selectedGender ? 1 : 0.56);
    confirmLabel.setAlpha(this.selectedGender ? 1 : 0.56);
    confirmHit.on("pointerover", () => {
      confirm.setAlpha(this.selectedGender ? 0.88 : 0.64);
      confirmLabel.setAlpha(this.selectedGender ? 0.82 : 0.64);
    });
    confirmHit.on("pointerout", () => {
      confirm.setAlpha(this.selectedGender ? 1 : 0.56);
      confirmLabel.setAlpha(this.selectedGender ? 1 : 0.56);
    });
    confirmHit.on("pointerup", () => {
      if (!this.selectedGender) return;
      this.player.gender = this.selectedGender;
      this.showNameEntry();
    });
    this.layer.add([confirm, confirmLabel, confirmHit]);
  }

  private characterCard(x: number, y: number, gender: Gender) {
    const label = gender === "male" ? "男" : "女";
    const selected = this.selectedGender === gender;
    const displayY = selected ? y - 4 : y;
    const strip = this.add.image(x, displayY, "s01-gender-strip").setDisplaySize(229, 71);
    if (selected) {
      strip.setTint(0xffefc2);
    } else if (this.selectedGender) {
      strip.setAlpha(0.7);
    }
    const medallionColor = gender === "male" ? 0x426d79 : 0x9a6857;
    const medallion = this.add.circle(x - 79, displayY, 20, medallionColor, selected ? 0.98 : 0.82);
    medallion.setStrokeStyle(selected ? 3 : 1.5, 0xd8c49a, selected ? 0.94 : 0.66);
    const genderLabel = this.add.text(x - 79, displayY, label, {
      fontFamily: '"Noto Serif TC", "Microsoft JhengHei", serif',
      fontSize: "21px",
      color: "#f2e8d2",
    }).setOrigin(0.5);
    const cardDiamond = this.add.text(x - 22, displayY, selected ? "◆" : "◇", {
      fontFamily: '"Noto Serif TC", serif',
      fontSize: selected ? "20px" : "16px",
      color: selected ? "#f0cb69" : "#7a766b",
      shadow: selected ? { color: "#f4d77e", blur: 9, fill: true } : undefined,
    }).setOrigin(0.5);
    const caption = this.add.text(x + 38, displayY, "選擇此角色", {
      fontFamily: '"Noto Serif TC", "Microsoft JhengHei", serif',
      fontSize: "15px",
      color: selected ? "#765723" : "#39423e",
      letterSpacing: 1,
    }).setOrigin(0.5);
    const hitArea = this.add.zone(x, displayY, 238, 78).setInteractive({ useHandCursor: true });
    hitArea.on("pointerover", () => {
      strip.setTint(0xfff8df);
      cardDiamond.setColor("#d2a946");
      caption.setColor("#8a672f");
    });
    hitArea.on("pointerout", () => {
      strip.clearTint();
      cardDiamond.setColor(selected ? "#f0cb69" : "#7a766b");
      caption.setColor(selected ? "#765723" : "#39423e");
    });
    hitArea.on("pointerup", () => {
      this.selectedGender = gender;
      this.showGenderChoice();
    });
    if (selected) {
      this.tweens.add({
        targets: cardDiamond,
        alpha: { from: 0.62, to: 1 },
        scaleX: { from: 0.92, to: 1.12 },
        scaleY: { from: 0.92, to: 1.12 },
        duration: 760,
        yoyo: true,
        repeat: -1,
        ease: "Sine.inOut",
      });
    }
    this.layer.add([strip, medallion, genderLabel, cardDiamond, caption, hitArea]);
  }

  private selectionCornerControl(kind: "back" | "settings", backAction?: () => void, settingsAction?: () => void) {
    const isBack = kind === "back";
    const x = isBack ? 107 : 1091;
    const backingX = isBack ? 99 : 1101;
    const backing = this.add.rectangle(backingX, 42, 155, 58, 0x0d1413, 0.34);
    const symbol = this.add.image(x, 42, isBack ? "shared-back-arrow" : "shared-settings-gear")
      .setDisplaySize(isBack ? 19 : 31, isBack ? 38 : 31);
    const caption = this.add.text(isBack ? 167 : 1169, 42, isBack ? "返回" : "設定", {
      fontFamily: '"Noto Serif TC", "Microsoft JhengHei", serif',
      fontSize: "19px",
      color: "#eadfc6",
      letterSpacing: 2,
    }).setOrigin(1, 0.5);
    const hitArea = this.add.zone(backingX, 42, 155, 58).setInteractive({ useHandCursor: true });
    hitArea.on("pointerover", () => {
      symbol.setAlpha(0.76);
      caption.setAlpha(0.76);
    });
    hitArea.on("pointerout", () => {
      symbol.setAlpha(1);
      caption.setAlpha(1);
    });
    hitArea.on("pointerup", () => {
      if (isBack) {
        if (backAction) {
          backAction();
        } else {
          this.selectedGender = undefined;
          this.showTitle();
        }
      } else {
        if (settingsAction) settingsAction();
        else this.toggleTitleSettings();
      }
    });
    this.layer.add([backing, symbol, caption, hitArea]);
  }

  private showNameEntry() {
    this.resetLandscape();
    const scene = this.add.image(600, 337.5, "character-selection-bg").setDisplaySize(1200, 675);
    const blocker = this.add.rectangle(600, 337.5, 1200, 675, 0x101816, 0.48).setInteractive();
    const paperBacking = this.add.rectangle(600, 342, 424, 392, 0xeee4d2, 0.97);
    const panel = this.add.image(600, 342, "s01-name-frame").setDisplaySize(510, 510);
    this.layer.add([scene, blocker, paperBacking, panel]);
    this.selectionCornerControl("back", () => this.showGenderChoice());
    this.selectionCornerControl("settings");

    const title = this.add.text(600, 213, "記入宗門名冊", {
      fontFamily: '"Noto Serif TC", "Microsoft JhengHei", serif',
      fontSize: "27px",
      color: "#343c38",
      letterSpacing: 3,
    }).setOrigin(0.5);
    const instruction = this.add.text(600, 253, "此名將記入宗門名冊，確認後仍可於設定中修改", {
      fontFamily: '"Noto Serif TC", "Microsoft JhengHei", serif',
      fontSize: "14px",
      color: "#706a5c",
    }).setOrigin(0.5);
    this.layer.add([title, instruction]);
    const suggestedName = this.player.gender === "male" ? "沈青川" : "蘇晚晴";
    const dom = this.add.dom(600, 389).createFromHTML(`
      <div class="name-entry name-entry-v2">
        <input aria-label="角色姓名" maxlength="8" value="${suggestedName}" autocomplete="off" />
        <div class="name-count" aria-live="polite">${Array.from(suggestedName).length} / 8</div>
        <div class="error" aria-live="polite"></div>
        <button class="name-entry-confirm" type="button" data-action="confirm">確認姓名</button>
      </div>
    `);
    this.layer.add(dom);
    dom.addListener("click input");
    dom.on("input", () => {
      const input = dom.getChildByProperty("tagName", "INPUT") as HTMLInputElement | null;
      const count = dom.getChildByProperty("className", "name-count") as HTMLDivElement | null;
      const error = dom.getChildByProperty("className", "error") as HTMLDivElement | null;
      if (count) count.textContent = `${Array.from(input?.value ?? "").length} / 8`;
      if (error) error.textContent = "";
    });
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
      const length = Array.from(name).length;
      if (length < 2 || length > 8) {
        if (error) error.textContent = "姓名需為 2～8 個字";
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
    const goldenBurst = this.add.image(600, 326, "question-stone-golden-burst")
      .setScale(0.1)
      .setBlendMode(Phaser.BlendModes.SCREEN)
      .setAlpha(0);
    const goldenMist = this.add.image(600, 337.5, "question-stone-golden-mist")
      .setDisplaySize(1200, 675)
      .setBlendMode(Phaser.BlendModes.SCREEN)
      .setAlpha(0);
    const contactHand = this.add.image(600, 370, "question-stone-hand")
      .setDisplaySize(54, 79)
      .setOrigin(0.5, 0.78)
      .setAlpha(0);
    this.layer.add([scene, shade, goldenBurst, contactHand, goldenMist]);

    const stoneZone = this.add.zone(600, 326, 170, 270);
    this.layer.add(stoneZone);

    const dialogue = this.add.container(0, 0).setAlpha(0);
    const dialoguePanel = this.add.image(600, 568, "xuan-dialogue-panel").setDisplaySize(860, 166);
    const nameplate = this.add.text(226, 516, "宗門老執事", {
      fontFamily: '"Noto Serif TC", serif', fontSize: "19px", color: "#72552f",
    });
    const nameRule = this.add.rectangle(226, 546, this.dialogueNameRuleWidth(nameplate.text), 1, 0x8d7655, 0.68).setOrigin(0, 0.5);
    const instruction = this.add.text(226, 558, "", {
      fontFamily: '"Noto Serif TC", serif',
      fontSize: "22px",
      color: "#20312e",
      wordWrap: { width: 520 },
      lineSpacing: 9,
    });
    const nextLineHint = this.add.text(958, 611, "（下一句……）", {
      fontFamily: '"Noto Serif TC", serif',
      fontSize: "15px",
      color: "#806a49",
    }).setOrigin(1, 0.5).setAlpha(0);
    const elderPortrait = this.add.image(992, 586, "sect-elder-portrait")
      .setDisplaySize(205, 205)
      .setOrigin(1, 1);
    const dialogueHit = this.add.zone(600, 568, 860, 166).setInteractive({ useHandCursor: true });
    dialogue.add([dialoguePanel, nameplate, nameRule, instruction, elderPortrait, nextLineHint, dialogueHit]);
    this.layer.add(dialogue);

    stoneZone.disableInteractive();
    const lines = ["此石名曰問仙。", "可照靈根，亦可辨仙緣。", "願入宗者，皆須一問！", "將手放上去。"]
      .map((value) => this.dialogueLineText(value));
    let lineIndex = 0;
    let typingEvent: Phaser.Time.TimerEvent | undefined;
    let lineComplete = false;
    const finishDialogue = () => {
      dialogueHit.disableInteractive();
      this.tweens.add({ targets: dialogue, alpha: 0, duration: 300, onComplete: () => {
          stoneZone.setInteractive({ cursor: "none" });
        }});
    };
    const typeLine = () => {
      const characters = Array.from(lines[lineIndex]);
      let visible = 0;
      lineComplete = false;
      nextLineHint.setAlpha(0);
      instruction.setText("").setAlpha(1);
      typingEvent?.remove(false);
      typingEvent = this.time.addEvent({
        delay: 110,
        repeat: characters.length - 1,
        callback: () => {
          visible += 1;
          instruction.setText(characters.slice(0, visible).join(""));
          if (visible >= characters.length) {
            lineComplete = true;
            nextLineHint.setAlpha(1);
          }
        },
      });
    };
    dialogueHit.on("pointerup", () => {
      if (!lineComplete) {
        typingEvent?.remove(false);
        instruction.setText(lines[lineIndex]);
        lineComplete = true;
        nextLineHint.setAlpha(1);
        return;
      }
      lineIndex += 1;
      if (lineIndex >= lines.length) {
        finishDialogue();
        return;
      }
      typeLine();
    });
    this.tweens.add({
      targets: dialogue,
      alpha: 1,
      duration: 320,
      delay: 500,
      onComplete: typeLine,
    });

    let holdTween: Phaser.Tweens.Tween | undefined;
    let completed = false;
    const cancelHold = (hideHand = true) => {
      if (completed) return;
      holdTween?.stop();
      holdTween = undefined;
      contactHand.clearTint();
      if (hideHand) this.tweens.add({ targets: contactHand, alpha: 0, duration: 160 });
      this.tweens.add({ targets: goldenBurst, alpha: 0, scaleX: 0.1, scaleY: 0.1, duration: 220 });
    };
    const completeHold = () => {
      completed = true;
      contactHand.setAlpha(1);
      goldenBurst.setAlpha(0.32).setScale(0.14);
      this.tweens.add({
        targets: goldenBurst,
        alpha: 1,
        scaleX: 1.05,
        scaleY: 1.05,
        angle: 6,
        duration: 920,
        ease: "Cubic.out",
      });
      this.time.delayedCall(420, () => {
        this.cameras.main.flash(360, 255, 232, 176, false);
        this.tweens.add({
          targets: goldenMist,
          alpha: 1,
          duration: 720,
          ease: "Sine.inOut",
        });
      });
      this.time.delayedCall(1650, () => this.revealAptitude());
    };
    stoneZone.on("pointerdown", () => {
      if (completed) return;
      contactHand.setAlpha(1);
      const meter = { value: 0 };
      holdTween = this.tweens.add({ targets: meter, value: 1, duration: 1650, onUpdate: () => {
        contactHand.setTint(Phaser.Display.Color.GetColor(255, 245 - Math.round(meter.value * 8), 214));
        goldenBurst.setAlpha(0.03 + meter.value * 0.24);
        goldenBurst.setScale(0.1 + meter.value * 0.04);
      }, onComplete: completeHold });
    });
    stoneZone.on("pointerover", () => {
      if (!completed) contactHand.setAlpha(1);
    });
    stoneZone.on("pointerup", () => {
      contactHand.setAlpha(0);
      cancelHold(true);
    });
    stoneZone.on("pointerout", () => cancelHold(true));
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
    const inscription = this.add.image(600, 307, "question-stone-inscription")
      .setDisplaySize(58, 132).setTint(0xffe7ae).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.86);
    this.layer.add([scene, shade, inscription]);
    const readableText = (x: number, y: number, value: string, size: number, color: string) => {
      const label = this.add.text(x, y, value, {
        fontFamily: '"Noto Serif TC", "Microsoft JhengHei", serif',
        fontSize: `${size}px`,
        color,
        align: "center",
        wordWrap: { width: 820 },
        shadow: { color: "#16211e", blur: 3, fill: true, offsetX: 0, offsetY: 1 },
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
    const panel = this.add.image(600, 568, "xuan-dialogue-panel").setDisplaySize(860, 166);
    const name = this.add.text(226, 516, "宗門老執事", {
      fontFamily: '"Noto Serif TC", serif', fontSize: "19px", color: "#72552f",
    });
    const nameRule = this.add.rectangle(
      226,
      546,
      this.dialogueNameRuleWidth(name.text),
      1,
      0x8d7655,
      0.68,
    ).setOrigin(0, 0.5);
    const line = this.add.text(226, 558, "", {
      fontFamily: '"Noto Serif TC", serif', fontSize: "22px", color: "#20312e",
      wordWrap: { width: 520 },
      lineSpacing: 9,
    });
    const portrait = this.add.image(992, 586, "sect-elder-portrait")
      .setDisplaySize(205, 205)
      .setOrigin(1, 1);
    const nextLineHint = this.add.text(958, 611, "（下一句……）", {
      fontFamily: '"Noto Serif TC", serif',
      fontSize: "15px",
      color: "#806a49",
    }).setOrigin(1, 0.5).setAlpha(0);
    const dialogueHit = this.add.zone(600, 568, 860, 166).setInteractive({ useHandCursor: true });
    dialogue.add([panel, name, nameRule, line, portrait, nextLineHint, dialogueHit]);
    this.layer.add(dialogue);
    const destination = this.add.text(600, 565, "前往雜役處", {
      fontFamily: '"Noto Serif TC", "Microsoft JhengHei", serif',
      fontSize: "27px",
      color: "#f3e8ce",
    }).setOrigin(0.5).setAlpha(0).setInteractive({ useHandCursor: true });
    destination.on("pointerup", () => this.showChoreOfficeSceneCard());
    this.layer.add(destination);

    const elderLines = [
      "有靈根，先去雜役處報到。",
      "想引氣入體，得先積累足夠修為，先去領功法吧！",
    ].map((value) => this.dialogueLineText(value));
    let elderLineIndex = 0;
    let elderTypingEvent: Phaser.Time.TimerEvent | undefined;
    let elderLineComplete = false;
    const typeElderLine = () => {
      const characters = Array.from(elderLines[elderLineIndex]);
      let visible = 0;
      elderLineComplete = false;
      nextLineHint.setAlpha(0);
      line.setText("");
      elderTypingEvent?.remove(false);
      elderTypingEvent = this.time.addEvent({
        delay: 110,
        repeat: characters.length - 1,
        callback: () => {
          visible += 1;
          line.setText(characters.slice(0, visible).join(""));
          if (visible >= characters.length) {
            elderLineComplete = true;
            nextLineHint.setAlpha(1);
          }
        },
      });
    };
    dialogueHit.on("pointerup", () => {
      if (!elderLineComplete) {
        elderTypingEvent?.remove(false);
        line.setText(elderLines[elderLineIndex]);
        elderLineComplete = true;
        nextLineHint.setAlpha(1);
        return;
      }
      elderLineIndex += 1;
      if (elderLineIndex < elderLines.length) {
        typeElderLine();
        return;
      }
      dialogueHit.disableInteractive();
      nextLineHint.setAlpha(0);
      this.tweens.add({
        targets: dialogue,
        alpha: 0,
        duration: 420,
        onComplete: () => {
          this.tweens.add({ targets: destination, alpha: 1, y: { from: 575, to: 565 }, duration: 620 });
        },
      });
    });

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
              this.tweens.add({ targets: dialogue, alpha: 1, duration: 520, delay: 360, onComplete: typeElderLine });
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
    const titleShade = this.add.rectangle(600, 337.5, 1200, 675, 0x0d1715, 0.16);
    const title = this.add.text(600, 338, "雜役處", {
      fontFamily: '"Noto Serif TC", serif',
      fontSize: "44px",
      color: "#f1e7ce",
      letterSpacing: 12,
    }).setOrigin(0.5).setAlpha(0);
    this.layer.add([scene, titleShade, title]);
    this.tweens.add({
      targets: title,
      alpha: 1,
      duration: 1100,
      ease: "Sine.inOut",
      onComplete: () => this.time.delayedCall(900, () => this.tweens.add({
        targets: [title, titleShade],
        alpha: 0,
        duration: 1000,
        ease: "Sine.inOut",
        onComplete: () => this.showChoreOfficeReceipt(),
      })),
    });
  }

  private showChoreOfficeReceipt() {
    this.resetLandscape();
    const scene = this.add.image(600, 337.5, "chore-office-story-card");
    scene.setScale(Math.max(1200 / scene.width, 675 / scene.height));
    const dialogue = this.add.container(0, 0).setAlpha(0);
    const dialoguePanel = this.add.image(600, 568, "xuan-dialogue-panel").setDisplaySize(860, 166);
    const nameplate = this.add.text(226, 516, "雜役處執事", {
      fontFamily: '"Noto Serif TC", serif', fontSize: "19px", color: "#72552f",
    });
    const nameRule = this.add.rectangle(226, 546, this.dialogueNameRuleWidth(nameplate.text), 1, 0x8d7655, 0.68).setOrigin(0, 0.5);
    const line = this.add.text(226, 558, "", {
      fontFamily: '"Noto Serif TC", serif',
      fontSize: "22px",
      color: "#20312e",
      wordWrap: { width: 520 },
      lineSpacing: 9,
    });
    const nextLineHint = this.add.text(958, 611, "（下一句……）", {
      fontFamily: '"Noto Serif TC", serif',
      fontSize: "15px",
      color: "#806a49",
    }).setOrigin(1, 0.5).setAlpha(0);
    const steward = this.add.image(992, 586, "outer-sect-steward-portrait")
      .setDisplaySize(205, 205)
      .setOrigin(1, 1);
    const dialogueHit = this.add.zone(600, 568, 860, 166).setInteractive({ useHandCursor: true });
    dialogue.add([dialoguePanel, nameplate, nameRule, line, steward, nextLineHint, dialogueHit]);
    this.layer.add([scene, dialogue]);

    const lines = [
      "你就是新來的雜役弟子……？",
      "這裡有本《清心訣》。",
      "宗門人人都有，是最低階的功法。",
      "先砍竹去，空下來再自己參悟，修為夠了自然能引氣入體。",
    ].map((value) => this.dialogueLineText(value));
    let lineIndex = 0;
    let typingEvent: Phaser.Time.TimerEvent | undefined;
    let lineComplete = false;
    const typeLine = () => {
      const characters = Array.from(lines[lineIndex]);
      let visible = 0;
      lineComplete = false;
      nextLineHint.setAlpha(0);
      line.setText("");
      typingEvent?.remove(false);
      typingEvent = this.time.addEvent({
        delay: 110,
        repeat: characters.length - 1,
        callback: () => {
          visible += 1;
          line.setText(characters.slice(0, visible).join(""));
          if (visible >= characters.length) {
            lineComplete = true;
            nextLineHint.setAlpha(1);
          }
        },
      });
    };
    dialogueHit.on("pointerup", () => {
      if (!lineComplete) {
        typingEvent?.remove(false);
        line.setText(lines[lineIndex]);
        lineComplete = true;
        nextLineHint.setAlpha(1);
        return;
      }
      lineIndex += 1;
      if (lineIndex < lines.length) {
        typeLine();
        return;
      }
      dialogueHit.disableInteractive();
      nextLineHint.setAlpha(0);
      this.tweens.add({
        targets: dialogue,
        alpha: 0,
        duration: 520,
        onComplete: () => {
          this.startDailyMusic();
          this.playBambooTask();
        },
      });
    });
    this.tweens.add({
      targets: dialogue,
      alpha: 1,
      duration: 520,
      delay: 280,
      onComplete: typeLine,
    });
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
    const baseGain = Math.ceil(12 + normalizedScore * 0.36);
    const { reward: gain } = this.applyGameProficiency(task, baseGain);
    const cap = this.player.realm === "qi" ? REALMS.qi.cultivation[8] : this.cultivationTarget();
    this.player.cultivation = Math.min(cap, this.player.cultivation + gain);
    this.recordActivity(task, gain);
    this.saveGame();
    this.showTaskResult(task, gain, normalizedScore, success);
  }

  private applyGameProficiency(task: string, baseReward: number) {
    const proficiency = (this.player.gameProficiency[task] ?? 0) + 10;
    this.player.gameProficiency[task] = proficiency;
    return {
      proficiency,
      reward: Math.round(baseReward * (1 + proficiency / 100)),
    };
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
    const chopFrames = Array.from(
      { length: 5 },
      (_, index) => `player-bamboo-${this.player.gender === "male" ? "male" : "female"}-chop-${index + 1}`,
    );
    const character = this.add.image(625, 430, chopFrames[0]);
    character.setScale(Math.min(335 / character.width, 455 / character.height)).setOrigin(0.5, 0.72);
    const impactFx = this.add.image(438, 462, "bamboo-axe-impact")
      .setDisplaySize(190, 190)
      .setBlendMode(Phaser.BlendModes.SCREEN)
      .setAlpha(0);
    const effectLayer = this.add.graphics();
    const ringLayer = this.add.graphics();
    const timeBar = this.add.graphics();
    const hudPaper = this.add.graphics();
    hudPaper.fillStyle(0xeee6d4, 0.92).fillRoundedRect(38, 150, 238, 164, 6);
    hudPaper.lineStyle(1, 0x75654f, 0.55).strokeRoundedRect(38, 150, 238, 164, 6);
    hudPaper.fillStyle(0x111a18, 0.72).fillRoundedRect(38, 326, 238, 126, 5);
    this.layer.add([background, atmosphere, character, impactFx, effectLayer, ringLayer, timeBar, hudPaper]);
    this.tweens.add({ targets: atmosphere, x: 660, alpha: 0.13, duration: 6200, yoyo: true, repeat: -1 });

    const controller = new BambooGameController();
    const targetX = 438;
    const targetY = 462;
    const chargeGauge = new CircularChargeGauge(this, this.layer, {
      x: targetX,
      y: targetY,
      radius: BAMBOO_GAME_CONFIG.targetRadius,
      resetDurationMs: BAMBOO_GAME_CONFIG.nextRoundDelayMs,
    });
    const inputZone = this.add.zone(600, 337.5, 1200, 675).setInteractive({ useHandCursor: true });
    this.layer.add(inputZone);

    const timeLabel = this.text(600, 66, "3", 28, "#f1ead7");
    const countdownBacking = this.add.rectangle(600, 66, 400, 44, 0x0d1513, 0.76);
    this.layer.addAt(countdownBacking, Math.max(0, this.layer.getIndex(timeLabel) - 1));
    const comboInk = this.add.image(1050, 158, "bamboo-combo-ink-backing")
      .setDisplaySize(257, 90)
      .setAlpha(0);
    const comboTitle = this.add.image(1050, 158, "bamboo-combo-calligraphy")
      .setDisplaySize(97, 45)
      .setAlpha(0);
    this.layer.add([comboInk, comboTitle]);
    const comboCounter = new ComboCounter(this, this.layer, 1050, 232);
    comboCounter.setCombo(0);
    this.text(157, 181, `砍竹（熟練度：${this.player.gameProficiency["砍竹"] ?? 0}%）`, 22, "#27322d");
    const progressLabel = this.text(157, 250, `修為 +30\n竹子數量：0/${BAMBOO_GAME_CONFIG.goalCount}\n今日剩餘修行次數：${Math.max(0, 2 - this.player.timeSlot)}`, 18, "#2d352f");
    progressLabel.setLineSpacing(7);
    const realmText = this.player.realm === "uninitiated"
      ? this.player.identity
      : `${this.player.identity}　${this.player.realm === "qi" ? `練氣${this.player.level}層` : `筑基${this.player.level}層`}`;
    const cultivationStatus = this.text(
      157,
      385,
      `${realmText}\n當前修為\n${this.player.cultivation}/${this.cultivationTarget()}`,
      18,
      "#eee3ca",
    );
    cultivationStatus.setLineSpacing(8);
    const guideBacking = this.add.rectangle(600, 630, 680, 46, 0x0d1513, 0.68);
    const guide = this.text(600, 630, "在光圈填滿之時落斧。", 20, "#f4ead2");
    this.layer.addAt(guideBacking, Math.max(0, this.layer.getIndex(guide) - 1));
    const judgementLabel = this.text(targetX, targetY - 115, "", 30, "#e9ca74").setAlpha(0);

    const finishEarly = this.text(1070, 605, "收式", 23, "#2f3b35").setInteractive({ useHandCursor: true });
    const modal = this.add.container(0, 0).setDepth(80).setVisible(false);
    this.layer.add(modal);

    let finalized = false;
    let modalKind: "pause" | "quit" | "finish" = "pause";
    const cleanup = () => {
      this.events.off(Phaser.Scenes.Events.UPDATE, update);
      this.input.keyboard?.off("keydown-SPACE", handleInput);
      this.activeGameplayPause = undefined;
      this.activeGameplayResume = undefined;
    };
    const showResult = (rewardMode: "normal" | "minimum" | "proportional" = "normal") => {
      if (finalized) return;
      finalized = true;
      cleanup();
      inputZone.disableInteractive();
      const now = performance.now();
      const baseReward = rewardMode === "minimum"
        ? BAMBOO_GAME_CONFIG.rewardFormula.baseCultivation
        : rewardMode === "proportional"
          ? controller.earlyCultivationReward(now)
          : controller.cultivationReward();
      const { reward, proficiency } = this.applyGameProficiency("砍竹", baseReward);
      const cap = this.player.realm === "qi" ? REALMS.qi.cultivation[8] : this.cultivationTarget();
      this.player.cultivation = Math.min(cap, this.player.cultivation + reward);
      this.recordActivity("砍竹", reward);
      this.saveGame();
      this.showBambooTaskResult(controller, reward, proficiency, baseReward);
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

    this.activeGameplayPause = () => controller.pause(performance.now());
    this.activeGameplayResume = () => controller.resume(performance.now());
    this.selectionCornerControl("back", () => openModal("quit"));
    this.selectionCornerControl("settings", undefined, () => this.toggleSystemMenu());

    let chopSequenceId = 0;
    const playChopAnimation = () => {
      chopSequenceId += 1;
      const sequence = chopSequenceId;
      this.sound.play("bamboo-axe-swing-sfx", { volume: 0.42, rate: 1.2 });
      chopFrames.forEach((frame, index) => {
        this.time.delayedCall(index * 62, () => {
          if (character.active && sequence === chopSequenceId) character.setTexture(frame);
        });
      });
      this.time.delayedCall(360, () => {
        if (character.active && sequence === chopSequenceId) character.setTexture(chopFrames[0]);
      });
    };

    const displayJudgement = (judgement: BambooJudgement) => {
      judgementLabel.setText(BAMBOO_GAME_CONFIG.labels[judgement]);
      judgementLabel.setColor(judgement === "PERFECT" ? "#f0ca6a" : judgement === "MISS" ? "#d5c8b3" : "#e8dfc9");
      judgementLabel.setAlpha(1).setY(targetY - 95).setScale(judgement === "PERFECT" ? 1.12 : 1);
      this.tweens.add({ targets: judgementLabel, y: targetY - 135, alpha: 0, duration: 620, ease: "Sine.out" });
      if (judgement !== "MISS") {
        this.time.delayedCall(165, () => {
          if (!this.scene.isActive()) return;
          this.sound.play("bamboo-axe-hit-sfx", { volume: 0.58, rate: judgement === "PERFECT" ? 0.96 : 1.06 });
          if (judgement === "PERFECT") {
            this.sound.play("bamboo-axe-perfect-sfx", { volume: 0.48, rate: 0.92 });
          }
        });
        impactFx.setAlpha(judgement === "PERFECT" ? 1 : 0.72)
          .setScale(judgement === "PERFECT" ? 0.17 : 0.14)
          .setAngle(-8);
        this.tweens.add({
          targets: impactFx,
          alpha: 0,
          scaleX: judgement === "PERFECT" ? 0.23 : 0.19,
          scaleY: judgement === "PERFECT" ? 0.23 : 0.19,
          duration: 300,
          ease: "Quad.out",
        });
        if (judgement === "PERFECT") this.cameras.main.shake(90, 0.0018);
      }
      const comboActive = controller.stats.combo > 0;
      comboInk.setAlpha(comboActive ? 0.94 : 0);
      comboTitle.setAlpha(comboActive ? 1 : 0);
      comboCounter.setCombo(controller.stats.combo);
      const completed = Math.min(controller.stats.strikes, BAMBOO_GAME_CONFIG.goalCount);
      const excess = Math.max(0, controller.stats.strikes - BAMBOO_GAME_CONFIG.goalCount);
      progressLabel.setText(
        `修為 +30\n竹子數量：${completed}/${BAMBOO_GAME_CONFIG.goalCount}${excess > 0 ? `\n超額完成：${excess}` : ""}\n今日剩餘修行次數：${Math.max(0, 2 - this.player.timeSlot)}`,
      );
    };
    const handleInput = () => {
      playChopAnimation();
      const judgement = controller.input(performance.now());
      if (judgement) displayJudgement(judgement);
    };
    inputZone.on("pointerdown", handleInput);
    this.input.keyboard?.on("keydown-SPACE", handleInput);
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
      chargeGauge.update(snapshot.cycleProgress, now, snapshot.state === "paused");
      comboCounter.setPaused(snapshot.state === "paused");
      if (snapshot.state !== "playing") return;
      const remaining = Math.ceil(snapshot.remainingMs / 1000);
      timeLabel.setText(`時間 ${remaining}`);
      const timeRatio = snapshot.remainingMs / BAMBOO_GAME_CONFIG.roundDurationMs;
      timeBar.clear()
        .fillStyle(0x111a18, 0.78).fillRoundedRect(400, 44, 400, 44, 14)
        .fillStyle(0x426f58, 0.96).fillRoundedRect(405, 49, 390 * Math.max(0, timeRatio), 34, 10);
      ringLayer.clear();
    };
    this.events.on(Phaser.Scenes.Events.UPDATE, update);

    let count = BAMBOO_GAME_CONFIG.countdownSeconds;
    const countdownEvent = this.time.addEvent({
      delay: 1000,
      repeat: BAMBOO_GAME_CONFIG.countdownSeconds - 1,
      callback: () => {
        count -= 1;
        if (count > 0) {
          timeLabel.setText(String(count)).setScale(1.15);
          this.tweens.add({ targets: timeLabel, scale: 1, duration: 240 });
        } else {
          timeLabel.setText("開始").setScale(1.12);
          this.tweens.add({ targets: timeLabel, scale: 1, duration: 320 });
          controller.begin(performance.now());
          this.tweens.add({
            targets: countdownBacking,
            alpha: 0,
            duration: 300,
            onComplete: () => countdownBacking.destroy(),
          });
          this.time.delayedCall(360, () => timeLabel.active && timeLabel.setText("時間 30"));
        }
      },
    });
    countdownEvent.paused = false;
  }

  private showBambooTaskResult(
    controller: BambooGameController,
    reward: number,
    proficiency: number,
    baseReward: number,
  ) {
    this.resetLandscape();
    const background = this.add.image(600, 337.5, "bamboo-minigame-bg").setDisplaySize(1200, 675).setAlpha(0.58);
    const shade = this.add.rectangle(600, 337.5, 1200, 675, 0x070c0b, 0.64);
    const resultBacking = this.add.image(600, 342, "shared-result-panel").setDisplaySize(820, 510);
    this.layer.add([background, shade, resultBacking]);
    const title = this.text(600, 146, "修行完成", 42, "#30342f");
    const rowData: Array<[string, string, number, string]> = [
      ["人刃合一", String(controller.stats.perfect), 214, "#9a752b"],
      ["運勁得宜", String(controller.stats.good), 248, "#333b37"],
      ["勉強斬中", String(controller.stats.normal), 281, "#333b37"],
      ["氣息紊亂", String(controller.stats.miss), 314, "#4d514d"],
      ["總砍竹次數", String(controller.stats.strikes), 348, "#333b37"],
      ["最高連擊", String(controller.stats.maxCombo), 380, "#9a752b"],
      ["獲得基本修為", `${reward}（${proficiency}% 熟練）`, 414, "#9a752b"],
      ["額外修為", String(Math.max(0, reward - Math.round(baseReward * (1 + proficiency / 100)))), 447, "#333b37"],
    ];
    const rows: Phaser.GameObjects.Text[][] = [[title]];
    rowData.forEach(([label, value, y, color]) => {
      const labelText = this.text(355, y, label, 23, color).setOrigin(0, 0.5);
      const valueText = this.text(665, y, value, 23, color).setOrigin(0, 0.5);
      rows.push([labelText, valueText]);
    });
    rows.forEach((row, index) => {
      const targetY = row[0].y;
      row.forEach((item) => item.setAlpha(0).setY(targetY + 12));
      this.tweens.add({
        targets: row,
        alpha: 1,
        y: targetY,
        duration: 420,
        delay: 180 + index * 210,
        ease: "Sine.out",
      });
    });
    const resultButton = (x: number, label: string, action: () => void, tone: "paper" | "ink") => {
      const backing = this.add.image(x, 527, tone === "paper" ? "s01-gold-button-frame" : "s01-selection-confirm")
        .setDisplaySize(220, 58);
      const normalColor = tone === "paper" ? "#303832" : "#eadfc7";
      const caption = this.text(x, 527, label, 22, normalColor);
      const hit = this.add.zone(x, 527, 220, 58).setInteractive({ useHandCursor: true });
      hit.on("pointerover", () => { backing.setAlpha(0.88); caption.setColor("#b88b3f"); });
      hit.on("pointerout", () => { backing.setAlpha(1); caption.setColor(normalColor); });
      hit.on("pointerup", action);
      this.layer.addAt(backing, Math.max(0, this.layer.getIndex(caption) - 1));
      this.layer.add(hit);
      backing.setAlpha(0);
      caption.setAlpha(0);
      this.tweens.add({ targets: [backing, caption], alpha: 1, duration: 260, ease: "Sine.out" });
    };
    this.time.delayedCall(2050, () => {
      resultButton(470, "再次修行", () => this.playBambooTask(), "paper");
      resultButton(730, "離開", () => this.showMainMenu(), "ink");
    });
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
      const { reward } = this.applyGameProficiency("挑水", WATER_CARRY_CONFIG.rewardCultivation);
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
      const baseReward = rewardMode === "minimum"
        ? HEART_MANUAL_CONFIG.rewardFormula.baseCultivation
        : rewardMode === "proportional"
          ? controller.earlyCultivationReward(now)
          : controller.cultivationReward();
      const { reward } = this.applyGameProficiency("參悟心法", baseReward);
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

