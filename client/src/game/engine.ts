import type { SpriteAction } from "../components/Arena3D/Fighter3D";
import { getFighter, type FighterId } from "../data/characters";
import type { FighterRuntime, HitEvent, PlayerInput, Role } from "./types";
import { NEUTRAL_INPUT } from "./types";
import {
  ACTIONS, ARENA_BOUNDS, DASH_SPEED, GRAVITY, JUMP_VELOCITY, MAX_ENERGY,
  MAX_HEALTH, ROUND_TIME, SPAWN_DIST, ULT_COST, WALK_SPEED,
  getActionDef, isAttackAction,
} from "./constants";

function spawn(role: Role, fighterId: FighterId): FighterRuntime {
  const f = getFighter(fighterId);
  return {
    role,
    fighterId,
    meshKey: f.meshKey,
    x: role === "p1" ? -SPAWN_DIST : SPAWN_DIST,
    y: 0,
    vx: 0,
    vy: 0,
    facingRight: role === "p1",
    action: "idle",
    actionStartTime: -10,
    actionEndTime: -10,
    hasHitInAction: false,
    hitstunUntil: -10,
    blockstunUntil: -10,
    isBlocking: false,
    health: MAX_HEALTH,
    maxHealth: MAX_HEALTH,
    energy: 0,
    ultReady: false,
    comboCount: 0,
    comboTimer: -10,
    roundsWon: 0,
  };
}

const clamp = (v: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, v));

export type EnginePhase = "intro" | "fight" | "round_end" | "ko" | "match_end";

export interface EngineSnapshot {
  phase: EnginePhase;
  timeLeft: number;
  round: number;             // 1-based current round
  roundStartedAt: number;
  p1: FighterRuntime;
  p2: FighterRuntime;
  events: HitEvent[];
  shake: number;             // 0..1 visual intensity
}

export interface EngineConfig {
  p1Id: FighterId;
  p2Id: FighterId;
  roundsToWin: number;
}

/**
 * Headless combat engine. The MatchScene ticks it with dt and reads snapshots.
 * Inputs are pushed each frame (edge-triggered keys are reset by the input layer).
 */
export class CombatEngine {
  cfg: EngineConfig;
  phase: EnginePhase = "intro";
  timeLeft: number = ROUND_TIME;
  round = 1;
  now = 0;                   // accumulated simulated time (seconds)
  roundStartedAt = 0;
  p1: FighterRuntime;
  p2: FighterRuntime;
  events: HitEvent[] = [];
  shake = 0;

  p1Input: PlayerInput = { ...NEUTRAL_INPUT };
  p2Input: PlayerInput = { ...NEUTRAL_INPUT };

  constructor(cfg: EngineConfig) {
    this.cfg = cfg;
    this.p1 = spawn("p1", cfg.p1Id);
    this.p2 = spawn("p2", cfg.p2Id);
  }

  setInput(role: Role, input: PlayerInput) {
    if (role === "p1") this.p1Input = input;
    else this.p2Input = input;
  }

  /** Begin the action cinematic. Call this when player closes the intro overlay. */
  startFight() {
    this.phase = "fight";
    this.roundStartedAt = this.now;
    this.timeLeft = ROUND_TIME;
  }

  /** Reset positions/health for the next round. */
  startNextRound() {
    const p1Wins = this.p1.roundsWon;
    const p2Wins = this.p2.roundsWon;
    if (p1Wins >= this.cfg.roundsToWin || p2Wins >= this.cfg.roundsToWin) {
      this.phase = "match_end";
      return;
    }
    this.round += 1;
    this.p1 = { ...spawn("p1", this.cfg.p1Id), roundsWon: p1Wins };
    this.p2 = { ...spawn("p2", this.cfg.p2Id), roundsWon: p2Wins };
    this.phase = "intro";
    this.timeLeft = ROUND_TIME;
    this.events = [];
  }

