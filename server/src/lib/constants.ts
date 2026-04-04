import { WeaponRank } from "@prisma/client";

export const RANK_XP_COSTS: Record<WeaponRank, number> = {
  IRON_I: 500,
  BRONZE_II: 1500,
  STEEL_III: 4000,
  OBSIDIAN_IV: 10000,
  VOID_V: 25000,
  INFERNO_VI: 60000,
  ETERNAL_VII: 150000,
};

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

export const XP_REWARDS = {
  DUEL_WIN: 200,
  GAUNTLET_DEFENSE_WIN: 800,
  DAILY_QUEST_MIN: 100,
  DAILY_QUEST_MAX: 300,
  TOURNAMENT_MIN: 500,
  TOURNAMENT_MAX: 2000,
  REFERRAL: 250,
};

export const XP_PACKS = [
  { name: "Starter", xp: 2500, usd: 2.99 },
  { name: "Forge", xp: 10000, usd: 9.99 },
  { name: "Arsenal", xp: 30000, usd: 24.99 },
  { name: "Forgemaster", xp: 100000, usd: 74.99 },
];

export const PRINT_COSTS = {
  COMMON: 18,
  RARE: 35,
  LEGENDARY: 75,
};

export const FORGE_SHIELD_COOLDOWN_DAYS = 7;
export const GAUNTLET_COOLDOWN_HOURS = 72;
