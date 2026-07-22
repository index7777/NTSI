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

export class OpeningScene extends Phaser.Scene {
  private layer!: Phaser.GameObjects.Container;
  private dailyMusicStarted = false;
  private dailyMusicIndex = 0;
  private readonly dailyMusicKeys = ["daily-music-1", "daily-music-2", "daily-music-3"];
  private currentBgm?: Phaser.Sound.BaseSound;
  private musicMode: "none" | "menu" | "game-start" | "daily" = "none";
  private playtimeCheckpoint = Date.now();
  private systemOverlay?: Phaser.GameObjects.Container;
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
    this.load.image("game-logo", "assets/title/logo-v1.png");
    this.load.image("title-traveler", "assets/title/traveler-v1.png");
    this.load.image("question-stone-scene", "assets/scenes/question-stone-dormant-v1.png");
    this.load.image("sect-courtyard", "assets/scenes/sect-courtyard-v1.png");
    this.load.image("foundation-cave", "assets/scenes/foundation-cave-v1.png");
    this.load.image("player-male-choice", "assets/characters/player-male-v2.png");
    this.load.image("player-female-choice", "assets/characters/player-female-v3.png");
    this.load.image("sect-elder", "assets/characters/sect-elder-v1.png");
    this.load.audio("daily-music-1", "assets/audio/music/daily-01.mp3");
    this.load.audio("daily-music-2", "assets/audio/music/daily-02.mp3");
    this.load.audio("daily-music-3", "assets/audio/music/daily-03.mp3");
    this.load.audio("menu-music", "assets/audio/music/menu.mp3");
    this.load.audio("game-start-music", "assets/audio/music/game-start.mp3");
  }

  create() {
    this.cameras.main.setBackgroundColor("#e7eee9");
    this.layer = this.add.container(0, 0);
    this.input.once("pointerdown", () => this.startLoopingMusic("menu-music", "menu"));
    this.input.keyboard?.once("keydown", () => this.startLoopingMusic("menu-music", "menu"));
    this.input.keyboard?.on("keydown-ESC", () => this.toggleSystemMenu());
    this.showTitle();
  }

  private fadeTrack(track: Phaser.Sound.BaseSound, from: number, to: number, duration: number, onComplete?: () => void) {
    const adjustableTrack = track as Phaser.Sound.BaseSound & { volume: number; setVolume: (value: number) => void };
    adjustableTrack.setVolume(from);
    const startedAt = performance.now();
    const timer = window.setInterval(() => {
      const progress = Math.min(1, (performance.now() - startedAt) / duration);
      adjustableTrack.setVolume(Phaser.Math.Linear(from, to, progress));
      if (progress >= 1) {
        window.clearInterval(timer);
        onComplete?.();
      }
    }, 50);
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
    this.drawBackdrop();
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
    const overlay = this.add.container(0, 0).setDepth(1000);
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
    modalButton(420, this.sound.mute ? "設定 · 開啟音樂" : "設定 · 關閉音樂", () => {
      this.sound.mute = !this.sound.mute;
      this.toggleSystemMenu();
      this.toggleSystemMenu();
    });
    modalButton(505, "道心崩了", () => { this.toggleSystemMenu(); this.showDestroyConfirmation(); });
    modalButton(590, "離開遊戲", () => {
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
    const titleArt = this.add.image(270, 480, "game-title");
    titleArt.setScale(Math.max(540 / titleArt.width, 960 / titleArt.height));
    this.layer.add(titleArt);
    const shade = this.add.graphics();
    shade.fillStyle(0xf8f3e8, 0.18).fillRect(0, 0, 540, 255);
    shade.fillStyle(0x102321, 0.58).fillRect(0, 690, 540, 270);
    this.layer.add(shade);
    const traveler = this.add.image(246, 700, "title-traveler");
    traveler.setScale(335 / traveler.height);
    this.layer.add(traveler);
    const logo = this.add.image(270, 132, "game-logo").setDisplaySize(475, 317);
    this.layer.add(logo);
    this.animateTitleLogo();
    const save = this.readSave();
    if (save) {
      this.button(270, 760, "繼續遊戲", () => {
        this.player = save.player;
        this.startDailyMusic();
        this.resumeFromSave();
      });
      this.button(270, 850, "新的開始", () => {
        this.player = save.player;
        this.showDestroyConfirmation();
      });
    } else {
      this.button(270, 810, "踏入仙途", () => this.startNewGame());
    }
  }

  private animateTitleLogo() {
    // The jade pass is clipped to the cloud-rune band under 問仙.
    const cloudLight = this.add.image(270, 132, "game-logo")
      .setDisplaySize(475, 317)
      .setTint(0xa8e2d2)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0.06);
    const cloudMaskShape = this.add.rectangle(270, 215, 430, 82, 0xffffff, 1).setVisible(false);
    cloudLight.setMask(cloudMaskShape.createGeometryMask());
    this.layer.add([cloudLight, cloudMaskShape]);
    this.tweens.add({
      targets: cloudLight,
      alpha: { from: 0.04, to: 0.34 },
      x: { from: 260, to: 280 },
      duration: 2600,
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

  private showDestroyConfirmation() {
    this.reset();
    this.text(270, 175, "道心崩了", 48, "#7e352f");
    this.text(270, 325, "確定放棄這一世，重新來過？", 25, "#5f4641");
    this.button(270, 525, "確定重新來過", () => this.destroySave(), 280);
    this.button(270, 655, "保留道心", () => this.resumeFromSave(), 280);
  }

  private showGenderChoice() {
    this.reset();
    this.text(270, 95, "選擇此身", 42);
    this.text(270, 145, "不問男女，只問本心", 20, "#607d77");
    this.characterCard(155, 390, "male");
    this.characterCard(385, 390, "female");
  }

  private characterCard(x: number, y: number, gender: Gender) {
    const card = this.add.zone(x, y, 205, 410).setInteractive({ useHandCursor: true });
    const portrait = this.add.image(x, y - 12, gender === "male" ? "player-male-choice" : "player-female-choice");
    const portraitScale = Math.min(164 / portrait.width, 315 / portrait.height);
    portrait.setScale(portraitScale);
    this.layer.add([portrait, card]);
    this.text(x, y + 190, gender === "male" ? "男" : "女", 24);
    card.on("pointerover", () => portrait.setScale(portraitScale * 1.03));
    card.on("pointerout", () => portrait.setScale(portraitScale));
    card.on("pointerup", () => {
      this.player.gender = gender;
      this.showNameEntry();
    });
  }

  private showNameEntry() {
    this.reset();
    this.text(270, 120, "留下姓名", 42);
    this.text(270, 175, "此名將記入宗門名冊", 20, "#607d77");
    const suggestedName = this.player.gender === "male" ? "沈青川" : "蘇晚晴";
    const dom = this.add.dom(270, 465).createFromHTML(`
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
    this.button(270, 745, "返回選角", () => this.showGenderChoice(), 230);
  }

  private showStoneIntro() {
    this.reset();
    const scene = this.add.image(270, 480, "question-stone-scene");
    scene.setScale(Math.max(540 / scene.width, 960 / scene.height));
    this.layer.add(scene);
    const veil = this.add.rectangle(270, 122, 540, 220, 0xf4f0e5, 0.78);
    this.layer.add(veil);
    this.text(270, 82, "「此石名曰問仙石。」", 25);
    this.text(270, 130, "「可照靈根，可辨仙緣。」", 23, "#526f69");
    this.text(270, 178, "「願入宗者，皆須一問。」", 23, "#526f69");
    const playerKey = this.player.gender === "female" ? "player-female-choice" : "player-male-choice";
    const playerPortrait = this.add.image(92, 690, playerKey);
    playerPortrait.setScale(Math.min(150 / playerPortrait.width, 315 / playerPortrait.height));
    const elder = this.add.image(448, 655, "sect-elder");
    elder.setScale(Math.min(150 / elder.width, 330 / elder.height));
    this.layer.add([playerPortrait, elder]);
    const stoneZone = this.add.zone(294, 505, 180, 390).setInteractive({ useHandCursor: true });
    this.layer.add(stoneZone);
    const instruction = this.text(270, 842, "宗門執事\n「將手放上去。」", 22, "#f8f3df");
    instruction.setBackgroundColor("rgba(20,42,39,0.82)").setPadding(20, 12);
    instruction.setAlpha(0);
    stoneZone.disableInteractive();
    this.time.delayedCall(700, () => {
      instruction.setAlpha(1);
      stoneZone.setInteractive({ useHandCursor: true });
      this.tweens.add({
        targets: instruction,
        alpha: 0.72,
        duration: 850,
        yoyo: true,
        repeat: -1,
      });
    });
    stoneZone.on("pointerup", () => {
      stoneZone.disableInteractive();
      this.tweens.killTweensOf(instruction);
      const glow = this.add.ellipse(294, 510, 190, 370, COLORS.gold, 0.12).setBlendMode(Phaser.BlendModes.ADD);
      const innerRing = this.add.ellipse(294, 510, 120, 260).setStrokeStyle(5, COLORS.gold, 0.9).setBlendMode(Phaser.BlendModes.ADD);
      const outerRing = this.add.ellipse(294, 510, 210, 410).setStrokeStyle(3, COLORS.jade, 0.7).setBlendMode(Phaser.BlendModes.ADD);
      this.layer.add([glow, innerRing, outerRing]);
      this.tweens.add({ targets: glow, alpha: 0.82, scaleX: 1.45, scaleY: 1.18, duration: 950, yoyo: true });
      this.tweens.add({ targets: innerRing, scale: 1.55, alpha: 0, angle: 18, duration: 1150 });
      this.tweens.add({ targets: outerRing, scale: 0.62, alpha: 0.95, angle: -12, duration: 900, yoyo: true });
      for (let index = 0; index < 9; index += 1) {
        const mote = this.add.circle(Phaser.Math.Between(245, 345), Phaser.Math.Between(390, 620), Phaser.Math.Between(4, 9), index % 2 ? COLORS.gold : COLORS.jade, 0.9)
          .setBlendMode(Phaser.BlendModes.ADD);
        this.layer.add(mote);
        this.tweens.add({
          targets: mote,
          x: playerPortrait.x + Phaser.Math.Between(-20, 20),
          y: playerPortrait.y - Phaser.Math.Between(20, 150),
          alpha: 0,
          scale: 0.25,
          duration: 900 + index * 85,
          ease: "Sine.inOut",
        });
      }
      this.cameras.main.flash(260, 220, 205, 140, false);
      this.cameras.main.shake(420, 0.003);
      this.time.delayedCall(1550, () => this.revealAptitude());
    });
  }

  private revealAptitude() {
    this.reset();
    const roots: RootId[] = ["mixed", "triple", "triple", "dual", "dual", "single"];
    this.player.root = Phaser.Utils.Array.GetRandom(roots);
    for (const attribute of ATTRIBUTES) {
      const [min, max] = INITIAL_ATTRIBUTE_RANGE[attribute];
      this.player.attributes[attribute] = Phaser.Math.Between(min, max);
      this.player.initialAttributes[attribute] = this.player.attributes[attribute];
    }
    this.saveGame();
    this.text(270, 95, "靈根顯現", 42);
    this.text(270, 150, "你的靈根逐漸顯現", 21, "#58746e");
    this.text(270, 235, ROOT_LABELS[this.player.root], 35, "#9b762c");
    this.text(270, 285, `「${ROOT_REVELATIONS[this.player.root]}」`, 18, "#526f69");
    ATTRIBUTES.forEach((attribute, index) => {
      const y = 370 + index * 67;
      this.text(185, y, ATTRIBUTE_LABELS[attribute], 23);
      this.text(360, y, String(this.player.attributes[attribute]), 28, "#487a70");
    });
    this.text(270, 680, "宗門執事：「有靈根。先去雜役處報到。」", 19);
    this.button(270, 790, "前往雜役處", () => {
      this.startDailyMusic();
      this.showActivities();
    });
  }

  private showActivities() {
    this.reset();
    const targetCultivation = this.player.realm === "foundation"
      ? REALMS.foundation.cultivation[Math.min(this.player.level, 8)]
      : this.player.realm === "qi"
      ? REALMS.qi.cultivation[Math.min(this.player.level, 8)]
      : 100;
    this.text(270, 64, "修行安排", 38);
    this.text(270, 112, `入門第 ${this.player.sectDay} 日 · ${this.timeLabel()}`, 20, "#58746e");
    this.text(270, 152, `修為 ${this.player.cultivation} / ${targetCultivation}`, 22, "#54736c");
    const tasks = this.player.realm === "uninitiated"
      ? ["砍竹", "參悟心法"]
      : this.player.breathingTutorialComplete
      ? ["砍竹", "挑水", "顧藥園", "參悟心法", "吐納"]
      : ["砍竹", "參悟心法"];
    tasks.forEach((task, index) => {
      const x = index % 2 === 0 ? 155 : 385;
      const y = 255 + Math.floor(index / 2) * 175;
      const card = this.add.rectangle(x, y, 190, 130, 0xf8f4e9, 0.95)
        .setStrokeStyle(3, COLORS.jade, 0.75)
        .setInteractive({ useHandCursor: true });
      this.layer.add(card);
      this.text(x, y, task, 28);
      card.on("pointerup", () => this.playTask(task));
    });
    if (this.player.cultivation >= targetCultivation) {
      if (this.player.realm === "uninitiated") {
        this.button(270, 800, "引氣入體", () => this.showInsight());
      } else {
        if (this.player.realm === "foundation") {
          if (this.player.level < 9) this.button(270, 800, `挑戰筑基${this.player.level + 1}層`, () => this.showFoundationLevelBreakthrough());
          else this.button(270, 800, "迎戰九重雷劫", () => this.showTribulationIntro());
        } else if (this.player.level < 9) {
          this.button(270, 800, `挑戰練氣${this.player.level + 1}層`, () => this.showQiBreakthrough());
        } else {
          this.button(270, 800, "準備突破筑基", () => this.showFoundationPreparation());
        }
      }
    } else {
      this.text(270, 790, "完成修行，感應天地靈機", 20, "#66817c");
    }
    if (this.player.realm !== "uninitiated") {
      this.text(270, 880, "返回主介面", 18, "#58746e").setInteractive({ useHandCursor: true })
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
    return this.player.realm === "qi"
      ? REALMS.qi.cultivation[Math.min(this.player.level, 8)]
      : 100;
  }

  private grantTaskCultivation(task: string, score: number) {
    const normalizedScore = Phaser.Math.Clamp(Math.ceil(score), 0, 100);
    const gain = Math.ceil(12 + normalizedScore * 0.36);
    const cap = this.player.realm === "qi" ? REALMS.qi.cultivation[8] : this.cultivationTarget();
    this.player.cultivation = Math.min(cap, this.player.cultivation + gain);
    this.recordActivity(task, gain);
    this.saveGame();
    this.showTaskResult(task, gain, normalizedScore);
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
    this.reset();
    this.text(270, 100, "砍竹", 42);
    this.text(270, 150, "按住並橫向劃過竹身", 20, "#58746e");
    const bamboo = this.add.rectangle(270, 455, 100, 500, 0x66845f, 1).setStrokeStyle(5, 0x304b3c);
    const cut = this.add.graphics();
    const zone = this.add.zone(270, 470, 500, 600).setInteractive({ useHandCursor: true });
    this.layer.add([bamboo, cut, zone]);
    const progressLabel = this.text(270, 760, "切入 0%", 27, "#9b762c");
    const timeLabel = this.text(270, 810, "剩餘 18 秒", 18, "#58746e");
    let progress = 0;
    let qualityTotal = 0;
    let cuts = 0;
    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    let lastTime = 0;
    let remaining = 18;
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      zone.disableInteractive();
      const accuracy = cuts ? qualityTotal / cuts : 0;
      this.grantTaskCultivation("砍竹", progress * 0.65 + accuracy * 0.35);
    };
    zone.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      dragging = true;
      lastX = pointer.x;
      lastY = pointer.y;
      lastTime = pointer.event.timeStamp;
    });
    zone.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      if (!dragging || finished) return;
      const dx = pointer.x - lastX;
      const dy = pointer.y - lastY;
      const distance = Math.hypot(dx, dy);
      if (distance < 55) return;
      const crossesBamboo = (lastX < 270 && pointer.x > 270) || (lastX > 270 && pointer.x < 270);
      if (crossesBamboo && pointer.y > 260 && pointer.y < 660) {
        const elapsed = Math.max(16, pointer.event.timeStamp - lastTime);
        const speed = distance / elapsed;
        const horizontal = Math.abs(dx) / Math.max(1, distance);
        const quality = Phaser.Math.Clamp(horizontal * 70 + Math.min(30, speed * 18), 0, 100);
        progress = Math.min(100, progress + Math.ceil(8 + quality * 0.12));
        qualityTotal += quality;
        cuts += 1;
        cut.lineStyle(3, 0xe8e1bd, 0.9).lineBetween(225, pointer.y, 315, pointer.y + Phaser.Math.Between(-9, 9));
        progressLabel.setText(`切入 ${progress}%`);
        this.cameras.main.shake(55, 0.0025);
        if (progress >= 100) {
          this.tweens.add({ targets: bamboo, angle: 82, x: 390, duration: 700, ease: "Quad.in", onComplete: finish });
        }
      }
      lastX = pointer.x;
      lastY = pointer.y;
      lastTime = pointer.event.timeStamp;
    });
    zone.on("pointerup", () => { dragging = false; });
    this.time.addEvent({ delay: 1000, repeat: 17, callback: () => {
      remaining -= 1;
      timeLabel.setText(`剩餘 ${remaining} 秒`);
      if (remaining <= 0) finish();
    } });
  }

  private playWaterTask() {
    this.reset();
    this.text(270, 90, "挑水", 42);
    this.text(270, 145, "按住左右兩側調整重心", 20, "#58746e");
    const pole = this.add.rectangle(270, 360, 390, 16, 0x5b4631).setStrokeStyle(2, 0x2f251c);
    const leftBucket = this.add.rectangle(105, 475, 120, 160, 0x4b4034).setStrokeStyle(4, 0x26221d);
    const rightBucket = this.add.rectangle(435, 475, 120, 160, 0x4b4034).setStrokeStyle(4, 0x26221d);
    const leftWater = this.add.rectangle(105, 438, 105, 72, 0x79b5c8, 0.95);
    const rightWater = this.add.rectangle(435, 438, 105, 72, 0x79b5c8, 0.95);
    this.layer.add([pole, leftBucket, rightBucket, leftWater, rightWater]);
    const waterLabel = this.text(270, 650, "剩餘水量 100%", 28, "#477d84");
    const routeLabel = this.text(270, 700, "路程 0%", 20, "#58746e");
    const leftControl = this.add.zone(130, 760, 230, 180).setInteractive({ useHandCursor: true });
    const rightControl = this.add.zone(410, 760, 230, 180).setInteractive({ useHandCursor: true });
    this.layer.add([leftControl, rightControl]);
    this.text(130, 790, "向左穩", 24);
    this.text(410, 790, "向右穩", 24);
    let control = 0;
    let tilt = 0;
    let velocity = 0.018;
    let waterAmount = 100;
    let route = 0;
    let stableFrames = 0;
    let totalFrames = 0;
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
        const spillX = tilt < 0 ? 55 : 485;
        const drop = this.add.circle(spillX, 485, 8, 0x8ac7d6, 0.8);
        this.layer.add(drop);
        this.tweens.add({ targets: drop, y: 570, alpha: 0, duration: 380, onComplete: () => drop.destroy() });
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
  }

  private playHerbTask() {
    this.reset();
    this.text(270, 80, "顧藥園", 42);
    this.text(270, 130, "選工具，處理藥圃突發狀況", 19, "#58746e");
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
      const x = 82 + index * 125;
      const button = this.add.rectangle(x, 205, 112, 58, index === 0 ? COLORS.gold : COLORS.ink, 0.94)
        .setInteractive({ useHandCursor: true });
      this.layer.add(button);
      this.text(x, 205, tool, 18, "#f8f3df");
      button.on("pointerup", () => { selectedTool = index; });
    });
    for (let index = 0; index < 6; index += 1) {
      const x = index % 2 === 0 ? 165 : 375;
      const y = 335 + Math.floor(index / 2) * 145;
      const plot = this.add.circle(x, y, 58, 0x6d9270, 1).setStrokeStyle(4, 0x315449)
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
    const healthLabel = this.text(270, 790, "藥園健康 100%", 21, "#58746e");
    this.time.addEvent({ delay: 850, repeat: 29, callback: () => {
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
      if (elapsed >= 30) {
        finished = true;
        const accuracy = attempts ? correct / attempts * 100 : 0;
        this.grantTaskCultivation("顧藥園", accuracy * 0.6 + health * 0.4);
      }
    } });
  }

  private playMantraTask() {
    this.reset();
    this.text(270, 80, "參悟心法", 42);
    this.text(270, 132, "先記住周天，再從丹田按住描線", 19, "#58746e");
    const body = this.add.ellipse(270, 505, 240, 520, 0x203a37, 0.16).setStrokeStyle(3, COLORS.jade, 0.45);
    this.layer.add(body);
    const positions = [[270, 680], [195, 585], [180, 455], [270, 335], [360, 455], [345, 585]];
    let round = 0;
    let misses = 0;
    let checks = 0;
    let drawing = false;
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
      round += 1;
      if (round >= 3) {
        const accuracy = checks ? Math.max(0, 100 - misses / checks * 100) : 0;
        this.grantTaskCultivation("參悟心法", accuracy);
      } else {
        this.time.delayedCall(550, beginRound);
      }
    };
    const zone = this.add.zone(270, 505, 480, 620).setInteractive({ useHandCursor: true });
    this.layer.add(zone);
    zone.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      const [x, y] = positions[0];
      if (Phaser.Math.Distance.Between(pointer.x, pointer.y, x, y) <= 48) {
        drawing = true;
        currentStep = 1;
        trail.clear();
      }
    });
    zone.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      if (!drawing || currentStep >= sequence.length) return;
      const [x, y] = positions[sequence[currentStep]];
      checks += 1;
      trail.fillStyle(0xb8e6d8, 0.5).fillCircle(pointer.x, pointer.y, 6);
      if (Phaser.Math.Distance.Between(pointer.x, pointer.y, x, y) <= 42) {
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
    beginRound();
  }

  private showTaskResult(task: string, gain: number, score: number) {
    this.reset();
    const excellent = score >= 85;
    this.text(270, 240, excellent ? "靈機相合" : score >= 50 ? "略有所得" : "勤能補拙", 42, excellent ? "#46796e" : "#6e756f");
    const eventLines: Record<string, string> = {
      砍竹: "竹節中逸出一縷靈氣。",
      挑水: "桶中竟混入一滴靈泉。",
      顧藥園: "你認出一株剛成熟的凝露草。",
      參悟心法: "一句晦澀口訣忽然通順。",
      吐納: "呼吸漸穩，靈氣沿經脈緩緩流轉。",
    };
    this.text(270, 350, eventLines[task], 22);
    this.text(270, 430, `操作分數 ${score}`, 24, "#58746e");
    this.text(270, 475, `修為 +${gain}`, 32, "#9b762c");
    this.text(270, 525, "靈氣有所感應", 22, "#54736c");
    const progress = Math.min(100, Math.floor((this.player.cultivation / this.cultivationTarget()) * 100));
    const progressLabel = this.player.realm === "uninitiated" ? "距離引氣入體" : "當前境界修為";
    this.text(270, 570, `${progressLabel}：${progress}%`, 22, "#54736c");
    this.button(270, 650, this.player.cultivation >= this.cultivationTarget() ? "修為已滿" : "繼續", () => this.showActivities());
  }

  private showInsight() {
    this.reset();
    this.text(270, 95, "引氣入體", 42);
    this.text(270, 150, "第一步 · 按住吸收靈氣", 21, "#58746e");
    const orb = this.add.circle(270, 470, 70, COLORS.jade, 0.75).setInteractive({ useHandCursor: true });
    const ring = this.add.circle(270, 470, 105).setStrokeStyle(4, COLORS.gold, 0.7);
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
    this.text(270, 690, "長按光團，讓靈氣聚於掌心", 19, "#66817c");
  }

  private showInsightDrag() {
    this.reset();
    this.text(270, 95, "引氣入體", 42);
    this.text(270, 150, "第二步 · 拖曳靈氣進入丹田", 21, "#58746e");
    const orb = this.add.circle(270, 300, 48, COLORS.gold, 0.9).setInteractive({ draggable: true, useHandCursor: true });
    const dantian = this.add.circle(270, 650, 82, COLORS.jade, 0.18).setStrokeStyle(4, COLORS.jade, 0.9);
    this.layer.add([dantian, orb]);
    this.input.setDraggable(orb);
    orb.on("drag", (_pointer: Phaser.Input.Pointer, x: number, y: number) => orb.setPosition(x, y));
    orb.on("dragend", () => {
      if (Phaser.Math.Distance.Between(orb.x, orb.y, dantian.x, dantian.y) < 95) this.showInsightTiming();
      else orb.setPosition(270, 300);
    });
    this.text(270, 780, "將光團拖入下方丹田", 19, "#66817c");
  }

  private showInsightTiming() {
    this.reset();
    this.text(270, 95, "引氣入體", 42);
    this.text(270, 150, "第三步 · 光圈重合時點擊", 21, "#58746e");
    const target = this.add.circle(270, 470, 72, COLORS.jade, 0.2).setStrokeStyle(5, COLORS.gold, 0.9);
    const pulse = this.add.circle(270, 470, 170).setStrokeStyle(6, COLORS.jade, 0.9).setInteractive({ useHandCursor: true });
    this.layer.add([target, pulse]);
    this.tweens.add({ targets: pulse, scale: 0.42, duration: 1500, repeat: -1 });
    pulse.on("pointerup", () => {
      const closeEnough = Math.abs(pulse.displayWidth - target.displayWidth) < 90;
      if (closeEnough) this.enterQiOne();
      else this.text(270, 720, "莫急，待光圈再次重合", 20, "#8b4a43");
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
    this.reset();
    const flash = this.add.rectangle(270, 480, 540, 960, 0xffffff, 0.85);
    this.layer.add(flash);
    this.tweens.add({ targets: flash, alpha: 0, duration: 700 });
    this.text(270, 120, "引氣入體", 36, "#4d776e");
    this.text(270, 185, "練氣一層", 52, "#9b762c");
    this.text(270, 260, "身份：雜役弟子", 22);
    ATTRIBUTES.forEach((attribute, index) => {
      this.text(270, 355 + index * 62, `${ATTRIBUTE_LABELS[attribute]}  ${this.player.attributes[attribute]}`, 24);
    });
    this.text(270, 650, "靈氣流轉，衣袂間泛起淡淡靈光", 18, "#54736c");
    this.button(270, 755, "接受師姐指引", () => this.showMuQingli());
  }

  private showMuQingli() {
    this.reset();
    this.text(270, 85, "第一次吐納", 37);
    const portrait = this.add.circle(270, 295, 105, 0xdceaf0).setStrokeStyle(4, 0x7697a5);
    const hair = this.add.arc(270, 265, 200, 175, 365, false, 0x182725);
    this.layer.add([portrait, hair]);
    this.text(270, 445, "慕清璃", 28, "#496b79");
    this.text(270, 505, "「既已引氣入體，師姐再教你一些基礎。」", 21);
    this.text(270, 560, "「盤膝，吐納。」", 25);
    this.text(270, 615, "「感受天地靈氣如何流轉。」", 21);
    this.button(270, 735, "開始吐納", () => this.playBreathingTask(true));
  }

  private playBreathingTask(tutorial: boolean) {
    this.reset();
    this.text(270, 72, tutorial ? "吐納教學" : "吐納", 40);
    this.text(270, 125, "光團收縮時按住吸氣，放大時放開吐氣", 18, "#58746e");
    const aura = this.add.circle(270, 430, 105, COLORS.jade, 0.55).setStrokeStyle(5, COLORS.gold, 0.75);
    const inner = this.add.circle(270, 430, 52, 0xe8fff7, 0.5);
    const zone = this.add.zone(270, 430, 360, 360).setInteractive({ useHandCursor: true });
    this.layer.add([aura, inner, zone]);
    let elapsed = 0;
    let holding = false;
    let breaths = 0;
    let goodBreaths = 0;
    let phase = 0;
    const status = this.text(270, 650, "跟隨靈氣的呼吸", 22, "#54736c");
    const timerLabel = this.text(270, 715, "剩餘 30 秒", 20, "#58746e");
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
      elapsed += 50;
      phase = (Math.sin((elapsed / 2200) * Math.PI * 2 - Math.PI / 2) + 1) / 2;
      const scale = 0.72 + phase * 0.42;
      aura.setScale(scale);
      inner.setScale(0.85 + phase * 0.25);
      const seconds = Math.max(0, 30 - Math.floor(elapsed / 1000));
      timerLabel.setText(`剩餘 ${seconds} 秒 · 穩定吐納 ${goodBreaths} 次`);
      if (elapsed >= 30000) this.finishBreathingTask(tutorial, breaths, goodBreaths);
    }});
  }

  private finishBreathingTask(tutorial: boolean, breaths: number, goodBreaths: number) {
    const score = breaths === 0 ? 0 : Math.round((goodBreaths / breaths) * 100);
    if (!tutorial) {
      this.grantTaskCultivation("吐納", score);
      return;
    }
    if (goodBreaths < 4) {
      this.reset();
      this.text(270, 180, `${this.player.name}：「師姐，我總是聚不起靈氣……」`, 22);
      this.text(270, 350, "慕清璃：「心浮，則氣散。」", 25, "#496b79");
      this.text(270, 425, "「再來。」", 30, "#496b79");
      this.button(270, 650, "重新吐納", () => this.playBreathingTask(true));
      return;
    }
    this.player.cultivation = Math.max(this.player.cultivation, REALMS.qi.cultivation[1]);
    this.saveGame();
    this.reset();
    this.text(270, 180, "慕清璃：「尚可。」", 31, "#496b79");
    this.text(270, 310, "本次引導修為已滿", 27, "#9b762c");
    this.text(270, 375, `修為 ${this.player.cultivation} / ${REALMS.qi.cultivation[1]}`, 23, "#54736c");
    this.text(270, 470, "「完成一次吐納，嘗試突破練氣二層。」", 21);
    this.button(270, 650, "突破練氣二層", () => this.showQiBreakthrough(true));
  }

  private showMainMenu() {
    this.reset();
    const realmLabel = this.player.realm === "foundation" ? "筑基" : "練氣";
    this.text(270, 80, `${realmLabel}${this.player.level}層`, 38);
    this.text(270, 125, `${this.player.name} · ${this.player.identity}`, 20, "#607d77");
    this.text(270, 220, "慕清璃：「勉強入門。」", 23);
    const actions: Record<string, () => void> = {
      修煉: () => this.showActivities(),
      問仙石: () => this.showStoneStatus(),
      [this.player.realm === "foundation" ? "外門差事" : "雜役差事"]: () => this.showActivities(),
      角色狀態: () => this.showCharacterStatus(),
    };
    ["修煉", "問仙石", this.player.realm === "foundation" ? "外門差事" : "雜役差事", "角色狀態"].forEach((label, index) => {
      const x = index % 2 === 0 ? 155 : 385;
      const y = 430 + Math.floor(index / 2) * 160;
      this.button(x, y, label, actions[label], 190);
    });
    const nextGoal = this.player.realm === "qi"
      ? (this.player.level < 9 ? `下一目標：修至練氣${this.player.level + 1}層` : "下一目標：突破筑基")
      : (this.player.level < 9 ? `下一目標：修至筑基${this.player.level + 1}層` : "下一目標：迎戰九重雷劫");
    this.text(270, 820, nextGoal, 24, "#9b762c");
    this.button(1070, 615, "場景移動", () => this.showSceneTravelLocked(), 210);
    const destroy = this.add.text(270, 902, "道心崩了", {
      fontFamily: '"Microsoft JhengHei", sans-serif',
      fontSize: "17px",
      color: "#8b4a43",
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    destroy.on("pointerup", () => this.showDestroyConfirmation());
    this.layer.add(destroy);
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
    this.reset();
    const current = ATTRIBUTES.reduce((sum, attribute) => sum + this.player.attributes[attribute], 0);
    const maximum = ATTRIBUTES.reduce((sum, attribute) => sum + (
      this.player.realm === "foundation"
        ? REALMS.qi.componentCaps[attribute] + REALMS.foundation.componentCaps[attribute]
        : REALMS.qi.componentCaps[attribute]
    ), 0);
    const rating = insightRating(current, maximum);
    this.text(270, 95, "問仙石驗證", 40);
    this.text(270, 210, `${rating.label}`, 48, rating.label === "道基不穩" ? "#8b4a43" : "#9b762c");
    this.text(270, 285, `四維總合完成度 ${rating.percent}%`, 24);
    const realmLabel = this.player.realm === "foundation" ? "筑基" : "練氣";
    this.text(270, 385, `目前總合 ${current}\n${realmLabel}圓滿總值 ${maximum}`, 22, "#58746e");
    this.text(270, 535, "此結果只作修煉參考，\n不改變突破概率。", 21);
    this.button(270, 720, "返回", () => this.showMainMenu(), 240);
  }

  private showCharacterStatus() {
    this.reset();
    this.text(270, 75, "角色狀態", 40);
    this.text(270, 135, `${this.player.name} · ${this.player.identity}`, 22, "#58746e");
    const realmLabel = this.player.realm === "foundation" ? "筑基" : "練氣";
    this.text(270, 185, `${ROOT_LABELS[this.player.root]} · ${realmLabel}${this.player.level}層`, 24, "#9b762c");
    ATTRIBUTES.forEach((attribute, index) => {
      this.text(270, 300 + index * 74, `${ATTRIBUTE_LABELS[attribute]}  ${this.player.attributes[attribute]}`, 26);
    });
    this.text(270, 620, `入門第 ${this.player.sectDay} 日 · ${this.timeLabel()}`, 20, "#58746e");
    this.text(270, 660, `累積修為 ${this.player.cultivation}`, 23);
    this.button(270, 750, "修行紀錄", () => this.showActivityHistory(), 240);
    this.button(270, 850, "返回", () => this.showMainMenu(), 240);
  }

  private showActivityHistory() {
    this.reset();
    this.text(270, 65, "修行紀錄", 38);
    this.text(270, 115, `${this.player.name} · ${this.player.identity}`, 21, "#58746e");
    this.text(270, 155, `入門第 ${this.player.sectDay} 日 · ${this.timeLabel()}`, 19, "#58746e");
    const realmLabel = this.player.realm === "foundation" ? "筑基境" : this.player.realm === "qi" ? "練氣境" : "尚未入境";
    this.text(270, 205, `${realmLabel}　${this.player.level > 0 ? `第 ${this.player.level} 層` : ""}`, 25, "#9b762c");
    this.text(270, 245, `累積修為 ${this.player.cultivation}`, 22, "#54736c");
    const activityOrder = ["砍竹", "挑水", "顧藥園", "參悟心法", "吐納", "經脈運氣", "閉關吐納"];
    activityOrder.forEach((task, index) => {
      const stats = this.player.activityStats[task] ?? { count: 0, cultivation: 0 };
      this.text(270, 315 + index * 58, `${task}　${stats.count} 次　累積修為 ${stats.cultivation}`, 19);
    });
    this.button(270, 850, "返回角色狀態", () => this.showCharacterStatus(), 280);
  }

  private showQiBreakthrough(tutorial = false) {
    this.reset();
    const targetLevel = this.player.level + 1;
    this.text(270, 80, `突破練氣${targetLevel}層`, 38);
    this.text(270, 130, "靈氣進入玉色區域時，連續定氣三次", 18, "#58746e");
    const track = this.add.rectangle(270, 410, 400, 54, 0x29413d, 0.94);
    const zoneWidth = Math.max(86, 155 - targetLevel * 6);
    const zone = this.add.rectangle(270, 410, zoneWidth, 54, COLORS.jade, 1);
    const marker = this.add.circle(100, 410, 22, COLORS.gold);
    this.layer.add([track, zone, marker]);
    this.tweens.add({ targets: marker, x: 440, duration: Math.max(650, 1100 - targetLevel * 35), yoyo: true, repeat: -1 });
    let rounds = 0;
    let scoreTotal = 0;
    const settle = this.button(270, 600, "定氣", () => {
      const distance = Math.abs(marker.x - 270);
      scoreTotal += distance <= zoneWidth / 2 ? 100 : distance <= zoneWidth ? 75 : 45;
      rounds += 1;
      if (rounds < 3) return;
      settle.disableInteractive();
      this.resolveQiBreakthrough(targetLevel, Math.ceil(scoreTotal / 3), tutorial);
    });
    this.text(270, 690, "判定寬鬆，失誤也可繼續完成", 17, "#66817c");
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
    this.reset();
    this.text(270, 95, "練氣一層 → 練氣二層", 34, "#9b762c");
    this.text(270, 165, "成長結果", 27);
    ATTRIBUTES.forEach((attribute, index) => {
      this.text(270, 255 + index * 62, `${ATTRIBUTE_LABELS[attribute]} +${gains[attribute]}`, 25, "#47786e");
    });
    this.text(270, 555, "不同靈根僅影響角色成長速度，\n但不會增加遊戲基本操作難度。", 20, "#58746e");
    this.button(270, 735, "聽師姐講解", () => this.showFoundationLesson());
  }

  private showFoundationLesson() {
    this.reset();
    this.text(270, 90, "慕清璃 · 境界指引", 34, "#496b79");
    this.text(270, 255, "「小境界的突破，不過是靈氣累積。」", 24);
    this.text(270, 355, "「真正的考驗，在練氣九層之後。」", 24);
    this.text(270, 455, "「現在，閉上眼睛。」", 28, "#496b79");
    this.button(270, 690, "閉上眼睛", () => this.showFoundationVision());
  }

  private showFoundationVision() {
    this.reset();
    const darkness = this.add.rectangle(270, 480, 540, 960, 0x07100f, 0.96);
    this.layer.add(darkness);
    this.text(270, 115, "神識所見", 32, "#d6b866");
    this.text(270, 205, "練氣九層之後，便是築基。\n築基丹可提升跨境成功機率。", 22, "#e8e0c8");
    const panel = this.add.graphics();
    panel.fillStyle(0xf3eddf, 0.94).fillRoundedRect(55, 335, 430, 300, 18);
    panel.lineStyle(3, COLORS.gold, 0.72).strokeRoundedRect(55, 335, 430, 300, 18);
    panel.lineStyle(2, COLORS.jade, 0.55).lineBetween(270, 365, 270, 605);
    this.layer.add(panel);
    this.text(162, 390, "突破成功", 25, "#47786e");
    this.text(162, 485, "角色氣息與服裝\n進入新的境界", 19);
    this.text(378, 390, "突破失敗", 25, "#8b4a43");
    this.text(378, 485, "境界跌落\n既有素質保留", 19);
    this.text(270, 665, "跨境必須親自突破；丹藥只提高成功機率。", 18, "#e8e0c8");
    this.button(270, 790, "睜開眼睛", () => this.finishFoundationLesson());
  }

  private finishFoundationLesson() {
    this.player.foundationLessonSeen = true;
    this.saveGame();
    this.reset();
    this.text(270, 180, `${this.player.name}：「剛才那是……」`, 24);
    this.text(270, 350, "慕清璃：", 25, "#496b79");
    this.text(270, 420, "「等你走到那一步，自然會明白。」", 23);
    this.text(270, 480, "「去修練吧。」", 27, "#496b79");
    this.text(270, 560, "（不再解釋。）", 18, "#66817c");
    this.button(270, 720, "開放自由行動", () => this.showMainMenu());
  }

  private showBreakthroughResult(success: boolean, result: string) {
    this.reset();
    const pulse = this.add.circle(270, 405, 80, success ? COLORS.jade : 0x7e4b44, 0.7);
    this.layer.add(pulse);
    this.tweens.add({ targets: pulse, scale: 2.2, alpha: 0, duration: 850 });
    this.text(270, 180, success ? "突破成功" : "突破失敗", 48, success ? "#47786e" : "#8b4a43");
    this.text(270, 300, result, 30);
    this.text(270, 515, success ? "四維已各自獨立取得本層成長" : "屬性完整保留，可重新修煉", 19, "#58746e");
    this.button(270, 680, "返回主介面", () => this.showMainMenu(), 280);
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
    this.reset();
    this.text(270, 75, "柳如煙", 38, "#806d93");
    const portrait = this.add.circle(270, 255, 105, 0xd7cce2).setStrokeStyle(4, COLORS.lilac);
    this.layer.add(portrait);
    this.text(270, 410, "「師弟／師妹好本事，\n竟修至練氣九層圓滿。」", 22);
    this.text(270, 510, "「這兩顆筑基丹，\n是我專門為你留的。」", 22, "#675b72");
    this.text(270, 610, `問仙石：${label}（${percent}%）`, 20, "#9b762c");
    this.button(270, 745, "收下筑基丹 ×2", () => {
      this.player.foundationPills += 2;
      this.player.metLiuRuyan = true;
      this.saveGame();
      this.showFoundationChoice(label, percent);
    });
  }

  private showFoundationChoice(label: string, percent: number) {
    this.reset();
    this.text(270, 75, "突破筑基", 42);
    this.text(270, 140, `問仙石：${label}（${percent}%）`, 21, "#9b762c");
    if (label === "道基不穩") {
      this.text(270, 205, "目前根基尚未穩固，仍可選擇快速突破。", 18, "#8b4a43");
    }
    this.text(270, 285, `筑基丹持有：${this.player.foundationPills}`, 22);
    this.button(270, 420, "裸衝", () => this.showFoundationMiniGame(false), 300);
    const pillButton = this.button(270, 525, "服丹突破（有效分數 +15）", () => this.showFoundationMiniGame(true), 390);
    if (this.player.foundationPills <= 0) pillButton.disableInteractive();
    this.button(270, 680, "主動墮境重修", () => {
      this.player.level = Phaser.Math.Between(6, 8);
      this.player.cultivation = 0;
      this.saveGame();
      this.showBreakthroughResult(false, `主動跌回練氣${this.player.level}層`);
    }, 320);
  }

  private showFoundationMiniGame(usedPill: boolean) {
    this.reset();
    const cave = this.add.image(270, 480, "foundation-cave");
    cave.setScale(Math.max(540 / cave.width, 960 / cave.height)).setAlpha(0.9);
    this.layer.add(cave);
    this.text(270, 65, usedPill ? "服丹筑基" : "裸衝筑基", 40, "#e8ddaf");
    this.text(270, 115, "依序穩定四維靈氣", 19, "#f0ead7");
    const scores: number[] = [];
    const labels = ["靈", "骨", "身", "神"];
    let active = 0;
    const marker = this.add.circle(100, 360, 19, COLORS.gold);
    const track = this.add.rectangle(270, 360, 390, 48, 0x182b28, 0.95);
    const zone = this.add.rectangle(270, 360, usedPill ? 150 : 105, 48, COLORS.jade, 1);
    this.layer.add([track, zone, marker]);
    this.tweens.add({ targets: marker, x: 440, duration: usedPill ? 950 : 760, yoyo: true, repeat: -1 });
    this.text(270, 245, labels[active], 46, "#e8ddaf");
    const lock = this.button(270, 570, "定住", () => {
      const distance = Math.abs(marker.x - 270);
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
    const flash = this.add.text(270, 245, label, { fontSize: "46px", color: "#e8ddaf" }).setOrigin(0.5);
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
    this.reset();
    const cave = this.add.image(270, 480, "foundation-cave");
    cave.setScale(Math.max(540 / cave.width, 960 / cave.height)).setAlpha(0.9);
    this.layer.add(cave);
    const pillar = this.add.rectangle(270, 470, 150, 650, 0xbfe9dc, 0.55);
    this.layer.add(pillar);
    this.tweens.add({ targets: pillar, alpha: 0.1, scaleX: 1.8, duration: 1200, yoyo: true });
    this.text(270, 150, "道基凝成", 48, "#e8ddaf");
    this.text(270, 230, "筑基一層", 42, "#d6b866");
    this.text(270, 590, `有效分數 ${score}\n身份晉升：外門弟子`, 24, "#f3ecd9");
    this.text(270, 690, "新外門道袍已換上", 20, "#cfe4dc");
    this.button(270, 800, "開始外門修行", () => this.showMainMenu(), 330);
  }

  private showFoundationCompleteNotice() {
    this.reset();
    this.text(270, 210, "練氣期完整測試完成", 38, "#47786e");
    this.text(270, 315, "你已凝聚道基，\n晉升筑基一層與外門弟子。", 25);
    this.text(270, 455, "筑基期內容將作為下一個完整境界開發。", 21, "#58746e");
    this.button(270, 650, "返回主介面", () => this.showMainMenu(), 280);
  }

  private showFoundationLevelBreakthrough() {
    this.reset();
    const targetLevel = this.player.level + 1;
    this.text(270, 82, `突破筑基${targetLevel}層`, 38);
    this.text(270, 132, "氣機越快，定氣區域越窄", 18, "#58746e");
    const track = this.add.rectangle(270, 410, 410, 58, 0x203633, 0.96);
    const width = Math.max(66, 142 - targetLevel * 8);
    const zone = this.add.rectangle(Phaser.Math.Between(190, 350), 410, width, 58, COLORS.jade, 1);
    const marker = this.add.circle(82, 410, 21, COLORS.gold);
    this.layer.add([track, zone, marker]);
    this.tweens.add({ targets: marker, x: 458, duration: Math.max(430, 900 - targetLevel * 42), yoyo: true, repeat: -1, ease: "Sine.inOut" });
    let rounds = 0;
    let total = 0;
    const settle = this.button(270, 590, "定氣", () => {
      const distance = Math.abs(marker.x - zone.x);
      total += distance <= width / 2 ? 100 : distance <= width ? 72 : 40;
      rounds += 1;
      if (rounds < 4) return;
      settle.disableInteractive();
      this.resolveFoundationLevelBreakthrough(targetLevel, Math.ceil(total / 4));
    }, 250);
    this.text(270, 690, "有效分數低於50將跌落1～3層，屬性保留", 17, "#785954");
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

