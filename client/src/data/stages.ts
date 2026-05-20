export type StageId = "neon-temple" | "tokyo-rooftop" | "subterranean";

export interface StageDef {
  id: StageId;
  name: string;
  district: string;
  tierColor: string;       // dominant arena accent color
  skyTint: string;
  description: string;
}

export const STAGES: StageDef[] = [
  {
    id: "neon-temple",
    name: "Neon Temple",
    district: "District 7 — Holy Wires",
    tierColor: "#FF2BD6",
    skyTint: "#1A0838",
    description: "An abandoned shrine wrapped in fiber optic cabling and prayer-glow.",
  },
  {
    id: "tokyo-rooftop",
    name: "Skybridge",
    district: "Shibuya Stratus",
    tierColor: "#00F0FF",
    skyTint: "#040A24",
    description: "Storm-lit panels above a city that never sleeps.",
  },
  {
    id: "subterranean",
    name: "Subgrid Foundry",
    district: "Underlevel 9",
    tierColor: "#FFC53A",
    skyTint: "#0C0612",
    description: "Sparks, steam, and the ozone of an illegal forge ring.",
  },
];

export function getStage(id: StageId): StageDef {
  return STAGES.find((s) => s.id === id) ?? STAGES[0];
}
