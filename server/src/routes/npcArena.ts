import { Router, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { authenticate, AuthRequest } from "../middleware/auth";
import { NPC_XP_REWARDS } from "../lib/constants";

const router = Router();

const battleSchema = z.object({
  weaponId: z.string().uuid(),
});

// GET /api/npcs — list all NPCs with their tier and character
router.get("/", authenticate, async (_req: AuthRequest, res: Response) => {
  try {
    const npcs = await prisma.npc.findMany({
      include: { character: true },
      orderBy: [{ tier: "asc" }, { name: "asc" }],
    });
    res.json(npcs);
  } catch (err) {
    console.error("NPCs list error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/npcs/:id/battle — battle an NPC
router.post("/:id/battle", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const npcId = req.params.id as string;
    const { weaponId } = battleSchema.parse(req.body);
    const playerId = req.player!.playerId;

    // Validate NPC exists
    const npc = await prisma.npc.findUnique({
      where: { id: npcId },
    });
    if (!npc) {
      res.status(404).json({ error: "NPC not found" });
      return;
    }

    // Validate player owns the weapon and it's not staked
    const weapon = await prisma.weapon.findUnique({
      where: { id: weaponId },
    });
    if (!weapon) {
      res.status(404).json({ error: "Weapon not found" });
      return;
    }
    if (weapon.ownerId !== playerId) {
      res.status(403).json({ error: "You do not own this weapon" });
      return;
    }
    if (weapon.isStaked) {
      res.status(400).json({ error: "This weapon is currently staked in a duel" });
      return;
    }

    // Determine win rate by tier
    const WIN_RATES: Record<string, number> = {
      BEGINNER: 0.6,
      WARRIOR: 0.5,
      ELITE: 0.4,
    };
    const winRate = WIN_RATES[npc.tier] ?? 0.5;
    const won = Math.random() < winRate;

    // Simulate rounds (3 rounds)
    const rounds = simulateBattle(npc.tier, won);

    const xpEarned = won ? NPC_XP_REWARDS[npc.tier] : 0;
    const result = won ? "WIN" : "LOSS";

    // Persist: create battle record, award XP, log transaction
    if (won) {
      await prisma.$transaction([
        prisma.npcBattle.create({
          data: {
            result: "WIN",
            xpEarned,
            rounds,
            playerId,
            npcId,
            weaponId,
          },
        }),
        prisma.player.update({
          where: { id: playerId },
          data: { xp: { increment: xpEarned } },
        }),
        prisma.transaction.create({
          data: {
            type: "NPC_BATTLE_WIN",
            xpAmount: xpEarned,
            playerId,
          },
        }),
      ]);
    } else {
      await prisma.npcBattle.create({
        data: {
          result: "LOSS",
          xpEarned: 0,
          rounds,
          playerId,
          npcId,
          weaponId,
        },
      });
    }

    res.json({ result, xpEarned, rounds });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.errors[0].message });
      return;
    }
    console.error("NPC battle error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function simulateBattle(tier: string, playerWins: boolean) {
  const MAX_ROUNDS = 3;
  const rounds: Array<{
    round: number;
    playerAction: string;
    npcAction: string;
    playerDmg: number;
    npcDmg: number;
    winner: string;
  }> = [];

  const actions = ["attack", "block", "special"];
  let playerRoundsWon = 0;
  let npcRoundsWon = 0;

  // Tier multiplier for NPC damage
  const npcStrength: Record<string, number> = {
    BEGINNER: 0.7,
    WARRIOR: 1.0,
    ELITE: 1.3,
  };
  const strength = npcStrength[tier] ?? 1.0;

  for (let i = 1; i <= MAX_ROUNDS; i++) {
    const playerAction = actions[Math.floor(Math.random() * actions.length)];
    const npcAction = actions[Math.floor(Math.random() * actions.length)];

    const baseDmg = 20 + Math.floor(Math.random() * 15);
    const playerDmg = baseDmg;
    const npcDmg = Math.floor(baseDmg * strength);

    let roundWinner: string;
    if (playerDmg > npcDmg) {
      roundWinner = "player";
      playerRoundsWon++;
    } else if (npcDmg > playerDmg) {
      roundWinner = "npc";
      npcRoundsWon++;
    } else {
      roundWinner = "draw";
    }

    rounds.push({ round: i, playerAction, npcAction, playerDmg, npcDmg, winner: roundWinner });

    if (playerRoundsWon >= 2 || npcRoundsWon >= 2) break;
  }

  // Adjust rounds so overall outcome matches the predetermined result
  // (round simulation is cosmetic; the true result is determined by win rate)
  const playerRoundsTotal = rounds.filter((r) => r.winner === "player").length;
  const npcRoundsTotal = rounds.filter((r) => r.winner === "npc").length;

  if (playerWins && playerRoundsTotal <= npcRoundsTotal && rounds.length > 0) {
    rounds[rounds.length - 1].winner = "player";
  } else if (!playerWins && npcRoundsTotal <= playerRoundsTotal && rounds.length > 0) {
    rounds[rounds.length - 1].winner = "npc";
  }

  return rounds;
}

export default router;
