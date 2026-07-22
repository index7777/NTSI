export type CharacterId =
  | "player-male"
  | "player-female"
  | "sect-elder"
  | "mu-qingli"
  | "liu-ruyan"
  | "outer-sect-steward";

export type PortraitExpression = "neutral" | "serious" | "gentle" | "concerned" | "disappointed";

export interface CharacterPresentation {
  displayName: string;
  runtimeKey?: string;
  outfit: string;
  approvedExpressions: readonly PortraitExpression[];
  plannedExpressions: readonly PortraitExpression[];
}

export const CHARACTER_PRESENTATIONS: Record<CharacterId, CharacterPresentation> = {
  "player-male": { displayName: "玩家", runtimeKey: "player-male-choice", outfit: "novice", approvedExpressions: ["neutral"], plannedExpressions: ["serious", "concerned"] },
  "player-female": { displayName: "玩家", runtimeKey: "player-female-choice", outfit: "novice", approvedExpressions: ["neutral"], plannedExpressions: ["serious", "concerned"] },
  "sect-elder": { displayName: "宗門執事", runtimeKey: "sect-elder", outfit: "steward", approvedExpressions: ["neutral"], plannedExpressions: ["serious", "gentle"] },
  "mu-qingli": { displayName: "慕清璃", outfit: "sect-senior", approvedExpressions: ["neutral"], plannedExpressions: ["serious", "gentle", "disappointed"] },
  "liu-ruyan": { displayName: "柳如煙", outfit: "outer-senior", approvedExpressions: ["neutral"], plannedExpressions: ["gentle", "concerned"] },
  "outer-sect-steward": { displayName: "外門執事", outfit: "outer-steward", approvedExpressions: ["neutral"], plannedExpressions: ["serious"] },
};