  startAction(f: FighterRuntime, action: SpriteAction) {
    f.action = action;
    f.actionStartTime = this.now;
    const def = getActionDef(action);
    f.actionEndTime = this.now + (def ? def.duration : 0.4);
    f.hasHitInAction = false;
    if (action === "block") f.isBlocking = true;
    else if (action !== "hit") f.isBlocking = false;
  }

  canAct(f: FighterRuntime): boolean {
    if (f.action === "idle" || f.action === "block") return true;
    const def = getActionDef(f.action);
    if (!def) return true;
    const elapsed = this.now - f.actionStartTime;
    return elapsed >= def.duration * def.recoveryLock;
  }

  /** Process per-frame input edges into actions. */
  applyInput(role: Role) {
    const f = role === "p1" ? this.p1 : this.p2;
    const i = role === "p1" ? this.p1Input : this.p2Input;
    const grounded = f.y <= 0.001;

    // Block (hold)
    if (i.block && this.canAct(f) && grounded) {
      if (f.action !== "block") this.startAction(f, "block");
      f.isBlocking = true;
    } else if (f.action === "block") {
      // exit block
      f.action = "idle";
      f.isBlocking = false;
    }

    if (!this.canAct(f)) return;

    // Ultimate (consumes meter)
    if (i.ultimate && f.energy >= ULT_COST) {
      this.startAction(f, "weapon-strike");
      // override duration/range/dmg via a temp marker
      f.action = "weapon-strike";
      f.actionEndTime = this.now + ACTIONS["ultimate"].duration;
      f.hasHitInAction = false;
      f.energy = 0;
      f.ultReady = false;
      this.events.push({
        type: "ultimate", attacker: role, target: role === "p1" ? "p2" : "p1",
        damage: 0, heavy: true, time: this.now, x: f.x, y: f.y,
      });
      // tag this attack as ultimate via a side channel
      (f as FighterRuntime & { _ult?: boolean })._ult = true;
      return;
    }

    if (i.heavy) {
      this.startAction(f, "weapon-strike");
      return;
    }
    if (i.kick) {
      this.startAction(f, "kick");
      return;
    }
    if (i.light) {
      this.startAction(f, "punch");
      return;
    }
    if (i.jump && grounded) {
      f.vy = JUMP_VELOCITY;
      this.startAction(f, "jump");
      return;
    }
  }

  /** Move + physics for a fighter. */
  stepFighter(f: FighterRuntime, i: PlayerInput, dt: number) {
    const grounded = f.y <= 0.001;

    // movement allowed during idle/block/jump
    let moveAxis = 0;
    if (i.left)  moveAxis -= 1;
    if (i.right) moveAxis += 1;

    const movable = f.action === "idle" || f.action === "block" || f.action === "jump";
    const speed = movable ? WALK_SPEED : WALK_SPEED * 0.25;
    f.vx = movable || !grounded ? moveAxis * speed : 0;
    f.x = clamp(f.x + f.vx * dt, -ARENA_BOUNDS, ARENA_BOUNDS);

    // vertical
    if (!grounded || f.vy > 0) {
      f.vy += GRAVITY * dt;
      f.y = Math.max(0, f.y + f.vy * dt);
      if (f.y <= 0) { f.y = 0; f.vy = 0; }
    }

    // expire action
    if (this.now >= f.actionEndTime && f.action !== "idle" && f.action !== "block" && f.action !== "defeat" && f.action !== "victory") {
      if (f.action === "jump" && !grounded) {
        // still airborne, keep jump
      } else {
        f.action = i.block ? "block" : "idle";
        f.isBlocking = !!i.block;
        f.hasHitInAction = false;
        delete (f as FighterRuntime & { _ult?: boolean })._ult;
      }
    }

    // combo timeout
    if (f.comboCount > 0 && this.now > f.comboTimer) {
      f.comboCount = 0;
    }

    // ult flag
    f.ultReady = f.energy >= ULT_COST;
  }

  /** Face opponent automatically. */
  faceOpponent(f: FighterRuntime, other: FighterRuntime) {
    if (f.action === "idle" || f.action === "block" || f.action === "jump") {
      f.facingRight = other.x > f.x;
    }
  }

