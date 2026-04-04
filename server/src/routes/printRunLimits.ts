import { Router, Response } from "express";
import { prisma } from "../lib/prisma";
import { authenticate, AuthRequest } from "../middleware/auth";

const router = Router();

const MAX_LEGENDARY_PER_SEASON = 100;

// GET /api/print-run-limits — get limits and current counts
router.get("/", async (_req, res: Response) => {
  try {
    const activeSeason = await prisma.season.findFirst({ where: { active: true } });
    if (!activeSeason) {
      res.json({ limits: [], activeSeason: null });
      return;
    }

    // Ensure Rank VII limit exists for this season
    await prisma.printRunLimit.upsert({
      where: { rank_seasonId: { rank: "ETERNAL_VII", seasonId: activeSeason.id } },
      create: {
        rank: "ETERNAL_VII",
        seasonId: activeSeason.id,
        maxPrints: MAX_LEGENDARY_PER_SEASON,
        currentCount: 0,
      },
      update: {},
    });

    const limits = await prisma.printRunLimit.findMany({
      where: { seasonId: activeSeason.id },
    });

    res.json({
      limits,
      activeSeason: { id: activeSeason.id, name: activeSeason.name, endDate: activeSeason.endDate },
    });
  } catch (err) {
    console.error("Print run limits error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/print-run-limits/waitlist — join waitlist for a rank
router.post("/waitlist", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { rank } = req.body as { rank: string };
    if (!rank) {
      res.status(400).json({ error: "rank is required" });
      return;
    }

    const activeSeason = await prisma.season.findFirst({ where: { active: true } });

    const entry = await prisma.printWaitlist.upsert({
      where: {
        playerId_rank_seasonId: {
          playerId: req.player!.playerId,
          rank,
          seasonId: activeSeason?.id ?? "none",
        },
      },
      create: {
        playerId: req.player!.playerId,
        rank,
        seasonId: activeSeason?.id,
      },
      update: {},
    });

    // Get position
    const position = await prisma.printWaitlist.count({
      where: {
        rank,
        seasonId: activeSeason?.id ?? null,
        joinedAt: { lte: entry.joinedAt },
      },
    });

    res.status(201).json({ entry, position });
  } catch (err) {
    console.error("Waitlist error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/print-run-limits/waitlist/me — player's waitlist positions
router.get("/waitlist/me", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const entries = await prisma.printWaitlist.findMany({
      where: { playerId: req.player!.playerId },
    });
    res.json(entries);
  } catch (err) {
    console.error("Waitlist me error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export { MAX_LEGENDARY_PER_SEASON };
export default router;
