import { PrismaClient, WeaponClass, WeaponRank, CosmeticType, NpcTier } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";

const prisma = new PrismaClient();

// Fixed UUIDs for deterministic local seeding when Supabase keys are not set.
// These match Supabase auth.users rows only when created via the Supabase dashboard
// or via the supabase admin API with these exact IDs.
const SEED_IDS = {
  ironViper:  "00000000-0000-0000-0000-000000000001",
  stormBlade: "00000000-0000-0000-0000-000000000002",
  voidReaper: "00000000-0000-0000-0000-000000000003",
};

const TEST_PLAYERS = [
  { id: SEED_IDS.ironViper,  username: "IronViper",  email: "ironviper@battleforge.test",  xp: 15000, wins: 12, losses: 3, winStreak: 5 },
  { id: SEED_IDS.stormBlade, username: "StormBlade", email: "stormblade@battleforge.test", xp: 8500,  wins: 7,  losses: 6, winStreak: 2 },
  { id: SEED_IDS.voidReaper, username: "VoidReaper", email: "voidreaper@battleforge.test", xp: 42000, wins: 28, losses: 9, winStreak: 0 },
];

function generateSerial(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let serial = "BF-";
  for (let i = 0; i < 8; i++) {
    serial += chars[Math.floor(Math.random() * chars.length)];
    if (i === 3) serial += "-";
  }
  return serial;
}

async function ensureSupabaseUsers() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.log(
      "⚠  SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set.\n" +
      "   Seeding Player records only (no Supabase auth users created).\n" +
      "   You will NOT be able to log in as test players without setting those vars.\n"
    );
    return TEST_PLAYERS.map((p) => p.id);
  }

  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const ids: string[] = [];

  for (const p of TEST_PLAYERS) {
    // Try to delete existing user first (idempotent re-seed)
    const { data: existing } = await supabase.auth.admin.listUsers();
    const existingUser = existing?.users.find((u) => u.email === p.email);
    if (existingUser) {
      await supabase.auth.admin.deleteUser(existingUser.id);
    }

    const { data, error } = await supabase.auth.admin.createUser({
      email: p.email,
      password: "password123",
      email_confirm: true,
      user_metadata: { username: p.username },
    });

    if (error || !data.user) {
      console.error(`Failed to create Supabase user for ${p.username}:`, error?.message);
      ids.push(p.id); // fall back to fixed UUID
    } else {
      ids.push(data.user.id);
    }
  }

  return ids;
}

const CHARACTERS = [
  { name: "Ironclad",    description: "The unyielding defender, forged in the fires of battle",     isDefault: true  },
  { name: "Shadowblade", description: "A ghost in the arena, striking before you see the shadow",   isDefault: false },
  { name: "Stoneforged", description: "Carved from the mountain itself, immovable in combat",       isDefault: false },
  { name: "Voidwalker",  description: "Touched by the void, wielding power beyond the mortal realm", isDefault: false },
  { name: "Embercrest",  description: "Born of flame, their passion is as fierce as their blade",   isDefault: false },
  { name: "Frostmantle", description: "Cold, calculated, and utterly ruthless",                     isDefault: false },
];

