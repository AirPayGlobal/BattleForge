import { Router, Response } from "express";
import { prisma } from "../lib/prisma";
import { authenticate, AuthRequest } from "../middleware/auth";

const router = Router();

// GET /api/seasons/active
router.get("/active", async (_req, res: Response) => {
  try {
    const season = await prisma.season.findFirst({
      where: { active: true },
      include: {
        tiers: { orderBy: { tier: "asc" } },
      },
    });
    res.json(season ?? null);
  } catch (err) {
    console.error("Season error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/seasons/active/pass — get player's battle pass for active season
router.get("/active/pass", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const season = await prisma.season.findFirst({ where: { active: true } });
    if (!season) {
      res.json(null);
      return;
    }
    const pass = await prisma.battlePass.findUnique({
      where: {
        playerId_seasonId: { playerId: req.player!.playerId, seasonId: season.id },
      },
    });
    res.json(pass ?? null);
  } catch (err) {
    console.error("Season pass error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/seasons
router.get("/", async (_req, res: Response) => {
  try {
    const seasons = await prisma.season.findMany({
      orderBy: { startDate: "desc" },
      take: 10,
    });
    res.json(seasons);
  } catch (err) {
    console.error("Seasons list error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
