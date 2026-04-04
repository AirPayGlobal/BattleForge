import { Router, Response } from "express";
import { prisma } from "../lib/prisma";
import { authenticate, AuthRequest } from "../middleware/auth";

const router = Router();

// GET /api/weapons (current player's weapons)
router.get("/", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { rank, weaponClass } = req.query;
    const where: any = { ownerId: req.player!.playerId };
    if (rank && typeof rank === "string") where.rank = rank;
    if (weaponClass && typeof weaponClass === "string") where.class = weaponClass;

    const weapons = await prisma.weapon.findMany({
      where,
      orderBy: [{ rank: "desc" }, { createdAt: "desc" }],
    });
    res.json(weapons);
  } catch (err) {
    console.error("Weapons error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/weapons/:id
router.get("/:id", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const weaponId = req.params.id as string;
    const weapon = await prisma.weapon.findFirst({
      where: { id: weaponId, ownerId: req.player!.playerId },
    });
    if (!weapon) {
      res.status(404).json({ error: "Weapon not found" });
      return;
    }
    res.json(weapon);
  } catch (err) {
    console.error("Weapon error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