async function main() {
  console.log("⚔️  Seeding BattleForge database...");

  const supabaseIds = await ensureSupabaseUsers();

  // Clear existing data (order matters for FK constraints — dependents first)
  await prisma.npcBattle.deleteMany();
  await prisma.playerCosmetic.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.duel.deleteMany();
  await prisma.weapon.deleteMany();
  await prisma.gauntletQuest.deleteMany();
  await prisma.player.deleteMany();

  // Create Player records using the Supabase-assigned (or fixed fallback) UUIDs
  const [ironViper, stormBlade, voidReaper] = await Promise.all(
    TEST_PLAYERS.map((p, i) =>
      prisma.player.create({
        data: {
          id: supabaseIds[i],
          username: p.username,
          email: p.email,
          xp: p.xp,
          wins: p.wins,
          losses: p.losses,
          winStreak: p.winStreak,
        },
      })
    )
  );

  console.log("✓ Created 3 test players");

  const weapons: Array<{
    name: string; class: WeaponClass; rank: WeaponRank;
    xpCost: number; wins: number; losses: number; ownerId: string;
  }> = [
    // IronViper
    { name: "Fang of Iron",        class: WeaponClass.BLADE,          rank: WeaponRank.IRON_I,      xpCost: 500,   wins: 3,  losses: 1, ownerId: ironViper.id },
    { name: "Viper's Reach",       class: WeaponClass.POLEARM,        rank: WeaponRank.BRONZE_II,   xpCost: 1500,  wins: 4,  losses: 0, ownerId: ironViper.id },
    { name: "Steelshot Repeater",  class: WeaponClass.RANGED,         rank: WeaponRank.STEEL_III,   xpCost: 4000,  wins: 5,  losses: 2, ownerId: ironViper.id },
    { name: "Obsidian Edge",       class: WeaponClass.BLADE,          rank: WeaponRank.OBSIDIAN_IV, xpCost: 10000, wins: 0,  losses: 0, ownerId: ironViper.id },
    // StormBlade
    { name: "Thunder Cleaver",     class: WeaponClass.BLADE,          rank: WeaponRank.IRON_I,      xpCost: 500,   wins: 2,  losses: 3, ownerId: stormBlade.id },
    { name: "Storm Pike",          class: WeaponClass.POLEARM,        rank: WeaponRank.BRONZE_II,   xpCost: 1500,  wins: 3,  losses: 1, ownerId: stormBlade.id },
    { name: "Arc Catalyst",        class: WeaponClass.FORGE_ARTIFACT, rank: WeaponRank.STEEL_III,   xpCost: 4000,  wins: 2,  losses: 2, ownerId: stormBlade.id },
    // VoidReaper
    { name: "Reaper's Claw",       class: WeaponClass.BLADE,          rank: WeaponRank.VOID_V,      xpCost: 25000, wins: 10, losses: 2, ownerId: voidReaper.id },
    { name: "Inferno Cannon",      class: WeaponClass.RANGED,         rank: WeaponRank.INFERNO_VI,  xpCost: 60000, wins: 15, losses: 5, ownerId: voidReaper.id },
    { name: "Eclipsed Relic",      class: WeaponClass.FORGE_ARTIFACT, rank: WeaponRank.OBSIDIAN_IV, xpCost: 10000, wins: 3,  losses: 2, ownerId: voidReaper.id },
  ];

  for (const w of weapons) {
    const printEligible = (["OBSIDIAN_IV", "VOID_V", "INFERNO_VI", "ETERNAL_VII"] as string[]).includes(w.rank);
    await prisma.weapon.create({
      data: { ...w, isPrintEligible: printEligible, serialNumber: generateSerial() },
    });
  }

  console.log("✓ Created 10 sample weapons");

  await prisma.notification.createMany({
    data: [
      { type: "SYSTEM",   message: "Welcome to BattleForge! Craft your first weapon to begin.", playerId: ironViper.id },
      { type: "DUEL_WON", message: "You defeated StormBlade! +200 XP",                         playerId: ironViper.id },
      { type: "SYSTEM",   message: "Welcome to BattleForge! Craft your first weapon to begin.", playerId: stormBlade.id },
      { type: "SYSTEM",   message: "Welcome to BattleForge! Craft your first weapon to begin.", playerId: voidReaper.id },
    ],
  });

  console.log("✓ Created sample notifications");

  // ─── Characters ─────────────────────────────────────────────────────────────
  const characterMap = new Map<string, string>(); // name → id

  for (const ch of CHARACTERS) {
    const record = await prisma.character.upsert({
      where: { name: ch.name },
      update: { description: ch.description, isDefault: ch.isDefault },
      create: ch,
    });
    characterMap.set(ch.name, record.id);
  }
  console.log(`✓ Upserted ${CHARACTERS.length} characters`);

  // ─── Character Cosmetics ─────────────────────────────────────────────────────
  const cosmeticSeeds: Array<{
    name: string; type: CosmeticType; description: string;
    xpPrice?: number; usdPrice?: number; characterName?: string;
  }> = [
    // Per-character skins & accessories
    ...CHARACTERS.flatMap((ch) => [
      {
        name: `${ch.name} Prestige Skin`,
        type: CosmeticType.SKIN,
        description: `Prestige skin for the ${ch.name} character`,
        xpPrice: 5000,
        characterName: ch.name,
      },
      {
        name: `${ch.name} Battle Crest`,
        type: CosmeticType.ACCESSORY,
        description: `Battle crest accessory for the ${ch.name} character`,
        xpPrice: 2000,
        characterName: ch.name,
      },
    ]),
    // Universal mods
    { name: "Flame Aura",   type: CosmeticType.MOD, description: "Surround yourself in living flame", xpPrice: 3000 },
    { name: "Void Shimmer", type: CosmeticType.MOD, description: "Phase in and out of reality",        usdPrice: 4.99 },
    { name: "Iron Glow",    type: CosmeticType.MOD, description: "Radiate the power of forged iron",   xpPrice: 2500 },
  ];

  for (const c of cosmeticSeeds) {
    const characterId = c.characterName ? characterMap.get(c.characterName) ?? null : null;
    const existing = await prisma.characterCosmetic.findFirst({ where: { name: c.name } });
    if (!existing) {
      await prisma.characterCosmetic.create({
        data: { name: c.name, type: c.type, description: c.description, xpPrice: c.xpPrice ?? null, usdPrice: c.usdPrice ?? null, characterId },
      });
    } else {
      await prisma.characterCosmetic.update({
        where: { id: existing.id },
        data: { type: c.type, description: c.description, xpPrice: c.xpPrice ?? null, usdPrice: c.usdPrice ?? null, characterId },
      });
    }
  }
  console.log(`✓ Upserted ${cosmeticSeeds.length} character cosmetics`);

  // ─── NPCs ────────────────────────────────────────────────────────────────────
  const npcSeeds: Array<{ name: string; tier: NpcTier; description: string; characterName: string }> = [
    // BEGINNER
    { name: "Training Dummy",  tier: NpcTier.BEGINNER, description: "A stationary practice target with no real combat ability",        characterName: "Ironclad"    },
    { name: "Rusty Guardsman", tier: NpcTier.BEGINNER, description: "An old guard whose best days are long behind him",                 characterName: "Stoneforged" },
    { name: "Recruit Blaine",  tier: NpcTier.BEGINNER, description: "Fresh out of training camp, eager but unskilled",                 characterName: "Embercrest"  },
    // WARRIOR
    { name: "Arena Veteran",   tier: NpcTier.WARRIOR,  description: "A seasoned fighter who has survived countless battles",           characterName: "Shadowblade" },
    { name: "Sergeant Varn",   tier: NpcTier.WARRIOR,  description: "A disciplined officer who fights with precision and experience",  characterName: "Ironclad"    },
    { name: "Champion Kira",   tier: NpcTier.WARRIOR,  description: "A regional champion who fights with calculating coldness",        characterName: "Frostmantle" },
    // ELITE
    { name: "The Warlord",       tier: NpcTier.ELITE, description: "A fearsome warlord who commands the battlefield",                 characterName: "Voidwalker" },
    { name: "Iron Maiden",       tier: NpcTier.ELITE, description: "An indomitable warrior clad in impenetrable armor",               characterName: "Ironclad"   },
    { name: "Eternal Sentinel",  tier: NpcTier.ELITE, description: "An ageless guardian powered by void energy",                      characterName: "Voidwalker" },
  ];

  for (const n of npcSeeds) {
    const characterId = characterMap.get(n.characterName);
    if (!characterId) continue;
    await prisma.npc.upsert({
      where: { name: n.name },
      update: { tier: n.tier, description: n.description, characterId },
      create: { name: n.name, tier: n.tier, description: n.description, characterId },
    });
  }
  console.log(`✓ Upserted ${npcSeeds.length} NPCs`);

  console.log("\n⚔️  Seed complete! Test accounts (password: password123):");
  console.log("   ironviper@battleforge.test");
  console.log("   stormblade@battleforge.test");
  console.log("   voidreaper@battleforge.test");
}

main()
  .catch((e) => { console.error("Seed error:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
