import type { Move } from "../hooks/useFightControls";

export interface Combo {
  name: string;
  sequence: Move[];
  displayName: string;
  damageMultiplier: number;
  color: string;
  description: string;
}

export const COMBOS: Combo[] = [
  { name: "jab-combo",     sequence: ["punch", "punch"],                 displayName: "JAB COMBO",      damageMultiplier: 1.3,  color: "#FF3D6B", description: "Double punch" },
  { name: "rapid-fire",    sequence: ["punch", "kick"],                  displayName: "RAPID FIRE",     damageMultiplier: 1.4,  color: "#FF6B35", description: "Punch into kick" },
  { name: "slam-dunk",     sequence: ["jump", "punch"],                  displayName: "SLAM DUNK",      damageMultiplier: 1.5,  color: "#00BFFF", description: "Jump then punch" },
  { name: "low-high",      sequence: ["slide", "punch"],                 displayName: "LOW-HIGH",       damageMultiplier: 1.35, color: "#FF9500", description: "Slide into punch" },
  { name: "crusher",       sequence: ["punch", "kick", "punch"],         displayName: "CRUSHER",        damageMultiplier: 1.6,  color: "#FF3D6B", description: "3-hit devastator" },
  { name: "void-strike",   sequence: ["jump", "weapon-strike"],          displayName: "VOID STRIKE",    damageMultiplier: 1.7,  color: "#7B2FFF", description: "Aerial weapon attack" },
  { name: "berserker",     sequence: ["punch", "punch", "kick"],         displayName: "BERSERKER",      damageMultiplier: 1.65, color: "#ef4444", description: "Berserker rush" },
  { name: "iron-will",     sequence: ["block", "weapon-strike"],         displayName: "IRON WILL",      damageMultiplier: 1.5,  color: "#c0c0c0", description: "Counter-attack" },
  { name: "perfect-storm", sequence: ["kick", "slide", "weapon-strike"], displayName: "PERFECT STORM",  damageMultiplier: 2.0,  color: "#7B2FFF", description: "Ultimate finisher" },
];

// Check if the last N moves in moveHistory match any combo
export function detectCombo(moveHistory: Move[]): Combo | null {
  for (const combo of [...COMBOS].sort((a, b) => b.sequence.length - a.sequence.length)) {
    const len = combo.sequence.length;
    const recent = moveHistory.slice(-len);
    if (recent.length === len && recent.every((m, i) => m === combo.sequence[i])) {
      return combo;
    }
  }
  return null;
}
