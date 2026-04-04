import { PrismaClient, WeaponClass, WeaponRank } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

function generateSerial(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let serial = "BF-";
  for (let i = 0; i < 8; i++) {
    serial += chars[Math.floor(Math.random() * chars.length)];
    if (i === 3) serial += "-";
  }
  return serial;
}

async function main() {
  console.log("⚔️  Seeding BattleForge database...");

  // Clear existing data
  await prisma.notification.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.duel.deleteMany();
  await prisma.weapon.deleteMany();
  await prisma.gauntletQuest.deleteMany();
  await prisma.player.deleteMany();

  const passwordHash = await bcrypt.hash("password123", 12);

  // Create 3 test players
  const [ironViper, stormBlade, voidReaper] = await Promise.all([
    prisma.player.create({
      data: {
        username: "IronViper",
        email: "ironviper@battleforge.test",
        passwordHash,
        xp: 15000,
        wins: 12,
        losses: 3,
        winStreak: 5,
      },
    }),
    prisma.player.create({
      data: {
        username: "StormBlade",
        email: "stormblade@battleforge.test",
        passwordHash,
        xp: 8500,
        wins: 7,
        losses: 6,
        winStreak: 2,
      },
    }),
    prisma.player.create({
      data: {
        username: "VoidReaper",
        email: "voidreaper@battleforge.test",
        passwordHash,
        xp: 42000,
        wins: 28,
        losses: 9,
        winStreak: 0,
      },
    }),
  ]);

  console.log("✓ Created 3 test players");

  // Create 10 sample weapons across ranks
  const weapons = [
    // IronViper's weapons
    { name: "Fang of Iron", class: WeaponClass.BLADE, rank: WeaponRank.IRON_I, xpCost: 500, wins: 3, losses: 1, ownerId: ironViper.id },
    { name: "Viper's Reach", class: WeaponClass.POLEARM, rank: WeaponRank.BRONZE_II, xpCost: 1500, wins: 4, losses: 0, ownerId: ironViper.id },
    { name: "Steelshot Repeater", class: WeaponClass.RANGED, rank: WeaponRank.STEEL_III, xpCost: 4000, wins: 5, losses: 2, ownerId: ironViper.id },
    { name: "Obsidian Edge", class: WeaponClass.BLADE, rank: WeaponRank.OBSIDIAN_IV, xpCost: 10000, wins: 0, losses: 0, ownerId: ironViper.id },

    // StormBlade's weapons
    { name: "Thunder Cleaver", class: WeaponClass.BLADE, rank: WeaponRank.IRON_I, xpCost: 500, wins: 2, losses: 3, ownerId: stormBlade.id },
    { name: "Storm Pike", class: WeaponClass.POLEARM, rank: WeaponRank.BRONZE_II, xpCost: 1500, wins: 3, losses: 1, ownerId: stormBlade.id },
    { name: "Arc Catalyst", class: WeaponClass.FORGE_ARTIFACT, rank: WeaponRank.STEEL_III, xpCost: 4000, wins: 2, losses: 2, ownerId: stormBlade.id },

    // VoidReaper's weapons
    { name: "Reaper's Claw", class: WeaponClass.BLADE, rank: WeaponRank.VOID_V, xpCost: 25000, wins: 10, losses: 2, ownerId: voidReaper.id },
    { name: "Inferno Cannon", class: WeaponClass.RANGED, rank: WeaponRank.INFERNO_VI, xpCost: 60000, wins: 15, losses: 5, ownerId: voidReaper.id },
    { name: "Eclipsed Relic", class: WeaponClass.FORGE_ARTIFACT, rank: WeaponRank.OBSIDIAN_IV, xpCost: 10000, wins: 3, losses: 2, ownerId: voidReaper.id },
  ];

  for (const w of weapons) {
    const printEligible = ["OBSIDIAN_IV", "VOID_V", "INFERNO_VI", "ETERNAL_VII"].includes(w.rank);
    await prisma.weapon.create({
      data: {
        ...w,
        isPrintEligible: printEligible,
        serialNumber: generateSerial(),
      },
    });
  }

  console.log("✓ Created 10 sample weapons");

  // Create some sample notifications
  await prisma.notification.createMany({
    data: [
      {
        type: "SYSTEM",
        message: "Welcome to BattleForge! Craft your first weapon to begin.",
        playerId: ironViper.id,
      },
      {
        type: "DUEL_WON",
        message: "You defeated StormBlade! +200 XP",
        playerId: ironViper.id,
      },
      {
        type: "SYSTEM",
        message: "Welcome to BattleForge! Craft your first weapon to begin.",
        playerId: stormBlade.id,
      },
      {
        type: "SYSTEM",
        message: "Welcome to BattleForge! Craft your first weapon to begin.",
        playerId: voidReaper.id,
      },
    ],
  });

  console.log("✓ Created sample notifications");
  console.log("\n⚔️  Seed complete! Test accounts:");
  console.log("   ironviper@battleforge.test / password123");
  console.log("   stormblade@battleforge.test / password123");
  console.log("   voidreaper@battleforge.test / password123");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
