import { PrismaClient, WeaponClass, WeaponRank } from "@prisma/client";
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

async function main() {
  console.log("⚔️  Seeding BattleForge database...");

  const supabaseIds = await ensureSupabaseUsers();

  // Clear existing data (order matters for FK constraints)
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
  console.log("\n⚔️  Seed complete! Test accounts (password: password123):");
  console.log("   ironviper@battleforge.test");
  console.log("   stormblade@battleforge.test");
  console.log("   voidreaper@battleforge.test");
}

main()
  .catch((e) => { console.error("Seed error:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