  tryHit(attacker: FighterRuntime, target: FighterRuntime) {
    if (!isAttackAction(attacker.action)) return;
    if (attacker.hasHitInAction) return;

    const isUlt = !!(attacker as FighterRuntime & { _ult?: boolean })._ult;
    const def = isUlt ? ACTIONS["ultimate"] : getActionDef(attacker.action);
    if (!def) return;

    const elapsed = this.now - attacker.actionStartTime;
    if (elapsed < def.windupEnd || elapsed > def.hitWindowEnd) return;

    const dx = target.x - attacker.x;
    const dist = Math.abs(dx);
    if (dist > def.range) return;
    if (Math.abs(attacker.y - target.y) > 1.4 && !isUlt) return;

    // facing check
    const facingTarget = (dx > 0) === attacker.facingRight;
    if (!facingTarget) return;

    attacker.hasHitInAction = true;

    const blocked = target.isBlocking && !isUlt;
    const damage = blocked ? def.damage * 0.18 : def.damage;
    target.health = Math.max(0, target.health - damage);

    attacker.energy = Math.min(MAX_ENERGY, attacker.energy + (blocked ? def.energyGainOnBlock : def.energyGainOnHit));
    target.energy   = Math.min(MAX_ENERGY, target.energy + (blocked ? 2 : 5));

    const dir = dx >= 0 ? 1 : -1;
    target.x = clamp(target.x + dir * def.pushback, -ARENA_BOUNDS, ARENA_BOUNDS);

    if (!blocked) {
      this.startAction(target, "hit");
      attacker.comboCount += 1;
      attacker.comboTimer = this.now + 1.6;
      this.shake = Math.min(1, this.shake + (def.heavy ? 0.85 : 0.45));
    } else {
      // keep block state, brief stagger
      target.blockstunUntil = this.now + 0.12;
      this.shake = Math.min(1, this.shake + 0.18);
    }

    this.events.push({
      type: blocked ? "block" : "hit",
      attacker: attacker.role,
      target: target.role,
      damage,
      heavy: def.heavy,
      time: this.now,
      x: (attacker.x + target.x) / 2,
      y: target.y + 1.2,
    });

    if (target.health <= 0) {
      this.phase = "ko";
      this.startAction(target, "defeat");
      this.startAction(attacker, "victory");
      // award round
      attacker.roundsWon += 1;
      this.events.push({
        type: "ko", attacker: attacker.role, target: target.role,
        damage: 0, heavy: true, time: this.now, x: target.x, y: target.y + 1.2,
      });
    }
  }

  /** Advance simulation. */
  tick(dt: number) {
    this.now += dt;
    this.shake = Math.max(0, this.shake - dt * 1.6);

    if (this.phase !== "fight") return;

    this.timeLeft = Math.max(0, this.timeLeft - dt);

    this.applyInput("p1");
    this.applyInput("p2");

    this.stepFighter(this.p1, this.p1Input, dt);
    this.stepFighter(this.p2, this.p2Input, dt);

    this.faceOpponent(this.p1, this.p2);
    this.faceOpponent(this.p2, this.p1);

    this.tryHit(this.p1, this.p2);
    this.tryHit(this.p2, this.p1);

    // Time-out → highest health wins
    if (this.timeLeft <= 0 && this.phase === "fight") {
      this.phase = "ko";
      const winner = this.p1.health > this.p2.health ? this.p1 : this.p2;
      const loser  = winner === this.p1 ? this.p2 : this.p1;
      this.startAction(loser, "defeat");
      this.startAction(winner, "victory");
      winner.roundsWon += 1;
      this.events.push({
        type: "ko", attacker: winner.role, target: loser.role,
        damage: 0, heavy: true, time: this.now, x: loser.x, y: loser.y + 1.2,
      });
    }
  }

  /** Drain the event queue and return it. */
  drainEvents(): HitEvent[] {
    const list = this.events;
    this.events = [];
    return list;
  }
}
