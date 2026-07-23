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
    this.load.image("question-stone-landscape-bg", "assets/scenes/question-stone-courtyard-background-v2.png");
    this.load.image("question-stone-neutral", "assets/scenes/question-stone-isolated-neutral-v2.png");
    this.load.image("question-stone-hand", "assets/ui/question-stone/hand-contact-base-v1.png");
    this.load.image("sect-courtyard", "assets/scenes/sect-courtyard-v1.png");
    this.load.image("foundation-cave", "assets/scenes/foundation-cave-v1.png");
    this.load.image("chore-office-story-card", "assets/scenes/chore-office-story-card-v1.png");
    this.load.image("player-male-choice", "assets/characters/player-male-v2.png");
    this.load.image("player-female-choice", "assets/characters/player-female-v3.png");
    this.load.image("sect-elder", "assets/characters/sect-elder-v1.png");
    this.load.image("outer-sect-steward", "assets/characters/outer-sect-steward-v1.png");
    this.load.image("title-mist-1", "assets/vfx/kenney-particle-pack/mist-01.png");
    this.load.image("title-mist-2", "assets/vfx/kenney-particle-pack/mist-02.png");
    this.load.image("title-icon-mechanism", "assets/ui/title/mechanism-ink-effect-v2.png");
    this.load.image("title-icon-question-stone", "assets/ui/title/question-stone-ink-effect-v2.png");
    this.load.image("title-icon-identity-jade", "assets/ui/title/identity-jade-slip-ink-effect-v3.png");
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
      this.titlePrimaryButton(buttonX, buttonY, "繼續修行", () => {
        this.player = save.player;
        this.startDailyMusic();
        this.resumeFromSave();
      });
    } else {
      this.titlePrimaryButton(buttonX, buttonY, "踏入仙門", () => this.startNewGame());
    }
    this.titleFeatureButton(920, 110, "title-icon-mechanism", "機關", () => this.toggleTitleSettings(Boolean(save)));
    this.titleFeatureButton(1020, 110, "title-icon-question-stone", "問仙石", () => this.showTitleNotice("尚未開放"));
    this.titleFeatureButton(1120, 110, "title-icon-identity-jade", "身份玉簡", () => {
      if (!save) return this.showTitleNotice("尚無修行紀錄");
      this.player = save.player;
      this.showActivityHistory();
    });
    const featureDividers = this.add.graphics();
    featureDividers.lineStyle(1, COLORS.ink, 0.32);
    featureDividers.lineBetween(970, 68, 970, 150);
    featureDividers.lineBetween(1070, 68, 1070, 150);
    this.layer.add(featureDividers);
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
    const divider = this.add.graphics();
    divider.lineStyle(1, 0xb99b55, 0.72).lineBetween(x - 145, y + 31, x + 145, y + 31);
    divider.fillStyle(0xc8aa61, 0.9).fillPoints([
      new Phaser.Geom.Point(x, y + 27),
      new Phaser.Geom.Point(x + 4, y + 31),
      new Phaser.Geom.Point(x, y + 35),
      new Phaser.Geom.Point(x - 4, y + 31),
    ], true);
    const caption = this.add.text(x - 44, y, label, {
      fontFamily: '"Noto Serif TC", "Microsoft JhengHei", serif',
      fontSize: "32px",
      fontStyle: "600",
      color: "#121412",
    }).setOrigin(0.5);
    const hitArea = this.add.zone(x, y + 10, 300, 78).setInteractive({ useHandCursor: true });
    hitArea.on("pointerover", () => {
      divider.setAlpha(1);
      caption.setTint(0x876e3c);
      caption.setY(y - 1);
    });
    hitArea.on("pointerout", () => {
      divider.setAlpha(0.88);
      caption.clearTint();
      caption.setY(y);
    });
    hitArea.on("pointerdown", () => caption.setAlpha(0.72));
    hitArea.on("pointerup", () => { caption.setAlpha(1); action(); });
    this.layer.add([divider, caption, hitArea]);
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

  private toggleTitleSettings(hasSave: boolean) {
    if (this.titleSettingsOverlay) {
      this.titleSettingsOverlay.destroy(true);
      this.titleSettingsOverlay = undefined;
      return;
    }

    const overlay = this.add.container(0, 0).setDepth(1000);
    this.titleSettingsOverlay = overlay;
    this.layer.add(overlay);
    const blocker = this.add.rectangle(600, 337.5, 1200, 675, 0x101b19, 0.46).setInteractive();
    const panel = this.add.image(600, hasSave ? 345 : 325, "title-settings-panel")
      .setDisplaySize(430, hasSave ? 500 : 420);
    const title = this.add.text(600, 215, "機關", {
      fontFamily: '"Noto Serif TC", "Microsoft JhengHei", serif', fontSize: "30px", color: "#28332f",
    }).setOrigin(0.5);
    const titleDivider = this.add.graphics();
    titleDivider.lineStyle(1, 0x75654f, 0.54).lineBetween(490, 242, 710, 242);
    overlay.add([blocker, panel, title, titleDivider]);

    const modalButton = (y: number, label: () => string, action: () => void) => {
      const paper = this.add.graphics();
      const drawPaper = () => {
        paper.clear();
        paper.lineStyle(1, 0x75654f, 0.36).lineBetween(480, y + 27, 720, y + 27);
      };
      drawPaper();
      const caption = this.add.text(600, y, label(), {
        fontFamily: '"Noto Serif TC", "Microsoft JhengHei", serif', fontSize: "20px", color: "#29332f",
      }).setOrigin(0.5);
      const zone = this.add.zone(600, y, 270, 52).setInteractive({ useHandCursor: true });
      zone.on("pointerdown", () => caption.setAlpha(0.58));
      zone.on("pointerup", () => {
        caption.setAlpha(1);
        action();
        this.time.delayedCall(250, () => {
          if (caption.active) caption.setText(label());
        });
      });
      overlay.add([paper, caption, zone]);
    };

    modalButton(280, () => `音樂：${this.sound.mute ? "關閉" : "開啟"}`, () => { this.sound.mute = !this.sound.mute; });
    modalButton(345, () => `畫面：${this.scale.isFullscreen ? "全螢幕" : "視窗化"}`, () => {
      if (this.scale.isFullscreen) this.scale.stopFullscreen(); else this.scale.startFullscreen();
    });
    if (hasSave) modalButton(410, () => "道心崩了", () => {
      this.toggleTitleSettings(hasSave);
      this.showSettingsScreen();
    });
    modalButton(hasSave ? 475 : 410, () => "關閉", () => this.toggleTitleSettings(hasSave));

    const settingsToggleZone = this.add.zone(920, 110, 108, 90).setInteractive({ useHandCursor: true });
    settingsToggleZone.on("pointerup", () => this.toggleTitleSettings(hasSave));
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

  private destroySave() {
    localStorage.removeItem(SAVE_KEY);
    this.startNewGame();
  }

  private showSettingsScreen() {
    this.resetLandscape();
    this.text(600, 70, "機關", 42);
    this.button(600, 235, this.sound.mute ? "音樂：關閉" : "音樂：開啟", () => {
      this.sound.mute = !this.sound.mute;
      this.showSettingsScreen();
    }, 280);
    if (this.readSave()) this.button(600, 365, "道心崩了", () => this.showHeartbreakSceneCard(), 280);
    this.button(600, 510, "返回", () => this.showMainMenu(), 240);
  }

  private showHeartbreakSceneCard() {
    this.resetLandscape();
    const darkness = this.add.rectangle(600, 337.5, 1200, 675, 0x111817, 0.82);
    const inkMoon = this.add.circle(420, 280, 150, 0xd9d4c5, 0.12).setStrokeStyle(3, 0x6f7771, 0.42);
    const fadingFigure = this.add.image(420, 345, this.player.gender === "male" ? "player-male-choice" : "player-female-choice");
    fadingFigure.setScale(Math.min(180 / fadingFigure.width, 330 / fadingFigure.height)).setTint(0x7b817c).setAlpha(0.62);
    this.layer.add([darkness, inkMoon, fadingFigure]);
    this.tweens.add({ targets: fadingFigure, alpha: { from: 0.62, to: 0.28 }, y: 357, duration: 2200, yoyo: true, repeat: -1, ease: "Sine.inOut" });
    this.text(800, 145, "道途將斷", 42, "#d9d1bd");
    this.text(800, 270, "此念一決，今世姓名、靈根、修為與經歷皆將散去。", 20, "#ded8c9");
    this.button(720, 425, "繼續", () => this.showDestroyConfirmation(), 220);
    this.button(950, 425, "回到機關", () => this.showSettingsScreen(), 220);
  }

  private showDestroyConfirmation() {
    this.resetLandscape();
    this.text(600, 145, "放棄此世", 48, "#7e352f");
    this.text(600, 270, "確定放棄這一世，重新來過？", 25, "#5f4641");
    this.button(430, 430, "確定重新來過", () => this.destroySave(), 280);
    this.button(770, 430, "保留此世", () => this.showSettingsScreen(), 280);
  }

  private showGenderChoice() {
    this.resetLandscape();
    this.text(600, 55, "選擇此身", 42);
    this.text(600, 100, "不問男女，只問本心", 20, "#607d77");
    this.characterCard(430, 350, "male");
    this.characterCard(770, 350, "female");
  }

  private characterCard(x: number, y: number, gender: Gender) {
    const card = this.add.zone(x, y, 280, 430).setInteractive({ useHandCursor: true });
    const portrait = this.add.image(x, y - 12, gender === "male" ? "player-male-choice" : "player-female-choice");
    const portraitScale = Math.min(220 / portrait.width, 340 / portrait.height);
    portrait.setScale(portraitScale);
    this.layer.add([portrait, card]);
    this.text(x, y + 210, gender === "male" ? "男" : "女", 24);
    card.on("pointerover", () => portrait.setScale(portraitScale * 1.03));
    card.on("pointerout", () => portrait.setScale(portraitScale));
    card.on("pointerup", () => {
      this.player.gender = gender;
      this.showNameEntry();
    });
  }

  private showNameEntry() {
    this.resetLandscape();
    this.text(600, 80, "留下姓名", 42);
    this.text(600, 130, "此名將記入宗門名冊", 20, "#607d77");
    const suggestedName = this.player.gender === "male" ? "沈青川" : "蘇晚晴";
    const dom = this.add.dom(600, 330).createFromHTML(`
      <div class="name-entry">
        <input aria-label="角色姓名" maxlength="8" value="${suggestedName}" autocomplete="off" />
        <div class="error" aria-live="polite"></div>
        <button type="button">確認姓名</button>
      </div>
    `);
    this.layer.add(dom);
    dom.addListener("click");
    dom.on("click", (event: Event) => {
      const target = event.target as HTMLElement;
      if (target.tagName !== "BUTTON") return;
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
    this.button(600, 545, "返回選角", () => this.showGenderChoice(), 230);
  }

  private showStoneIntro() {
    this.resetLandscape();
    const scene = this.add.image(600, 337.5, "question-stone-landscape-bg").setDisplaySize(1200, 675);
    const stone = this.add.image(730, 382, "question-stone-neutral");
    stone.setScale(Math.min(300 / stone.width, 480 / stone.height));
    this.layer.add([scene, stone]);
    const shade = this.add.rectangle(600, 337.5, 1200, 675, 0x102321, 0.16);
    const narration = this.add.text(600, 92, "", {
      fontFamily: '"Noto Serif TC", "Microsoft JhengHei", serif', fontSize: "34px",
      color: "#f5edda", stroke: "#253733", strokeThickness: 3,
    }).setOrigin(0.5).setAlpha(0);
    this.layer.add([shade, narration]);

    const stoneZone = this.add.zone(620, 360, 300, 500);
    const hand = this.add.image(630, 380, "question-stone-hand");
    hand.setScale(Math.min(150 / hand.width, 220 / hand.height)).setAlpha(0).setBlendMode(Phaser.BlendModes.SCREEN);
    const progressTrack = this.add.graphics().setAlpha(0);
    const progressFill = this.add.graphics().setAlpha(0);
    progressTrack.lineStyle(5, 0xead8a5, 0.38).strokeCircle(620, 360, 78);
    this.layer.add([stoneZone, hand, progressTrack, progressFill]);

    const dialogue = this.add.container(0, 0).setAlpha(0);
    const dialoguePanel = this.add.graphics();
    dialoguePanel.fillStyle(0xefe8d7, 0.96).fillRoundedRect(210, 500, 780, 135, 14);
    dialoguePanel.lineStyle(2, 0x5f5442, 0.7).strokeRoundedRect(210, 500, 780, 135, 14);
    const elderPortrait = this.add.image(280, 565, "sect-elder");
    elderPortrait.setScale(Math.min(112 / elderPortrait.width, 118 / elderPortrait.height));
    const nameplate = this.add.text(355, 520, "宗門執事", { fontFamily: '"Noto Serif TC", serif', fontSize: "20px", color: "#72552f" });
    const instruction = this.add.text(355, 563, "將手放上去。", { fontFamily: '"Noto Serif TC", serif', fontSize: "27px", color: "#20312e" });
    dialogue.add([dialoguePanel, elderPortrait, nameplate, instruction]);
    this.layer.add(dialogue);

    stoneZone.disableInteractive();
    const lines = ["此石名曰問仙", "可照靈根", "可辨仙緣", "願入宗者，皆須一問！"];
    const playLine = (index: number) => {
      if (index >= lines.length) {
        this.tweens.add({ targets: dialogue, alpha: 1, duration: 320, onComplete: () => {
          this.time.delayedCall(1250, () => this.tweens.add({ targets: dialogue, alpha: 0, duration: 300, onComplete: () => {
            stoneZone.setInteractive({ cursor: "pointer" });
            this.tweens.add({ targets: [progressTrack, hand], alpha: { from: 0.18, to: 0.42 }, duration: 900, yoyo: true, repeat: -1 });
          }}));
        }});
        return;
      }
      narration.setText(lines[index]);
      this.tweens.add({ targets: narration, alpha: 1, duration: 320, hold: 760, yoyo: true, onComplete: () => playLine(index + 1) });
    };
    this.time.delayedCall(350, () => playLine(0));

    let holdTween: Phaser.Tweens.Tween | undefined;
    let completed = false;
    const cancelHold = () => {
      if (completed) return;
      holdTween?.stop();
      holdTween = undefined;
      progressFill.clear().setAlpha(0);
      hand.setAlpha(0.3);
    };
    const completeHold = () => {
      completed = true;
      stoneZone.disableInteractive();
      this.tweens.killTweensOf([progressTrack, hand]);
      const glow = this.add.ellipse(620, 360, 270, 470, 0xfff4d6, 0.18).setBlendMode(Phaser.BlendModes.ADD);
      const innerRing = this.add.ellipse(620, 360, 170, 330).setStrokeStyle(5, COLORS.gold, 0.9).setBlendMode(Phaser.BlendModes.ADD);
      const outerRing = this.add.ellipse(620, 360, 300, 520).setStrokeStyle(3, COLORS.jade, 0.7).setBlendMode(Phaser.BlendModes.ADD);
      this.layer.add([glow, innerRing, outerRing]);
      this.tweens.add({ targets: glow, alpha: 0.82, scaleX: 1.45, scaleY: 1.18, duration: 950, yoyo: true });
      this.tweens.add({ targets: innerRing, scale: 1.55, alpha: 0, angle: 18, duration: 1150 });
      this.tweens.add({ targets: outerRing, scale: 0.62, alpha: 0.95, angle: -12, duration: 900, yoyo: true });
      this.cameras.main.flash(260, 220, 205, 140, false);
      this.cameras.main.shake(420, 0.003);
      this.time.delayedCall(1550, () => this.revealAptitude());
    };
    stoneZone.on("pointerdown", () => {
      if (completed) return;
      hand.setAlpha(0.92);
      progressFill.clear().setAlpha(1).lineStyle(8, 0xfff0b8, 0.95);
      const meter = { value: 0 };
      holdTween = this.tweens.add({ targets: meter, value: 1, duration: 1200, onUpdate: () => {
        progressFill.clear().lineStyle(8, 0xfff0b8, 0.95).beginPath().arc(620, 360, 78, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * meter.value).strokePath();
        hand.setAlpha(0.55 + meter.value * 0.45);
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
    this.text(600, 55, "靈根顯現", 42);
    this.text(600, 100, "你的靈根逐漸顯現", 21, "#58746e");
    this.text(600, 165, ROOT_LABELS[this.player.root], 35, "#9b762c");
    this.text(600, 210, `「${ROOT_REVELATIONS[this.player.root]}」`, 18, "#526f69");
    ATTRIBUTES.forEach((attribute, index) => {
      const x = index % 2 === 0 ? 420 : 780;
      const y = 310 + Math.floor(index / 2) * 80;
      this.text(x - 50, y, ATTRIBUTE_LABELS[attribute], 23);
      this.text(x + 50, y, String(this.player.attributes[attribute]), 28, "#487a70");
    });
    this.text(600, 490, "宗門執事：「有靈根。先去雜役處報到。」", 19);
    this.button(600, 570, "前往雜役處", () => this.showChoreOfficeSceneCard());
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
    this.text(600, 55, "砍竹", 42);
    this.text(600, 105, "按住並橫向劃過竹身", 20, "#58746e");
    const bamboo = this.add.rectangle(600, 350, 100, 430, 0x66845f, 1).setStrokeStyle(5, 0x304b3c);
    const cut = this.add.graphics();
    const zone = this.add.zone(600, 350, 800, 470).setInteractive({ useHandCursor: true });
    this.layer.add([bamboo, cut, zone]);
    const progressLabel = this.text(600, 590, "切入 0%", 27, "#9b762c");
    const timeLabel = this.text(600, 630, "剩餘 30 秒", 18, "#58746e");
    let progress = 0;
    let qualityTotal = 0;
    let cuts = 0;
    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    let lastTime = 0;
    let remaining = 30;
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      zone.disableInteractive();
      const accuracy = cuts ? qualityTotal / cuts : 0;
      this.grantTaskCultivation("砍竹", progress * 0.65 + accuracy * 0.35, progress >= 100);
    };
    zone.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      dragging = true;
      lastX = pointer.x / LANDSCAPE_VIEW_SCALE;
      lastY = pointer.y / LANDSCAPE_VIEW_SCALE;
      lastTime = pointer.event.timeStamp;
    });
    zone.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      if (!dragging || finished) return;
      const localX = pointer.x / LANDSCAPE_VIEW_SCALE;
      const localY = pointer.y / LANDSCAPE_VIEW_SCALE;
      const dx = localX - lastX;
      const dy = localY - lastY;
      const distance = Math.hypot(dx, dy);
      if (distance < 55) return;
      const crossesBamboo = (lastX < 600 && localX > 600) || (lastX > 600 && localX < 600);
      if (crossesBamboo && localY > 145 && localY < 560) {
        const elapsed = Math.max(16, pointer.event.timeStamp - lastTime);
        const speed = distance / elapsed;
        const horizontal = Math.abs(dx) / Math.max(1, distance);
        const quality = Phaser.Math.Clamp(horizontal * 70 + Math.min(30, speed * 18), 0, 100);
        progress = Math.min(100, progress + Math.ceil(8 + quality * 0.12));
        qualityTotal += quality;
        cuts += 1;
        cut.lineStyle(3, 0xe8e1bd, 0.9).lineBetween(555, localY, 645, localY + Phaser.Math.Between(-9, 9));
        progressLabel.setText(`切入 ${progress}%`);
        this.cameras.main.shake(55, 0.0025);
        if (progress >= 100) {
          this.tweens.add({ targets: bamboo, angle: 82, x: 770, duration: 700, ease: "Quad.in", onComplete: finish });
        }
      }
      lastX = localX;
      lastY = localY;
      lastTime = pointer.event.timeStamp;
    });
    zone.on("pointerup", () => { dragging = false; });
    this.time.addEvent({ delay: 1000, repeat: 29, callback: () => {
      remaining -= 1;
      timeLabel.setText(`剩餘 ${remaining} 秒`);
      if (remaining <= 0) finish();
    } });
  }

  private playWaterTask() {
    this.resetLandscape();
    this.text(600, 50, "挑水", 42);
    this.text(600, 98, "按住左右兩側調整重心", 20, "#58746e");
    const pole = this.add.rectangle(600, 270, 620, 16, 0x5b4631).setStrokeStyle(2, 0x2f251c);
    const leftBucket = this.add.rectangle(350, 385, 140, 170, 0x4b4034).setStrokeStyle(4, 0x26221d);
    const rightBucket = this.add.rectangle(850, 385, 140, 170, 0x4b4034).setStrokeStyle(4, 0x26221d);
    const leftWater = this.add.rectangle(350, 345, 122, 78, 0x79b5c8, 0.95);
    const rightWater = this.add.rectangle(850, 345, 122, 78, 0x79b5c8, 0.95);
    this.layer.add([pole, leftBucket, rightBucket, leftWater, rightWater]);
    const waterLabel = this.text(600, 500, "剩餘水量 100%", 28, "#477d84");
    const routeLabel = this.text(600, 540, "路程 0%", 20, "#58746e");
    const timeLabel = this.text(600, 575, "剩餘 30 秒", 18, "#58746e");
    const leftControl = this.add.zone(270, 600, 360, 130).setInteractive({ useHandCursor: true });
    const rightControl = this.add.zone(930, 600, 360, 130).setInteractive({ useHandCursor: true });
    this.layer.add([leftControl, rightControl]);
    this.text(270, 610, "向左穩", 24);
    this.text(930, 610, "向右穩", 24);
    let control = 0;
    let tilt = 0;
    let velocity = 0.018;
    let waterAmount = 100;
    let route = 0;
    let stableFrames = 0;
    let totalFrames = 0;
    let remaining = 30;
    let finished = false;
    leftControl.on("pointerdown", () => { control = -1; });
    rightControl.on("pointerdown", () => { control = 1; });
    this.input.on("pointerup", () => { control = 0; });
    const cursors = this.input.keyboard?.createCursorKeys();
    this.time.addEvent({ delay: 50, loop: true, callback: () => {
      if (finished) return;
      const keyboardControl = cursors?.left.isDown ? -1 : cursors?.right.isDown ? 1 : 0;
      velocity += (control || keyboardControl) * 0.0045;
      velocity += Phaser.Math.FloatBetween(-0.0028, 0.0028);
      velocity += -tilt * 0.004;
      velocity *= 0.97;
      tilt = Phaser.Math.Clamp(tilt + velocity, -1.15, 1.15);
      const degrees = tilt * 22;
      pole.setAngle(degrees * 0.35);
      leftWater.setAngle(degrees);
      rightWater.setAngle(degrees);
      totalFrames += 1;
      if (Math.abs(tilt) < 0.55) stableFrames += 1;
      if (Math.abs(tilt) > 0.82) {
        waterAmount = Math.max(0, waterAmount - (Math.abs(tilt) - 0.78) * 1.15);
        const spillX = tilt < 0 ? 280 : 920;
        const drop = this.add.circle(spillX, 425, 8, 0x8ac7d6, 0.8);
        this.layer.add(drop);
        this.tweens.add({ targets: drop, y: 510, alpha: 0, duration: 380, onComplete: () => drop.destroy() });
      }
      route = Math.min(100, route + 0.28);
      waterLabel.setText(`剩餘水量 ${Math.ceil(waterAmount)}%`);
      routeLabel.setText(`路程 ${Math.ceil(route)}%`);
      if (route >= 100) {
        finished = true;
        const stability = totalFrames ? stableFrames / totalFrames * 100 : 0;
        this.grantTaskCultivation("挑水", waterAmount * 0.7 + stability * 0.3);
      }
    } });
    this.time.addEvent({ delay: 1000, repeat: 29, callback: () => {
      if (finished) return;
      remaining -= 1;
      timeLabel.setText(`剩餘 ${remaining} 秒`);
      if (remaining <= 0) {
        finished = true;
        const stability = totalFrames ? stableFrames / totalFrames * 100 : 0;
        this.grantTaskCultivation("挑水", waterAmount * 0.7 + stability * 0.3, false);
      }
    } });
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
    this.text(600, 45, "參悟心法", 42);
    this.text(600, 90, "先記住周天，再從丹田按住描線", 19, "#58746e");
    const body = this.add.ellipse(600, 380, 300, 500, 0x203a37, 0.16).setStrokeStyle(3, COLORS.jade, 0.45);
    this.layer.add(body);
    const positions = [[600, 575], [490, 485], [480, 355], [600, 225], [720, 355], [710, 485]];
    let round = 0;
    let misses = 0;
    let checks = 0;
    let drawing = false;
    let finished = false;
    let currentStep = 0;
    let sequence: number[] = [];
    let guide: Phaser.GameObjects.Graphics;
    const nodes = positions.map(([x, y], index) => {
      const node = this.add.circle(x, y, index === 0 ? 27 : 20, index === 0 ? COLORS.gold : COLORS.jade, 0.75);
      this.layer.add(node);
      return node;
    });
    const trail = this.add.graphics();
    this.layer.add(trail);
    const beginRound = () => {
      const count = 4 + round;
      sequence = [0, ...Phaser.Utils.Array.Shuffle([1, 2, 3, 4, 5]).slice(0, count - 2), 0];
      currentStep = 0;
      drawing = false;
      nodes.forEach((node, index) => node.setAlpha(sequence.includes(index) ? 0.75 : 0.12).setFillStyle(index === 0 ? COLORS.gold : COLORS.jade));
      guide = this.add.graphics();
      guide.lineStyle(8, 0x8bd1be, 0.72);
      for (let i = 1; i < sequence.length; i += 1) {
        const [ax, ay] = positions[sequence[i - 1]];
        const [bx, by] = positions[sequence[i]];
        guide.lineBetween(ax, ay, bx, by);
      }
      this.layer.add(guide);
      this.time.delayedCall(1600, () => guide.destroy());
    };
    const finishRound = () => {
      if (finished) return;
      round += 1;
      if (round >= 3) {
        finished = true;
        const accuracy = checks ? Math.max(0, 100 - misses / checks * 100) : 0;
        this.grantTaskCultivation("參悟心法", accuracy);
      } else {
        this.time.delayedCall(550, beginRound);
      }
    };
    const zone = this.add.zone(600, 390, 620, 500).setInteractive({ useHandCursor: true });
    this.layer.add(zone);
    zone.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      const [x, y] = positions[0];
      const localX = pointer.x / LANDSCAPE_VIEW_SCALE;
      const localY = pointer.y / LANDSCAPE_VIEW_SCALE;
      if (Phaser.Math.Distance.Between(localX, localY, x, y) <= 48) {
        drawing = true;
        currentStep = 1;
        trail.clear();
      }
    });
    zone.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      if (!drawing || currentStep >= sequence.length) return;
      const [x, y] = positions[sequence[currentStep]];
      checks += 1;
      const localX = pointer.x / LANDSCAPE_VIEW_SCALE;
      const localY = pointer.y / LANDSCAPE_VIEW_SCALE;
      trail.fillStyle(0xb8e6d8, 0.5).fillCircle(localX, localY, 6);
      if (Phaser.Math.Distance.Between(localX, localY, x, y) <= 42) {
        nodes[sequence[currentStep]].setFillStyle(COLORS.gold).setAlpha(1);
        currentStep += 1;
        if (currentStep >= sequence.length) {
          drawing = false;
          finishRound();
        }
      } else if (checks % 8 === 0) {
        misses += 1;
      }
    });
    zone.on("pointerup", () => { if (drawing) { drawing = false; misses += 3; } });
    const timeLabel = this.text(600, 630, "剩餘 30 秒", 18, "#58746e");
    let remaining = 30;
    this.time.addEvent({ delay: 1000, repeat: 29, callback: () => {
      if (finished) return;
      remaining -= 1;
      timeLabel.setText(`剩餘 ${remaining} 秒`);
      if (remaining <= 0) {
        finished = true;
        zone.disableInteractive();
        const accuracy = checks ? Math.max(0, 100 - misses / checks * 100) : 0;
        this.grantTaskCultivation("參悟心法", accuracy, false);
      }
    } });
    beginRound();
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

