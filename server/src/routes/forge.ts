import { Router, Response } from "express";
import { z } from "zod";
import { WeaponClass, WeaponRank } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { authenticate, AuthRequest } from "../middleware/auth";
import { RANK_XP_COSTS } from "../lib/constants";

const router = Router();

const craftSchema = z.object({
  name: z.string().min(2).max(30),
  weaponClass: z.nativeEnum(WeaponClass).refine(
    (val) => val !== WeaponClass.GAUNTLET,
    { message: "The Gauntlet cannot be crafted" }
  ),
  rank: z.nativeEnum(WeaponRank),
});

function generateSerial(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let serial = "BF-";
  for (let i = 0; i < 8; i++) {
    serial += chars[Math.floor(Math.random() * chars.length)];
    if (i === 3) serial += "-";
  }
  return serial;
}

// POST /api/forge/craft
router.post("/craft", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const data = craftSchema.parse(req.body);
    const xpCost = RANK_XP_COSTS[data.rank];

    const player = await prisma.player.findUnique({
      where: { id: req.player!.playerId },
    });

    if (!player) {
      res.status(404).json({ error: "Player not found" });
      return;
    }

    if (player.xp < xpCost) {
      res.status(400).json({
        error: "Insufficient XP",
        required: xpCost,
        current: player.xp,
      });
      return;
    }

    // Determine print eligibility (Rank IV+)
    const printEligibleRanks: WeaponRank[] = [
      "OBSIDIAN_IV",
      "VOID_V",
      "INFERNO_VI",
      "ETERNAL_VII",
    ];
    const isPrintEligible = printEligibleRanks.includes(data.rank);

    // Atomic transaction: deduct XP + create weapon + log transaction
    const [weapon] = await prisma.$transaction([
      prisma.weapon.create({
        data: {
          name: data.name,
          class: data.weaponClass,
          rank: data.rank,
          xpCost,
          isPrintEligible: isPrintEligible,
          serialNumber: generateSerial(),
          ownerId: req.player!.playerId,
        },
      }),
      prisma.player.update({
        where: { id: req.player!.playerId },
        data: { xp: { decrement: xpCost } },
      }),
      prisma.transaction.create({
        data: {
          type: "WEAPON_CRAFT",
          xpAmount: -xpCost,
          playerId: req.player!.playerId,
        },
      }),
    ]);

    res.status(201).json(weapon);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.errors[0].message });
      return;
    }
    console.error("Craft error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/forge/costs
router.get("/costs", (_req, res: Response) => {
  res.json(RANK_XP_COSTS);
});

export default router;
