import { Router, Response } from "express";
import { prisma } from "../lib/prisma";
import { authenticate, AuthRequest } from "../middleware/auth";

const router = Router();

// GET /api/players/search?rank=IRON_I
router.get("/search", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { rank } = req.query;
    if (!rank || typeof rank !== "string") {
      res.status(400).json({ error: "rank query parameter is required" });
      return;
    }

    const players = await prisma.player.findMany({
      where: {
        id: { not: req.player!.playerId },
        weapons: {
          some: {
            rank: rank as any,
            isStaked: false,
          },
        },
      },
      select: {
        id: true,
        username: true,
        wins: true,
        losses: true,
        winStreak: true,
        weapons: {
          where: {
            rank: rank as any,
            isStaked: false,
          },
          select: {
            id: true,
            name: true,
            class: true,
            rank: true,
            wins: true,
            losses: true,
          },
        },
      },
      take: 20,
    });

    res.json(players);
  } catch (err) {
    console.error("Player search error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/players/:id/profile
router.get("/:id/profile", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const playerId = req.params.id as string;
    const player = await prisma.player.findUnique({
      where: { id: playerId },
      select: {
        id: true,
        username: true,
        wins: true,
        losses: true,
        winStreak: true,
        createdAt: true,
        _count: { select: { weapons: true } },
      },
    });

    if (!player) {
      res.status(404).json({ error: "Player not found" });
      return;
    }

    res.json(player);
  } catch (err) {
    console.error("Profile error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
