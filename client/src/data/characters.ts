// Roster of cyberpunk samurai fighters.
// `meshKey` maps to the procedural mesh config inside Fighter3D.

export type FighterId =
  | "vanguard"
  | "shiva"
  | "titan"
  | "eclipse"
  | "inferno"
  | "zerocast";

export interface FighterDef {
  id: FighterId;
  meshKey: string;            // key into Fighter3D's character config
  callsign: string;           // big display name
  realName: string;
  tagline: string;
  archetype: string;          // "Blade Vanguard", "Shadow Assassin" etc.
  primary: string;            // main neon
  secondary: string;          // accent
  ultimateName: string;       // ultimate move name
  ultimateLabel: string;      // short callout used during ultimate
  stats: { power: number; speed: number; defense: number; ki: number };
  intro: string;              // pre-match line
}

export const FIGHTERS: FighterDef[] = [
  {
    id: "vanguard",
    meshKey: "ironclad",
    callsign: "VANGUARD",
    realName: "Akira Tachibana",
    tagline: "STEELBORN. UNBROKEN.",
    archetype: "Blade Vanguard",
    primary: "#2563eb",
    secondary: "#94a3b8",
    ultimateName: "Tempest Cleave",
    ultimateLabel: "TEMPEST CLEAVE",
    stats: { power: 7, speed: 6, defense: 9, ki: 6 },
    intro: "Your blade ends here.",
  },
  {
    id: "shiva",
    meshKey: "shadowblade",
    callsign: "SHIVA",
    realName: "Rei Nakamura",
    tagline: "TWIN FANGS OF THE VIOLET DAWN.",
    archetype: "Shadow Assassin",
    primary: "#c084fc",
    secondary: "#7c3aed",
    ultimateName: "Eclipse Storm",
    ultimateLabel: "ECLIPSE STORM",
    stats: { power: 7, speed: 10, defense: 5, ki: 8 },
    intro: "You won't see the second blade.",
  },
  {
    id: "titan",
    meshKey: "stoneforged",
    callsign: "TITAN",
    realName: "Kuro Iwabuchi",
    tagline: "ANVIL OF THE LOWER DISTRICTS.",
    archetype: "Bare-Knuckle Juggernaut",
    primary: "#f59e0b",
    secondary: "#78350f",
    ultimateName: "Mountain Splitter",
    ultimateLabel: "MOUNTAIN SPLITTER",
    stats: { power: 10, speed: 4, defense: 10, ki: 5 },
    intro: "Stand if you can.",
  },
  {
    id: "eclipse",
    meshKey: "voidwalker",
    callsign: "ECLIPSE",
    realName: "Suzume Kage",
    tagline: "WALKS BETWEEN STORMS.",
    archetype: "Void Channeler",
    primary: "#22d3ee",
    secondary: "#6d28d9",
    ultimateName: "Singularity Strike",
    ultimateLabel: "SINGULARITY",
    stats: { power: 8, speed: 8, defense: 6, ki: 10 },
    intro: "The void has already chosen.",
  },
  {
    id: "inferno",
    meshKey: "embercrest",
    callsign: "INFERNO",
    realName: "Ren Asahi",
    tagline: "PHOENIX OF THE BURNING WARDS.",
    archetype: "Flame Duelist",
    primary: "#f97316",
    secondary: "#dc2626",
    ultimateName: "Sunfire Crescent",
    ultimateLabel: "SUNFIRE CRESCENT",
    stats: { power: 9, speed: 7, defense: 6, ki: 8 },
    intro: "I'll leave only ashes.",
  },
  {
    id: "zerocast",
    meshKey: "frostmantle",
    callsign: "ZEROCAST",
    realName: "Mira Tsukuyomi",
    tagline: "SUBZERO PRECISION INCARNATE.",
    archetype: "Cryo Lancer",
    primary: "#bae6fd",
    secondary: "#0ea5e9",
    ultimateName: "Absolute Zero",
    ultimateLabel: "ABSOLUTE ZERO",
    stats: { power: 6, speed: 8, defense: 7, ki: 9 },
    intro: "This won't even melt.",
  },
];

export function getFighter(id: FighterId): FighterDef {
  return FIGHTERS.find((f) => f.id === id) ?? FIGHTERS[0];
}
