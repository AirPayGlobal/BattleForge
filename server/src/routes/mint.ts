import { Router, Response } from "express";
import { z } from "zod";
import { WeaponRank } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { authenticate, AuthRequest } from "../middleware/auth";
import { generateMintSerial } from "../lib/mintSerial";

const router = Router();

// Mint XP costs per rank (separate from craft costs)
export const MINT_XP_COSTS: Partial<Record<WeaponRank, number>> = {
  OBSIDIAN_IV:  5_000,
  VOID_V:       12_000,
  INFERNO_VI:   30_000,
  ETERNAL_VII:  80_000,
};

const PRINT_ELIGIBLE_RANKS: WeaponRank[] = [
  "OBSIDIAN_IV", "VOID_V", "INFERNO_VI", "ETERNAL_VII",
];

// POST /api/weapons/:id/mint
router.post("/:id/mint", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const weaponId = req.params.id as string;
    const playerId  = req.player!.playerId;

    const [weapon, player] = await Promise.all([
      prisma.weapon.findFirst({ where: { id: weaponId, ownerId: playerId } }),
      prisma.player.findUnique({ where: { id: playerId } }),
    ]);

    if (!weapon) {
      res.status(404).json({ error: "Weapon not found" });
      return;
    }
    if (!player) {
      res.status(404).json({ error: "Player not found" });
      return;
    }
    if (!PRINT_ELIGIBLE_RANKS.includes(weapon.rank)) {
      res.status(400).json({ error: "Weapon rank is not print-eligible (Rank IV+ required)" });
      return;
    }
    if (weapon.printMinted) {
      res.status(400).json({ error: "Weapon already minted", mintSerial: weapon.mintSerialNumber });
      return;
    }

    const xpCost = MINT_XP_COSTS[weapon.rank]!;
    if (player.xp < xpCost) {
      res.status(400).json({ error: "Insufficient XP", required: xpCost, current: player.xp });
      return;
    }

    const mintSerial = await generateMintSerial(weapon.class, weapon.rank);

    const [updatedWeapon] = await prisma.$transaction([
      prisma.weapon.update({
        where: { id: weaponId },
        data: {
          printMinted: true,
          mintSerialNumber: mintSerial,
          mintedAt: new Date(),
          mintXpPaid: xpCost,
        },
      }),
      prisma.player.update({
        where: { id: playerId },
        data: { xp: { decrement: xpCost } },
      }),
      prisma.transaction.create({
        data: { type: "WEAPON_CRAFT", xpAmount: -xpCost, playerId },
      }),
    ]);

    res.status(201).json({ weapon: updatedWeapon, mintSerial, xpCost });
  } catch (err) {
    console.error("Mint error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/weapons/:id/mint-status
router.get("/:id/mint-status", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const weaponId = req.params.id as string;
    const weapon = await prisma.weapon.findFirst({
      where: { id: weaponId, ownerId: req.player!.playerId },
      select: {
        rank: true, isPrintEligible: true, printMinted: true,
        mintSerialNumber: true, mintedAt: true, mintXpPaid: true,
      },
    });
    if (!weapon) {
      res.status(404).json({ error: "Weapon not found" });
      return;
    }

    const xpCost = MINT_XP_COSTS[weapon.rank] ?? null;
    res.json({ ...weapon, xpCost, eligible: PRINT_ELIGIBLE_RANKS.includes(weapon.rank) });
  } catch (err) {
    console.error("Mint status error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/weapons/:id/public — public weapon profile
router.get("/:id/public", async (req, res: Response) => {
  try {
    const weaponId = req.params.id as string;
    const weapon = await prisma.weapon.findUnique({
      where: { id: weaponId },
      include: {
        owner: { select: { id: true, username: true } },
      },
    });
    if (!weapon) {
      res.status(404).json({ error: "Weapon not found" });
      return;
    }

    // Get duel history for this weapon
    const duels = await prisma.duel.findMany({
      where: {
        status: "COMPLETED",
        OR: [{ challengerWeaponId: weaponId }, { defenderWeaponId: weaponId }],
      },
      include: {
        challenger: { select: { username: true } },
        defender: { select: { username: true } },
      },
      orderBy: { completedAt: "desc" },
      take: 20,
    });

    res.json({
      id: weapon.id,
      name: weapon.name,
      class: weapon.class,
      rank: weapon.rank,
      wins: weapon.wins,
      losses: weapon.losses,
      serialNumber: weapon.serialNumber,
      mintSerialNumber: weapon.mintSerialNumber,
      printMinted: weapon.printMinted,
      mintedAt: weapon.mintedAt,
      createdAt: weapon.createdAt,
      owner: weapon.owner,
      recentDuels: duels.map((d) => ({
        id: d.id,
        challenger: d.challenger.username,
        defender: d.defender.username,
        winnerId: d.winnerId,
        completedAt: d.completedAt,
      })),
    });
  } catch (err) {
    console.error("Public weapon error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/weapons/minted — all minted weapons for current player
router.get("/minted/list", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const weapons = await prisma.weapon.findMany({
      where: { ownerId: req.player!.playerId, printMinted: true },
      include: {
        printOrders: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { mintedAt: "desc" },
    });
    res.json(weapons);
  } catch (err) {
    console.error("Minted list error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export { PRINT_ELIGIBLE_RANKS };
export default router;
