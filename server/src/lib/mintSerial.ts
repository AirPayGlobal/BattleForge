import { WeaponClass, WeaponRank } from "@prisma/client";
import { prisma } from "./prisma";

// Class codes for serial: BF-{CLASS}-{RANK_ROMAN}-{YEAR}-{SEQ}
const CLASS_CODES: Record<WeaponClass, string> = {
  BLADE: "BLD",
  POLEARM: "PLM",
  RANGED: "RNG",
  FORGE_ARTIFACT: "FGA",
  GAUNTLET: "GNT",
};

const RANK_ROMANS: Record<WeaponRank, string> = {
  IRON_I: "I",
  BRONZE_II: "II",
  STEEL_III: "III",
  OBSIDIAN_IV: "IV",
  VOID_V: "V",
  INFERNO_VI: "VI",
  ETERNAL_VII: "VII",
};

export async function generateMintSerial(
  weaponClass: WeaponClass,
  rank: WeaponRank
): Promise<string> {
  const year = new Date().getFullYear();
  const classCode = CLASS_CODES[weaponClass];
  const rankRoman = RANK_ROMANS[rank];

  // Count existing mints with same class+rank prefix this year
  const prefix = `BF-${classCode}-${rankRoman}-${year}-`;
  const count = await prisma.weapon.count({
    where: { mintSerialNumber: { startsWith: prefix } },
  });

  const seq = String(count + 1).padStart(4, "0");
  return `${prefix}${seq}`;
}
