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

// GET /api/players/leaderboard
router.get("/leaderboard", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const players = await prisma.player.findMany({
      take: 25,
      orderBy: { xp: "desc" },
      select: {
        id: true,
        username: true,
        xp: true,
        wins: true,
        losses: true,
        winStreak: true,
        character: true,
      },
    });
    res.json(players);
  } catch (err) {
    console.error("Leaderboard error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/players/me/battles
router.get("/me/battles", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const playerId = req.player!.playerId;

    const [npcBattles, duels] = await Promise.all([
      prisma.npcBattle.findMany({
        where: { playerId },
        take: 10,
        orderBy: { completedAt: "desc" },
        include: { npc: { include: { character: true } } },
      }),
      prisma.duel.findMany({
        where: {
          OR: [{ challengerId: playerId }, { defenderId: playerId }],
          status: "COMPLETED",
        },
        take: 10,
        orderBy: { completedAt: "desc" },
        include: {
          challenger: { select: { username: true } },
          defender: { select: { username: true } },
          challengerWeapon: { select: { name: true } },
          defenderWeapon: { select: { name: true } },
        },
      }),
    ]);

    const npcItems = npcBattles.map((b: any) => ({
      type: "npc" as const,
      result: b.result as "WIN" | "LOSS",
      opponent: b.npc?.name ?? "Unknown NPC",
      xpEarned: b.xpEarned ?? 0,
      date: b.completedAt?.toISOString() ?? new Date().toISOString(),
    }));

    const pvpItems = duels.map((d: any) => {
      const isChallenger = d.challengerId === playerId;
      const opponent = isChallenger ? d.defender?.username : d.challenger?.username;
      const isWin = d.winnerId === playerId;
      return {
        type: "pvp" as const,
        result: (isWin ? "WIN" : "LOSS") as "WIN" | "LOSS",
        opponent: opponent ?? "Unknown",
        xpEarned: isWin ? 200 : 0,
        date: d.completedAt?.toISOString() ?? new Date().toISOString(),
      };
    });

    const merged = [...npcItems, ...pvpItems]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10);

    res.json(merged);
  } catch (err) {
    console.error("Battles error:", err);
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
