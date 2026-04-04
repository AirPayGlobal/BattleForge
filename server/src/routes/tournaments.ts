import { Router, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { authenticate, AuthRequest } from "../middleware/auth";
import { XP_REWARDS } from "../lib/constants";

const router = Router();

// GET /api/tournaments
router.get("/", async (_req, res: Response) => {
  try {
    const tournaments = await prisma.tournament.findMany({
      where: { status: { in: ["UPCOMING", "OPEN", "IN_PROGRESS"] } },
      include: {
        _count: { select: { entries: true } },
      },
      orderBy: { startTime: "asc" },
    });
    res.json(tournaments);
  } catch (err) {
    console.error("Tournament list error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/tournaments/:id
router.get("/:id", async (req, res: Response) => {
  try {
    const tournament = await prisma.tournament.findUnique({
      where: { id: req.params.id as string },
      include: {
        entries: {
          include: {
            player: { select: { id: true, username: true, wins: true, losses: true } },
            weapon: true,
          },
        },
      },
    });
    if (!tournament) {
      res.status(404).json({ error: "Tournament not found" });
      return;
    }
    res.json(tournament);
  } catch (err) {
    console.error("Tournament detail error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/tournaments/:id/enter
router.post("/:id/enter", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const tournamentId = req.params.id as string;
    const { weaponId } = z.object({ weaponId: z.string().uuid() }).parse(req.body);
    const playerId = req.player!.playerId;

    const [tournament, weapon] = await Promise.all([
      prisma.tournament.findUnique({ where: { id: tournamentId } }),
      prisma.weapon.findFirst({ where: { id: weaponId, ownerId: playerId, isStaked: false } }),
    ]);

    if (!tournament) {
      res.status(404).json({ error: "Tournament not found" });
      return;
    }
    if (tournament.status !== "OPEN") {
      res.status(400).json({ error: "Tournament is not open for entries" });
      return;
    }
    if (!weapon) {
      res.status(400).json({ error: "Weapon not found or already staked" });
      return;
    }
    if (weapon.rank !== tournament.entryWeaponRank) {
      res.status(400).json({
        error: `Tournament requires a ${tournament.entryWeaponRank} weapon`,
      });
      return;
    }

    // Count entries
    const entryCount = await prisma.tournamentEntry.count({ where: { tournamentId } });
    if (entryCount >= tournament.maxPlayers) {
      res.status(400).json({ error: "Tournament is full" });
      return;
    }

    const entry = await prisma.$transaction(async (tx) => {
      const e = await tx.tournamentEntry.create({
        data: { playerId, weaponId, tournamentId },
      });
      await tx.weapon.update({ where: { id: weaponId }, data: { isStaked: true } });
      return e;
    });

    res.status(201).json(entry);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.errors[0].message });
      return;
    }
    console.error("Tournament enter error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/tournaments/:id/start — admin/system: generate bracket
router.post("/:id/start", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const tournamentId = req.params.id as string;

    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        entries: {
          include: {
            player: { select: { id: true, username: true, wins: true, losses: true } },
            weapon: true,
          },
          orderBy: [{ player: { wins: "desc" } }],
        },
      },
    });

    if (!tournament) {
      res.status(404).json({ error: "Tournament not found" });
      return;
    }
    if (tournament.status !== "OPEN") {
      res.status(400).json({ error: "Tournament not in OPEN state" });
      return;
    }

    const entries = tournament.entries;
    if (entries.length < 2) {
      res.status(400).json({ error: "Need at least 2 players to start" });
      return;
    }

    // Build single-elimination bracket
    const bracket = buildBracket(entries);

    await prisma.tournament.update({
      where: { id: tournamentId },
      data: { status: "IN_PROGRESS", bracket },
    });

    res.json({ message: "Tournament started", bracket });
  } catch (err) {
    console.error("Tournament start error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

function buildBracket(entries: any[]): any {
  // Seed by win rate (wins / total games)
  const seeded = [...entries].sort((a, b) => {
    const aRate = a.player.wins / Math.max(1, a.player.wins + a.player.losses);
    const bRate = b.player.wins / Math.max(1, b.player.wins + b.player.losses);
    return bRate - aRate;
  });

  // Pad to power of 2
  const size = Math.pow(2, Math.ceil(Math.log2(seeded.length)));
  const padded = [...seeded];
  while (padded.length < size) padded.push(null);

  // Build round 1 matchups
  const rounds: any[] = [];
  const round1: any[] = [];
  for (let i = 0; i < padded.length; i += 2) {
    round1.push({
      matchId: `r1-m${i / 2 + 1}`,
      player1: padded[i] ? { id: padded[i].playerId, username: padded[i].player.username } : null,
      player2: padded[i + 1] ? { id: padded[i + 1].playerId, username: padded[i + 1].player.username } : null,
      winner: null,
      status: "PENDING",
    });
  }
  rounds.push({ round: 1, matches: round1 });

  // Placeholder future rounds
  let matchesInRound = round1.length / 2;
  let roundNum = 2;
  while (matchesInRound >= 1) {
    const matches: any[] = [];
    for (let i = 0; i < matchesInRound; i++) {
      matches.push({
        matchId: `r${roundNum}-m${i + 1}`,
        player1: null,
        player2: null,
        winner: null,
        status: "PENDING",
      });
    }
    rounds.push({ round: roundNum, matches });
    matchesInRound = Math.floor(matchesInRound / 2);
    roundNum++;
  }

  return { rounds, totalPlayers: seeded.length };
}

export default router;
