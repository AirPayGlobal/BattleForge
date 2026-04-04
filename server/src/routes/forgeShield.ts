import { Router, Response } from "express";
import { prisma } from "../lib/prisma";
import { authenticate, AuthRequest } from "../middleware/auth";

const router = Router();

const SHIELD_XP_COST = 500;
const SHIELD_DURATION_DAYS = 7;

// POST /api/forge-shield/:weaponId/activate
router.post("/:weaponId/activate", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const weaponId = req.params.weaponId as string;
    const playerId = req.player!.playerId;

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

    // Check if shield already active
    if (weapon.forgeShield && weapon.forgeShieldExp && weapon.forgeShieldExp > new Date()) {
      const daysLeft = Math.ceil((weapon.forgeShieldExp.getTime() - Date.now()) / 86_400_000);
      res.status(400).json({ error: `Forge Shield already active for ${daysLeft} more day(s)` });
      return;
    }

    // Check XP
    if (player.xp < SHIELD_XP_COST) {
      res.status(400).json({ error: "Insufficient XP", required: SHIELD_XP_COST, current: player.xp });
      return;
    }

    const expiresAt = new Date(Date.now() + SHIELD_DURATION_DAYS * 86_400_000);

    const [updatedWeapon] = await prisma.$transaction([
      prisma.weapon.update({
        where: { id: weaponId },
        data: { forgeShield: true, forgeShieldExp: expiresAt },
      }),
      prisma.player.update({
        where: { id: playerId },
        data: { xp: { decrement: SHIELD_XP_COST } },
      }),
      prisma.transaction.create({
        data: { type: "FORGE_SHIELD", xpAmount: -SHIELD_XP_COST, playerId },
      }),
    ]);

    res.json({ weapon: updatedWeapon, shieldExpires: expiresAt });
  } catch (err) {
    console.error("Forge shield activate error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/forge-shield/:weaponId/status
router.get("/:weaponId/status", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const weaponId = req.params.weaponId as string;
    const weapon = await prisma.weapon.findFirst({
      where: { id: weaponId, ownerId: req.player!.playerId },
      select: { forgeShield: true, forgeShieldExp: true },
    });

    if (!weapon) {
      res.status(404).json({ error: "Weapon not found" });
      return;
    }

    const active = weapon.forgeShield && weapon.forgeShieldExp && weapon.forgeShieldExp > new Date();
    res.json({
      active: !!active,
      expiresAt: weapon.forgeShieldExp,
      cost: SHIELD_XP_COST,
      durationDays: SHIELD_DURATION_DAYS,
    });
  } catch (err) {
    console.error("Forge shield status error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export { SHIELD_XP_COST };
export default router;
