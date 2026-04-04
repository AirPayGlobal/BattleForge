import { Router, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { authenticate, AuthRequest } from "../middleware/auth";
import { emitNotification } from "../lib/socket";
import { XP_REWARDS } from "../lib/constants";

const router = Router();

const challengeSchema = z.object({
  defenderId: z.string().uuid(),
  challengerWeaponId: z.string().uuid(),
  defenderWeaponId: z.string().uuid(),
});

// POST /api/duels/challenge
router.post("/challenge", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const data = challengeSchema.parse(req.body);
    const playerId = req.player!.playerId;

    if (data.defenderId === playerId) {
      res.status(400).json({ error: "Cannot challenge yourself" });
      return;
    }

    // Verify weapons exist and match rank
    const [challengerWeapon, defenderWeapon] = await Promise.all([
      prisma.weapon.findFirst({
        where: { id: data.challengerWeaponId, ownerId: playerId, isStaked: false },
      }),
      prisma.weapon.findFirst({
        where: { id: data.defenderWeaponId, ownerId: data.defenderId, isStaked: false },
      }),
    ]);

    if (!challengerWeapon) {
      res.status(400).json({ error: "Challenger weapon not found or already staked" });
      return;
    }
    if (!defenderWeapon) {
      res.status(400).json({ error: "Defender weapon not found or already staked" });
      return;
    }

    // Rank must match (unless Gauntlet)
    const isGauntlet = challengerWeapon.class === "GAUNTLET";
    if (!isGauntlet && challengerWeapon.rank !== defenderWeapon.rank) {
      res.status(400).json({ error: "Weapons must be the same rank" });
      return;
    }

    // Create duel and stake weapons atomically
    const duel = await prisma.$transaction(async (tx) => {
      const newDuel = await tx.duel.create({
        data: {
          challengerId: playerId,
          defenderId: data.defenderId,
          challengerWeaponId: data.challengerWeaponId,
          defenderWeaponId: data.defenderWeaponId,
          gauntletUsed: isGauntlet,
        },
      });

      await tx.weapon.updateMany({
        where: { id: { in: [data.challengerWeaponId, data.defenderWeaponId] } },
        data: { isStaked: true },
      });

      return newDuel;
    });

    // Send notification to defender
    await prisma.notification.create({
      data: {
        type: "CHALLENGE_RECEIVED",
        message: `${req.player!.username} has challenged you to a duel!`,
        playerId: data.defenderId,
        data: { duelId: duel.id },
      },
    });

    const io = req.app.get("io");
    if (io) {
      emitNotification(io, data.defenderId, {
        type: "CHALLENGE_RECEIVED",
        message: `${req.player!.username} has challenged you to a duel!`,
        data: { duelId: duel.id },
      });
    }

    res.status(201).json(duel);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.errors[0].message });
      return;
    }
    console.error("Challenge error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/duels/:id/accept
router.post("/:id/accept", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const duelId = req.params.id as string;
    const duel = await prisma.duel.findFirst({
      where: {
        id: duelId,
        defenderId: req.player!.playerId,
        status: "PENDING",
      },
    });

    if (!duel) {
      res.status(404).json({ error: "Duel not found or not pending" });
      return;
    }

    const updated = await prisma.duel.update({
      where: { id: duel.id },
      data: { status: "ACCEPTED" },
      include: {
        challenger: { select: { id: true, username: true } },
        defender: { select: { id: true, username: true } },
        challengerWeapon: true,
        defenderWeapon: true,
      },
    });

    // Notify challenger
    await prisma.notification.create({
      data: {
        type: "CHALLENGE_ACCEPTED",
        message: `${req.player!.username} accepted your challenge!`,
        playerId: duel.challengerId,
        data: { duelId: duel.id },
      },
    });

    const io = req.app.get("io");
    if (io) {
      emitNotification(io, duel.challengerId, {
        type: "CHALLENGE_ACCEPTED",
        message: `${req.player!.username} accepted your challenge!`,
        data: { duelId: duel.id },
      });
    }

    res.json(updated);
  } catch (err) {
    console.error("Accept error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/duels/:id/decline
router.post("/:id/decline", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const duelId = req.params.id as string;
    const duel = await prisma.duel.findFirst({
      where: {
        id: duelId,
        defenderId: req.player!.playerId,
        status: "PENDING",
      },
      include: { challengerWeapon: true, defenderWeapon: true },
    });

    if (!duel) {
      res.status(404).json({ error: "Duel not found or not pending" });
      return;
    }

    // Gauntlet challenges cannot be declined
    if (duel.gauntletUsed) {
      res.status(400).json({ error: "Gauntlet challenges cannot be declined" });
      return;
    }

    await prisma.$transaction([
      prisma.duel.update({
        where: { id: duel.id },
        data: { status: "DECLINED" },
      }),
      // Unstake both weapons
      prisma.weapon.updateMany({
        where: { id: { in: [duel.challengerWeaponId, duel.defenderWeaponId] } },
        data: { isStaked: false },
      }),
    ]);

    await prisma.notification.create({
      data: {
        type: "CHALLENGE_DECLINED",
        message: `${req.player!.username} declined your challenge.`,
        playerId: duel.challengerId,
        data: { duelId: duel.id },
      },
    });

    const io = req.app.get("io");
    if (io) {
      emitNotification(io, duel.challengerId, {
        type: "CHALLENGE_DECLINED",
        message: `${req.player!.username} declined your challenge.`,
        data: { duelId: duel.id },
      });
    }

    res.json({ message: "Challenge declined" });
  } catch (err) {
    console.error("Decline error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/duels/:id/result (simulated for now)
router.post("/:id/result", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const duelId = req.params.id as string;
    const duel = await prisma.duel.findFirst({
      where: {
        id: duelId,
        status: { in: ["ACCEPTED", "IN_PROGRESS"] },
        OR: [
          { challengerId: req.player!.playerId },
          { defenderId: req.player!.playerId },
        ],
      },
      include: {
        challenger: true,
        defender: true,
        challengerWeapon: true,
        defenderWeapon: true,
      },
    });

    if (!duel) {
      res.status(404).json({ error: "Duel not found or not in progress" });
      return;
    }

    // Simulate result — random winner (best of 3)
    const rounds = [];
    let challengerWins = 0;
    let defenderWins = 0;
    for (let i = 0; i < 3 && challengerWins < 2 && defenderWins < 2; i++) {
      const winner = Math.random() > 0.5 ? "challenger" : "defender";
      rounds.push({ round: i + 1, winner });
      if (winner === "challenger") challengerWins++;
      else defenderWins++;
    }

    const winnerId = challengerWins > defenderWins ? duel.challengerId : duel.defenderId;
    const loserId = winnerId === duel.challengerId ? duel.defenderId : duel.challengerId;
    const loserWeaponId =
      winnerId === duel.challengerId ? duel.defenderWeaponId : duel.challengerWeaponId;
    const winnerWeaponId =
      winnerId === duel.challengerId ? duel.challengerWeaponId : duel.defenderWeaponId;

    // Check forge shield on loser's weapon
    const duelWithIncludes = duel as typeof duel & {
      challenger: { id: string; username: string };
      defender: { id: string; username: string };
      challengerWeapon: { forgeShield: boolean; forgeShieldExp: Date | null };
      defenderWeapon: { forgeShield: boolean; forgeShieldExp: Date | null };
    };
    const loserWeapon =
      winnerId === duel.challengerId ? duelWithIncludes.defenderWeapon : duelWithIncludes.challengerWeapon;
    const shieldActive =
      loserWeapon.forgeShield &&
      loserWeapon.forgeShieldExp &&
      loserWeapon.forgeShieldExp > new Date();

    await prisma.$transaction([
      // Complete the duel
      prisma.duel.update({
        where: { id: duel.id },
        data: {
          status: "COMPLETED",
          winnerId,
          rounds,
          completedAt: new Date(),
        },
      }),
      // Transfer loser's weapon to winner (unless forge shield)
      ...(shieldActive
        ? [
            // Just unstake both weapons
            prisma.weapon.update({
              where: { id: loserWeaponId },
              data: { isStaked: false, losses: { increment: 1 } },
            }),
          ]
        : [
            prisma.weapon.update({
              where: { id: loserWeaponId },
              data: {
                ownerId: winnerId,
                isStaked: false,
                losses: { increment: 1 },
              },
            }),
          ]),
      // Winner weapon: unstake + increment wins
      prisma.weapon.update({
        where: { id: winnerWeaponId },
        data: { isStaked: false, wins: { increment: 1 } },
      }),
      // Update player stats
      prisma.player.update({
        where: { id: winnerId },
        data: {
          wins: { increment: 1 },
          xp: { increment: XP_REWARDS.DUEL_WIN },
          winStreak: { increment: 1 },
        },
      }),
      prisma.player.update({
        where: { id: loserId },
        data: {
          losses: { increment: 1 },
          winStreak: 0,
        },
      }),
      // XP transaction for winner
      prisma.transaction.create({
        data: {
          type: "DUEL_WIN",
          xpAmount: XP_REWARDS.DUEL_WIN,
          playerId: winnerId,
        },
      }),
    ]);

    // Notifications
    const winnerName = winnerId === duel.challengerId ? duelWithIncludes.challenger.username : duelWithIncludes.defender.username;
    const loserName = loserId === duel.challengerId ? duelWithIncludes.challenger.username : duelWithIncludes.defender.username;

    await Promise.all([
      prisma.notification.create({
        data: {
          type: "DUEL_WON",
          message: `You defeated ${loserName}! +${XP_REWARDS.DUEL_WIN} XP${shieldActive ? "" : " and won their weapon!"}`,
          playerId: winnerId,
          data: { duelId: duel.id },
        },
      }),
      prisma.notification.create({
        data: {
          type: "DUEL_LOST",
          message: `You were defeated by ${winnerName}.${shieldActive ? " Forge Shield protected your weapon!" : " Your weapon has been claimed."}`,
          playerId: loserId,
          data: { duelId: duel.id },
        },
      }),
    ]);

    const io = req.app.get("io");
    if (io) {
      emitNotification(io, winnerId, {
        type: "DUEL_WON",
        message: `You defeated ${loserName}!`,
        data: { duelId: duel.id },
      });
      emitNotification(io, loserId, {
        type: "DUEL_LOST",
        message: `You were defeated by ${winnerName}.`,
        data: { duelId: duel.id },
      });
    }

    res.json({
      duelId: duel.id,
      rounds,
      winnerId,
      loserId,
      weaponTransferred: !shieldActive,
    });
  } catch (err) {
    console.error("Result error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/duels/pending
router.get("/pending", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const duels = await prisma.duel.findMany({
      where: {
        defenderId: req.player!.playerId,
        status: "PENDING",
      },
      include: {
        challenger: { select: { id: true, username: true, wins: true, losses: true } },
        challengerWeapon: true,
        defenderWeapon: true,
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(duels);
  } catch (err) {
    console.error("Pending duels error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/duels/history
router.get("/history", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const duels = await prisma.duel.findMany({
      where: {
        status: "COMPLETED",
        OR: [
          { challengerId: req.player!.playerId },
          { defenderId: req.player!.playerId },
        ],
      },
      include: {
        challenger: { select: { id: true, username: true } },
        defender: { select: { id: true, username: true } },
        challengerWeapon: true,
        defenderWeapon: true,
      },
      orderBy: { completedAt: "desc" },
      take: 20,
    });
    res.json(duels);
  } catch (err) {
    console.error("Duel history error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
