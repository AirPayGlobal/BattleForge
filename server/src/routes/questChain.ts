import { Router, Response } from "express";
import { prisma } from "../lib/prisma";
import { authenticate, AuthRequest } from "../middleware/auth";

const router = Router();

// GET /api/quest/status
router.get("/status", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const quest = await prisma.gauntletQuest.findUnique({
      where: { playerId: req.player!.playerId },
    });

    if (!quest) {
      // Auto-create quest entry
      const newQuest = await prisma.gauntletQuest.create({
        data: { playerId: req.player!.playerId },
      });
      res.json(newQuest);
      return;
    }

    res.json(quest);
  } catch (err) {
    console.error("Quest status error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/quest/check — trigger server-side validation of current stage
router.post("/check", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const playerId = req.player!.playerId;
    const quest = await prisma.gauntletQuest.findUnique({ where: { playerId } });
    if (!quest) {
      res.status(404).json({ error: "Quest not found. GET /api/quest/status first." });
      return;
    }

    if (quest.completedAt) {
      res.json({ completed: true, quest });
      return;
    }

    const result = await checkStageCompletion(playerId, quest.currentStage, quest.stageData as any);

    if (result.completed) {
      const nextStage = quest.currentStage + 1;

      if (nextStage > 7) {
        // All 7 stages complete → award permanent Gauntlet
        const serial = `BF-GNTLT-${new Date().getFullYear()}-${String(await prisma.gauntlet.count() + 1).padStart(4, "0")}`;
        await prisma.$transaction([
          prisma.gauntletQuest.update({
            where: { playerId },
            data: { currentStage: 7, completedAt: new Date() },
          }),
          prisma.gauntlet.create({
            data: { ownerId: playerId, serialNumber: serial, questEarned: true },
          }),
          prisma.weapon.create({
            data: {
              name: "The Gauntlet",
              class: "GAUNTLET",
              rank: "ETERNAL_VII",
              xpCost: 0,
              isPrintEligible: true,
              serialNumber: `${serial}-W`,
              ownerId: playerId,
            },
          }),
          prisma.notification.create({
            data: {
              type: "GAUNTLET_EARNED",
              message: `The Gauntlet is yours! Serial: ${serial}. Your legend begins.`,
              playerId,
            },
          }),
        ]);

        const updated = await prisma.gauntletQuest.findUnique({ where: { playerId } });
        res.json({ stageCompleted: true, questCompleted: true, gauntletAwarded: true, serial, quest: updated });
        return;
      }

      // Advance to next stage
      const updatedQuest = await prisma.gauntletQuest.update({
        where: { playerId },
        data: {
          currentStage: nextStage,
          stageData: result.newStageData ?? {},
        },
      });

      // Stage 7: issue temp Gauntlet token
      if (nextStage === 7) {
        const tempSerial = `BF-TEMP-${Date.now()}`;
        const expiry = new Date(Date.now() + 48 * 3_600_000);
        await prisma.gauntlet.create({
          data: {
            ownerId: playerId,
            serialNumber: tempSerial,
            questEarned: false,
            tempToken: true,
            tempExpiry: expiry,
          },
        });
        // Also give temp Gauntlet weapon
        await prisma.weapon.create({
          data: {
            name: "Temp Gauntlet",
            class: "GAUNTLET",
            rank: "IRON_I",
            xpCost: 0,
            serialNumber: `${tempSerial}-W`,
            ownerId: playerId,
          },
        });
      }

      res.json({ stageCompleted: true, nextStage, quest: updatedQuest });
    } else {
      res.json({ stageCompleted: false, currentStage: quest.currentStage, hint: result.hint });
    }
  } catch (err) {
    console.error("Quest check error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/quest/stage7-fail — called when Stage 7 temp Gauntlet duel is lost
router.post("/stage7-fail", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const playerId = req.player!.playerId;
    const quest = await prisma.gauntletQuest.findUnique({ where: { playerId } });
    if (!quest || quest.currentStage !== 7) {
      res.status(400).json({ error: "Not on Stage 7" });
      return;
    }

    // Reset to Stage 5, remove temp Gauntlet
    await prisma.$transaction([
      prisma.gauntletQuest.update({
        where: { playerId },
        data: { currentStage: 5, stageData: {} },
      }),
      prisma.gauntlet.deleteMany({ where: { ownerId: playerId, tempToken: true } }),
      prisma.weapon.deleteMany({ where: { ownerId: playerId, class: "GAUNTLET", name: "Temp Gauntlet" } }),
    ]);

    res.json({ reset: true, newStage: 5 });
  } catch (err) {
    console.error("Stage7 fail error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Stage Validation Logic ──────────────────────────────────────────────────

async function checkStageCompletion(
  playerId: string,
  stage: number,
  stageData: Record<string, any>
): Promise<{ completed: boolean; hint?: string; newStageData?: any }> {
  switch (stage) {
    case 1: {
      // Win 5 ranked duels with Rank I weapon, no Forge Shield
      const wins = await prisma.duel.count({
        where: {
          winnerId: playerId,
          status: "COMPLETED",
          gauntletUsed: false,
          challengerWeapon: { rank: "IRON_I", forgeShield: false, ownerId: playerId },
        },
      });
      return wins >= 5
        ? { completed: true }
        : { completed: false, hint: `Win ${5 - wins} more ranked duels with an Iron I weapon (no Forge Shield).` };
    }

    case 2: {
      // Deliberately lose a ranked duel without Forge Shield
      const loss = await prisma.duel.count({
        where: {
          status: "COMPLETED",
          gauntletUsed: false,
          OR: [
            { challengerId: playerId, winner: { id: { not: playerId } }, challengerWeapon: { forgeShield: false } },
            { defenderId: playerId, winner: { id: { not: playerId } }, defenderWeapon: { forgeShield: false } },
          ],
        },
      });
      return loss >= 1
        ? { completed: true }
        : { completed: false, hint: "Lose a ranked duel without a Forge Shield active on your weapon." };
    }

    case 3: {
      // Forge one weapon of each class (Blade, Polearm, Ranged) from earned XP
      const classes = ["BLADE", "POLEARM", "RANGED"] as const;
      const forged = await prisma.weapon.findMany({
        where: { ownerId: playerId, class: { in: ["BLADE", "POLEARM", "RANGED"] } },
        select: { class: true },
      });
      const forgedClasses = new Set(forged.map((w) => w.class));
      const missing = classes.filter((c) => !forgedClasses.has(c));
      return missing.length === 0
        ? { completed: true }
        : { completed: false, hint: `Still need to forge: ${missing.join(", ")}` };
    }

    case 4: {
      // Watch a live Gauntlet duel (tracked via stageData flag set externally)
      const watched = stageData?.watchedGauntlet === true;
      return watched
        ? { completed: true }
        : { completed: false, hint: "Watch a live Gauntlet duel in spectator mode." };
    }

    case 5: {
      // Win a duel vs player 2 ranks above using Rank I weapon
      const rankOrder = ["IRON_I", "BRONZE_II", "STEEL_III", "OBSIDIAN_IV", "VOID_V", "INFERNO_VI", "ETERNAL_VII"];
      const playerRank = 0; // Iron I

      const eligibleDuels = await prisma.duel.findMany({
        where: {
          winnerId: playerId,
          status: "COMPLETED",
          challengerWeapon: { rank: "IRON_I", ownerId: playerId },
        },
        include: {
          defenderWeapon: { select: { rank: true } },
        },
      });

      const qualifies = eligibleDuels.some((d) => {
        const defRankIdx = rankOrder.indexOf(d.defenderWeapon.rank);
        return defRankIdx >= playerRank + 2;
      });

      return qualifies
        ? { completed: true }
        : { completed: false, hint: "Win a duel against a player ranked 2+ ranks above you, using a Rank I weapon." };
    }

    case 6: {
      // Craft a Rank V weapon
      const vWeapon = await prisma.weapon.findFirst({
        where: { ownerId: playerId, rank: "VOID_V" },
      });
      return vWeapon
        ? { completed: true }
        : { completed: false, hint: "Craft a Void V rank weapon." };
    }

    case 7: {
      // Win a duel using the temp Gauntlet token
      const tempGauntlet = await prisma.gauntlet.findFirst({
        where: { ownerId: playerId, tempToken: true },
      });
      if (!tempGauntlet) {
        return { completed: false, hint: "Your temporary Gauntlet token is missing." };
      }

      const won = await prisma.duel.findFirst({
        where: {
          winnerId: playerId,
          gauntletUsed: true,
          status: "COMPLETED",
          createdAt: { gte: tempGauntlet.createdAt },
        },
      });
      return won
        ? { completed: true }
        : { completed: false, hint: "Win a Gauntlet duel using your temporary Gauntlet token." };
    }

    default:
      return { completed: false, hint: "Unknown stage." };
  }
}

export default router;
