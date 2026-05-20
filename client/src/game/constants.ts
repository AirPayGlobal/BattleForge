export const ARENA_BOUNDS = 4.5;
export const SPAWN_DIST = 2.6;

export const ROUND_TIME = 90;             // seconds
export const ROUNDS_TO_WIN = 2;            // best of 3

export const WALK_SPEED = 2.4;             // units / sec
export const DASH_SPEED = 5.4;
export const JUMP_VELOCITY = 5.6;
export const GRAVITY = -16;

export const MAX_HEALTH = 100;
export const MAX_ENERGY = 100;
export const ULT_COST = 100;

// Action definition: how long, when it can hit, how much it does.
export interface ActionDef {
  duration: number;        // total animation seconds
  windupEnd: number;       // hit window starts here
  hitWindowEnd: number;    // hit window ends here
  damage: number;
  range: number;
  energyGainOnHit: number;
  energyGainOnBlock: number;
  recoveryLock: number;    // can't act until this fraction of action elapsed
  heavy: boolean;
  pushback: number;
}

export const ACTIONS: Record<string, ActionDef> = {
  punch: {
    duration: 0.40, windupEnd: 0.10, hitWindowEnd: 0.22,
    damage: 7, range: 1.55,
    energyGainOnHit: 7, energyGainOnBlock: 3,
    recoveryLock: 0.85, heavy: false, pushback: 0.10,
  },
  kick: {
    duration: 0.50, windupEnd: 0.16, hitWindowEnd: 0.32,
    damage: 11, range: 1.90,
    energyGainOnHit: 9, energyGainOnBlock: 4,
    recoveryLock: 0.85, heavy: false, pushback: 0.18,
  },
  "weapon-strike": {
    duration: 0.62, windupEnd: 0.22, hitWindowEnd: 0.42,
    damage: 17, range: 2.25,
    energyGainOnHit: 12, energyGainOnBlock: 6,
    recoveryLock: 0.85, heavy: true, pushback: 0.40,
  },
  ultimate: {
    duration: 1.60, windupEnd: 0.40, hitWindowEnd: 1.10,
    damage: 42, range: 2.80,
    energyGainOnHit: 0, energyGainOnBlock: 0,
    recoveryLock: 0.92, heavy: true, pushback: 0.95,
  },
  jump: {
    duration: 0.85, windupEnd: 0.0, hitWindowEnd: 0.0,
    damage: 0, range: 0,
    energyGainOnHit: 0, energyGainOnBlock: 0,
    recoveryLock: 0.55, heavy: false, pushback: 0,
  },
  slide: {
    duration: 0.40, windupEnd: 0.0, hitWindowEnd: 0.0,
    damage: 0, range: 0,
    energyGainOnHit: 0, energyGainOnBlock: 0,
    recoveryLock: 0.80, heavy: false, pushback: 0,
  },
  block: {
    duration: 0.20, windupEnd: 0.0, hitWindowEnd: 0.0,
    damage: 0, range: 0,
    energyGainOnHit: 0, energyGainOnBlock: 0,
    recoveryLock: 0, heavy: false, pushback: 0,
  },
  hit: {
    duration: 0.45, windupEnd: 0.0, hitWindowEnd: 0.0,
    damage: 0, range: 0,
    energyGainOnHit: 0, energyGainOnBlock: 0,
    recoveryLock: 0.95, heavy: false, pushback: 0,
  },
};

export function isAttackAction(a: string): boolean {
  return a === "punch" || a === "kick" || a === "weapon-strike" || a === "ultimate";
}

export function getActionDef(a: string): ActionDef | undefined {
  return ACTIONS[a];
}
