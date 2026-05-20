import { create } from "zustand";
import type { FighterId } from "../data/characters";
import type { StageId } from "../data/stages";
import type { GamePhase, Role } from "./types";

interface GameStoreState {
  phase: GamePhase;

  // selections
  p1Id: FighterId;
  p2Id: FighterId;
  stageId: StageId;

  // match progress
  round: number;
  p1RoundsWon: number;
  p2RoundsWon: number;
  matchWinner: Role | null;

  // controls
  audioEnabled: boolean;
}

interface GameStoreActions {
  setPhase: (p: GamePhase) => void;
  selectP1: (id: FighterId) => void;
  selectP2: (id: FighterId) => void;
  selectStage: (id: StageId) => void;
  recordRound: (winner: Role) => void;
  resetMatch: () => void;
  setMatchWinner: (r: Role | null) => void;
  toggleAudio: () => void;
}

export const useGameStore = create<GameStoreState & GameStoreActions>((set) => ({
  phase: "BOOT",

  p1Id: "vanguard",
  p2Id: "shiva",
  stageId: "neon-temple",

  round: 1,
  p1RoundsWon: 0,
  p2RoundsWon: 0,
  matchWinner: null,

  audioEnabled: true,

  setPhase: (phase) => set({ phase }),
  selectP1:  (id) => set({ p1Id: id }),
  selectP2:  (id) => set({ p2Id: id }),
  selectStage: (id) => set({ stageId: id }),
  recordRound: (winner) => set((s) => ({
    p1RoundsWon: winner === "p1" ? s.p1RoundsWon + 1 : s.p1RoundsWon,
    p2RoundsWon: winner === "p2" ? s.p2RoundsWon + 1 : s.p2RoundsWon,
  })),
  setMatchWinner: (r) => set({ matchWinner: r }),
  resetMatch: () => set({
    round: 1, p1RoundsWon: 0, p2RoundsWon: 0, matchWinner: null,
  }),
  toggleAudio: () => set((s) => ({ audioEnabled: !s.audioEnabled })),
}));
