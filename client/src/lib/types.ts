// ═══════════════════════════════════
// BattleForge — Shared Types
// ═══════════════════════════════════

export type WeaponClass = "BLADE" | "POLEARM" | "RANGED" | "FORGE_ARTIFACT" | "GAUNTLET";
export type WeaponRank =
  | "IRON_I"
  | "BRONZE_II"
  | "STEEL_III"
  | "OBSIDIAN_IV"
  | "VOID_V"
  | "INFERNO_VI"
  | "ETERNAL_VII";

export type DuelStatus = "PENDING" | "ACCEPTED" | "IN_PROGRESS" | "COMPLETED" | "DECLINED" | "CANCELLED";

export type NotificationType =
  | "CHALLENGE_RECEIVED"
  | "CHALLENGE_ACCEPTED"
  | "CHALLENGE_DECLINED"
  | "DUEL_WON"
  | "DUEL_LOST"
  | "WEAPON_WON"
  | "WEAPON_LOST"
  | "GAUNTLET_ISSUED"
  | "GAUNTLET_EARNED"
  | "QUEST_PROGRESS"
  | "SYSTEM";

export interface Character {
  id: string;
  name: string;
  description: string;
  imageUrl?: string;
  isDefault: boolean;
}

export interface CharacterCosmetic {
  id: string;
  name: string;
  type: 'SKIN' | 'ACCESSORY' | 'MOD';
  description: string;
  imageUrl?: string;
  xpPrice?: number;
  usdPrice?: number;
  characterId?: string;
  character?: Character;
}

export interface PlayerCosmetic {
  id: string;
  cosmeticId: string;
  equippedSlot?: 'SKIN' | 'ACCESSORY' | 'MOD';
  acquiredAt: string;
  cosmetic: CharacterCosmetic;
}

export interface Npc {
  id: string;
  name: string;
  tier: 'BEGINNER' | 'WARRIOR' | 'ELITE';
  description: string;
  imageUrl?: string;
  character: Character;
}

export interface NpcBattle {
  id: string;
  result: 'WIN' | 'LOSS';
  xpEarned: number;
  rounds?: unknown;
  completedAt: string;
  npc: Npc;
}

export interface Player {
  id: string;
  username: string;
  email: string;
  xp: number;
  wins: number;
  losses: number;
  winStreak: number;
  weaponCount?: number;
  unreadNotifications?: number;
  createdAt?: string;
  character?: Character;
  ownedCosmetics?: PlayerCosmetic[];
}

export interface Weapon {
  id: string;
  name: string;
  class: WeaponClass;
  rank: WeaponRank;
  xpCost: number;
  wins: number;
  losses: number;
  isStaked: boolean;
  isPrintEligible: boolean;
  printMinted: boolean;
  mintSerialNumber: string | null;
  mintedAt: string | null;
  mintXpPaid: number | null;
  serialNumber: string;
  forgeShield: boolean;
  forgeShieldExp: string | null;
  createdAt: string;
  ownerId: string;
}

export interface Duel {
  id: string;
  status: DuelStatus;
  gauntletUsed: boolean;
  rounds: { round: number; winner: string }[] | null;
  winnerId: string | null;
  createdAt: string;
  completedAt: string | null;
  challengerId: string;
  defenderId: string;
  challengerWeaponId: string;
  defenderWeaponId: string;
  challenger?: { id: string; username: string; wins?: number; losses?: number };
  defender?: { id: string; username: string; wins?: number; losses?: number };
  challengerWeapon?: Weapon;
  defenderWeapon?: Weapon;
}

export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  read: boolean;
  data: Record<string, unknown> | null;
  createdAt: string;
  playerId: string;
}

export interface SearchPlayer {
  id: string;
  username: string;
  wins: number;
  losses: number;
  winStreak: number;
  weapons: Weapon[];
}

// Constants
export const RANK_LABELS: Record<WeaponRank, string> = {
  IRON_I: "Iron I",
  BRONZE_II: "Bronze II",
  STEEL_III: "Steel III",
  OBSIDIAN_IV: "Obsidian IV",
  VOID_V: "Void V",
  INFERNO_VI: "Inferno VI",
  ETERNAL_VII: "Eternal VII",
};

export const RANK_COLORS: Record<WeaponRank, string> = {
  IRON_I: "#6B7280",
  BRONZE_II: "#CD7F32",
  STEEL_III: "#00BFFF",
  OBSIDIAN_IV: "#9B59B6",
  VOID_V: "#7B2FFF",
  INFERNO_VI: "#FF3D6B",
  ETERNAL_VII: "#FFD600",
};

export const RANK_ORDER: WeaponRank[] = [
  "IRON_I",
  "BRONZE_II",
  "STEEL_III",
  "OBSIDIAN_IV",
  "VOID_V",
  "INFERNO_VI",
  "ETERNAL_VII",
];

export const CLASS_LABELS: Record<WeaponClass, string> = {
  BLADE: "Blade",
  POLEARM: "Polearm",
  RANGED: "Ranged",
  FORGE_ARTIFACT: "Forge Artifact",
  GAUNTLET: "The Gauntlet",
};

export const CLASS_ICONS: Record<WeaponClass, string> = {
  BLADE: "\u2694\uFE0F",
  POLEARM: "\uD83D\uDD31",
  RANGED: "\uD83C\uDFF9",
  FORGE_ARTIFACT: "\uD83D\uDD2E",
  GAUNTLET: "\u270A",
};

export const RANK_XP_COSTS: Record<WeaponRank, number> = {
  IRON_I: 500,
  BRONZE_II: 1500,
  STEEL_III: 4000,
  OBSIDIAN_IV: 10000,
  VOID_V: 25000,
  INFERNO_VI: 60000,
  ETERNAL_VII: 150000,
};
