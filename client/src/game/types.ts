import type { SpriteAction } from "../components/Arena3D/Fighter3D";
import type { FighterId } from "../data/characters";
import type { StageId } from "../data/stages";

export type GamePhase =
  | "BOOT"
  | "MAIN_MENU"
  | "CHARACTER_SELECT"
  | "MATCH_INTRO"
  | "FIGHT"
  | "ROUND_END"
  | "KO"
  | "MATCH_END";

export type Role = "p1" | "p2";

export interface FighterRuntime {
  role: Role;
  fighterId: FighterId;
  meshKey: string;

  // physics
  x: number;
  y: number;
  vx: number;
  vy: number;
  facingRight: boolean;

  // animation
  action: SpriteAction;
  actionStartTime: number;
  actionEndTime: number;
  // hit-window flags
  hasHitInAction: boolean;
  hitstunUntil: number;
  blockstunUntil: number;
  isBlocking: boolean;

  // resources
  health: number;
  maxHealth: number;
  energy: number;            // 0..100
  ultReady: boolean;

  // combo
  comboCount: number;
  comboTimer: number;        // wall-clock seconds when combo expires

  // round wins
  roundsWon: number;
}

export interface HitEvent {
  type: "hit" | "block" | "ko" | "ultimate";
  attacker: Role;
  target: Role;
  damage: number;
  heavy: boolean;
  time: number;
  x: number;
  y: number;
}

export interface PlayerInput {
  left: boolean;
  right: boolean;
  jump: boolean;
  block: boolean;
  light: boolean;     // edge-trigger
  heavy: boolean;     // edge-trigger
  kick: boolean;      // edge-trigger
  ultimate: boolean;  // edge-trigger
}

export const NEUTRAL_INPUT: PlayerInput = {
  left: false, right: false, jump: false, block: false,
  light: false, heavy: false, kick: false, ultimate: false,
};
