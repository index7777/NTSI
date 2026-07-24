import { RhythmTimingController } from "../shared/RhythmTimingController";
import { HEART_MANUAL_CONFIG } from "./config";

export class HeartManualGameController extends RhythmTimingController {
  constructor() {
    super(HEART_MANUAL_CONFIG);
  }

  cultivationReward() {
    const reward = HEART_MANUAL_CONFIG.rewardFormula;
    return reward.baseCultivation
      + this.stats.perfect * reward.perfectBonus
      + this.stats.good * reward.goodBonus;
  }

  earlyCultivationReward(now: number) {
    return Math.max(
      HEART_MANUAL_CONFIG.rewardFormula.baseCultivation,
      Math.round(this.cultivationReward() * this.elapsedRatio(now)),
    );
  }

  currentCultivationReward() {
    return this.stats.perfect * 3 + this.stats.good * 2 + this.stats.normal;
  }

  proficiency() {
    const attempts = this.stats.strikes + this.stats.miss;
    if (!attempts) return 0;
    return Math.round(
      ((this.stats.perfect + this.stats.good * 0.7 + this.stats.normal * 0.4) / attempts) * 100,
    );
  }
}
