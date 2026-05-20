import type { CombatEngine } from "./engine";
import type { PlayerInput } from "./types";
import { NEUTRAL_INPUT } from "./types";
import { ULT_COST } from "./constants";

/**
 * Lightweight reactive AI. Returns the input for player 2.
 *
 * Tunable: aggression, blockChance.
 */
export interface AIConfig {
  difficulty: "easy" | "normal" | "hard";
}

const TUNE = {
  easy:   { reactDelay: 0.45, aggression: 0.45, blockChance: 0.18, retreatThresh: 32 },
  normal: { reactDelay: 0.28, aggression: 0.65, blockChance: 0.32, retreatThresh: 25 },
  hard:   { reactDelay: 0.16, aggression: 0.80, blockChance: 0.48, retreatThresh: 18 },
};

export function makeAIController(cfg: AIConfig = { difficulty: "normal" }) {
  const tune = TUNE[cfg.difficulty];
  let nextDecisionAt = 0;
  let intent: PlayerInput = { ...NEUTRAL_INPUT };

  return function aiInput(engine: CombatEngine): PlayerInput {
    const me   = engine.p2;
    const them = engine.p1;
    const now  = engine.now;

    // hold movement decisions briefly; new attacks each window
    if (now < nextDecisionAt) return intent;

    const dist = Math.abs(them.x - me.x);
    intent = { ...NEUTRAL_INPUT };

    // Block reactively if opponent is in attack animation and we're in range
    const theyAttacking =
      them.action === "punch" || them.action === "kick" || them.action === "weapon-strike";
    if (theyAttacking && dist < 2.6 && Math.random() < tune.blockChance) {
      intent.block = true;
      nextDecisionAt = now + 0.25;
      return intent;
    }

    // Ultimate when ready + close
    if (me.energy >= ULT_COST && dist < 3.2 && Math.random() < 0.75) {
      intent.ultimate = true;
      nextDecisionAt = now + 0.55;
      return intent;
    }

    // Low health → retreat sometimes
    if (me.health < tune.retreatThresh && dist < 3 && Math.random() < 0.5) {
      // back away
      intent[me.x < them.x ? "left" : "right"] = true;
      nextDecisionAt = now + 0.4;
      return intent;
    }

    // Close → attack
    if (dist < 2.0) {
      const r = Math.random();
      if (r < 0.40) intent.light = true;
      else if (r < 0.70) intent.kick = true;
      else if (r < 0.92) intent.heavy = true;
      else intent.block = true;
      nextDecisionAt = now + (0.30 + Math.random() * 0.30);
      return intent;
    }

    // Medium → close in or whiff weapon-strike
    if (dist < 3.5) {
      if (Math.random() < tune.aggression) {
        intent[me.x < them.x ? "right" : "left"] = true;
        nextDecisionAt = now + tune.reactDelay;
      } else if (Math.random() < 0.35) {
        intent.heavy = true;
        nextDecisionAt = now + 0.6;
      } else {
        intent[me.x < them.x ? "right" : "left"] = true;
        nextDecisionAt = now + tune.reactDelay;
      }
      return intent;
    }

    // Far → walk toward opponent
    intent[me.x < them.x ? "right" : "left"] = true;

    // Occasional jump-in
    if (Math.random() < 0.10) intent.jump = true;
    nextDecisionAt = now + 0.30;
    return intent;
  };
}
