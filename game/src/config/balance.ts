export const ATTRIBUTES = ["spirit", "bone", "body", "sense"] as const;
export type Attribute = (typeof ATTRIBUTES)[number];

export const ATTRIBUTE_LABELS: Record<Attribute, string> = {
  spirit: "靈氣",
  bone: "根骨",
  body: "肉身",
  sense: "神識",
};

export const ROOT_MULTIPLIERS = {
  mixed: 0.6,
  triple: 0.8,
  dual: 1,
  single: 1.3,
} as const;

export const INITIAL_ATTRIBUTE_RANGE: Record<Attribute, readonly [number, number]> = {
  spirit: [10, 22],
  bone: [8, 18],
  body: [9, 20],
  sense: [7, 16],
};

export type RealmId = "qi" | "foundation" | "goldenCore";

export interface RealmBalance {
  label: string;
  rollRanges: readonly [readonly [number, number], readonly [number, number], readonly [number, number]];
  componentCaps: Record<Attribute, number>;
  cultivation: readonly number[];
}

const qiCultivation = [100, 135, 183, 247, 333, 450, 608, 821, 1109] as const;
const foundationCultivation = [2218, 3106, 4348, 6088, 8523, 11932, 16705, 23387, 32742] as const;
const goldenCoreCultivation = [81855, 118690, 172101, 249547, 361843, 524673, 760776, 1103126, 1599533] as const;

export const REALMS: Record<RealmId, RealmBalance> = {
  qi: {
    label: "練氣",
    rollRanges: [[2, 6], [4, 11], [7, 18]],
    componentCaps: { spirit: 220, bone: 180, body: 190, sense: 160 },
    cultivation: qiCultivation,
  },
  foundation: {
    label: "筑基",
    rollRanges: [[8, 18], [14, 30], [22, 45]],
    componentCaps: { spirit: 440, bone: 360, body: 380, sense: 320 },
    cultivation: foundationCultivation,
  },
  goldenCore: {
    label: "金丹",
    rollRanges: [[25, 45], [40, 70], [60, 100]],
    componentCaps: { spirit: 840, bone: 660, body: 730, sense: 620 },
    cultivation: goldenCoreCultivation,
  },
};

export const GROWTH_QUALITY_POOLS = {
  pill: {
    low: { low: 70, standard: 30, high: 0 },
    mid: { low: 15, standard: 85, high: 0 },
    high: { low: 0, standard: 60, high: 40 },
  },
  bare: {
    low: { low: 90, standard: 10, high: 0 },
    mid: { low: 20, standard: 80, high: 0 },
    high: { low: 0, standard: 75, high: 25 },
  },
} as const;

export function levelBand(level: number): 0 | 1 | 2 {
  if (level <= 3) return 0;
  if (level <= 6) return 1;
  return 2;
}

export function cumulativeMaxGrowth(realm: RealmId, level: number): number {
  let sum = 0;
  for (let current = 1; current <= level; current += 1) {
    sum += REALMS[realm].rollRanges[levelBand(current)][1];
  }
  return sum;
}

export function componentCapAtLevel(realm: RealmId, attribute: Attribute, level: number): number {
  const finalCap = REALMS[realm].componentCaps[attribute];
  const progress = cumulativeMaxGrowth(realm, level) / cumulativeMaxGrowth(realm, 9);
  return Math.ceil(finalCap * progress);
}

export function qiComponentCapAtLevel(
  attribute: Attribute,
  initialValue: number,
  level: number,
): number {
  const finalCap = REALMS.qi.componentCaps[attribute];
  const progress = cumulativeMaxGrowth("qi", level) / cumulativeMaxGrowth("qi", 9);
  return Math.ceil(initialValue + (finalCap - initialValue) * progress);
}

export function effectiveGrowth(baseRoll: number, rootMultiplier: number): number {
  return Math.ceil(baseRoll * rootMultiplier);
}

export function effectiveBreakthroughScore(rawScore: number, usedPill: boolean): number {
  return Math.min(100, Math.max(0, rawScore + (usedPill ? 15 : 0)));
}

export function scoreBand(score: number): "failed" | "low" | "mid" | "high" {
  if (score < 50) return "failed";
  if (score <= 74) return "low";
  if (score <= 84) return "mid";
  return "high";
}

export function insightRating(currentTotal: number, maximumTotal: number) {
  if (currentTotal >= maximumTotal) return { percent: 100, label: "圓滿" } as const;
  const percent = Math.min(99, Math.ceil((currentTotal / maximumTotal) * 100));
  if (percent < 75) return { percent, label: "道基不穩" } as const;
  if (percent < 85) return { percent, label: "小成" } as const;
  return { percent, label: "大成" } as const;
}
