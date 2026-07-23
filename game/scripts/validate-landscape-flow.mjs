import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const scenePath = resolve(root, "src/scenes/OpeningScene.ts");
const source = readFileSync(scenePath, "utf8");

const requiredLandscapeMethods = [
  "showGenderChoice",
  "showNameEntry",
  "showStoneIntro",
  "showChoreOfficeSceneCard",
  "showActivities",
  "playBambooTask",
  "playWaterTask",
  "playHerbTask",
  "playMantraTask",
  "showInsight",
  "showInsightDrag",
  "showInsightTiming",
  "playBreathingTask",
  "showMainMenu",
  "showQiBreakthrough",
  "showFoundationMiniGame",
  "showFoundationLevelBreakthrough",
  "showFoundationCompleteNotice",
];

function methodBody(name) {
  const start = source.indexOf(`private ${name}(`);
  if (start < 0) throw new Error(`missing method: ${name}`);
  const next = source.indexOf("\n  private ", start + 10);
  return source.slice(start, next < 0 ? source.length : next);
}

let failed = false;
for (const method of requiredLandscapeMethods) {
  const body = methodBody(method);
  if (!body.includes("this.resetLandscape();")) {
    console.error(`✗ ${method} 未使用原生橫向 resetLandscape()`);
    failed = true;
  } else {
    console.log(`✓ ${method} 使用原生橫向場景`);
  }
}

const requiredAssets = [
  "public/assets/scenes/question-stone-courtyard-background-v2.png",
  "public/assets/scenes/question-stone-isolated-neutral-v2.png",
  "public/assets/scenes/chore-office-story-card-v1.png",
  "public/assets/scenes/foundation-cave-v1.png",
  "public/assets/ui/hud/backpack-ink-v2.png",
];

for (const asset of requiredAssets) {
  if (!existsSync(resolve(root, asset))) {
    console.error(`✗ 缺少流程資產：${asset}`);
    failed = true;
  } else {
    console.log(`✓ 流程資產存在：${asset}`);
  }
}

if (!source.includes("if (this.player.realm === \"foundation\") return REALMS.foundation.cultivation")) {
  console.error("✗ cultivationTarget() 缺少筑基境界目標");
  failed = true;
} else {
  console.log("✓ 筑基境界修為目標已接入");
}

if (failed) process.exit(1);
