import { RhythmTimingController } from "../shared/RhythmTimingController";
import { BAMBOO_GAME_CONFIG } from "./config";

export type { RhythmGameState as BambooGameState, RhythmGameStats as BambooGameStats } from "../shared/RhythmTimingController";

export class BambooGameController extends RhythmTimingController {
  constructor() {
    super(BAMBOO_GAME_CONFIG);
  }

  cultivationReward() {
    const reward = BAMBOO_GAME_CONFIG.rewardFormula;
    return reward.baseCultivation
      + this.stats.perfect * reward.perfectBonus
      + this.stats.good * reward.goodBonus;
  }

  earlyCultivationReward(now: number) {
    return Math.max(
      BAMBOO_GAME_CONFIG.rewardFormula.baseCultivation,
      Math.round(this.cultivationReward() * this.elapsedRatio(now)),
    );
  }

  proficiency() {
    const attempts = this.stats.strikes + this.stats.miss;
    if (!attempts) return 0;
    return Math.round(
      ((this.stats.perfect + this.stats.good * 0.7 + this.stats.normal * 0.4) / attempts) * 100,
    );
  }
}
