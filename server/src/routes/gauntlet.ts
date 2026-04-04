import { Router, Response } from "express";
import { prisma } from "../lib/prisma";
import { authenticate, AuthRequest } from "../middleware/auth";
import { emitNotification } from "../lib/socket";

const router = Router();

const GAUNTLET_COOLDOWN_HOURS = 72;
const GAUNTLET_SERIAL_SEQ_KEY = "gauntlet_seq";

async function nextGauntletSerial(): Promise<string> {
  // Simple sequence using transaction count as proxy
  const count = await prisma.gauntlet.count();
  const year = new Date().getFullYear();
  return `BF-GNTLT-${year}-${String(count + 1).padStart(4, "0")}`;
}

// GET /api/gauntlet/mine — get current player's Gauntlet
router.get("/mine", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const gauntlet = await prisma.gauntlet.findFirst({
      where: { ownerId: req.player!.playerId },
      orderBy: { createdAt: "desc" },
    });
    res.json(gauntlet ?? null);
  } catch (err) {
    console.error("Gauntlet mine error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/gauntlet/throw — issue a cross-rank challenge
router.post("/throw", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { defenderId, defenderWeaponId } = req.body as {
      defenderId: string;
      defenderWeaponId: string;
    };

    const playerId = req.player!.playerId;

    if (!defenderId || !defenderWeaponId) {
      res.status(400).json({ error: "defenderId and defenderWeaponId are required" });
      return;
    }

    if (defenderId === playerId) {
      res.status(400).json({ error: "Cannot challenge yourself" });
      return;
    }

    // Find player's Gauntlet
    const gauntlet = await prisma.gauntlet.findFirst({
      where: { ownerId: playerId },
      orderBy: { createdAt: "desc" },
    });

    if (!gauntlet) {
      res.status(403).json({ error: "You do not own a Gauntlet" });
      return;
    }

    // Check cooldown
    if (gauntlet.cooldownUntil && gauntlet.cooldownUntil > new Date()) {
      const hoursLeft = Math.ceil(
        (gauntlet.cooldownUntil.getTime() - Date.now()) / 3_600_000
      );
      res.status(400).json({
        error: `Gauntlet is on cooldown for ${hoursLeft} more hour(s)`,
        cooldownUntil: gauntlet.cooldownUntil,
      });
      return;
    }

    // Check temp token expiry
    if (gauntlet.tempToken && gauntlet.tempExpiry && gauntlet.tempExpiry < new Date()) {
      res.status(400).json({ error: "Temporary Gauntlet token has expired" });
      return;
    }

    // Find challenger's Gauntlet weapon (by class = GAUNTLET)
    const challengerWeapon = await prisma.weapon.findFirst({
      where: { ownerId: playerId, class: "GAUNTLET", isStaked: false },
    });

    if (!challengerWeapon) {
      res.status(400).json({ error: "No available Gauntlet weapon to stake" });
      return;
    }

    // Verify defender weapon exists and is not staked
    const defenderWeapon = await prisma.weapon.findFirst({
      where: { id: defenderWeaponId, ownerId: defenderId, isStaked: false },
    });

    if (!defenderWeapon) {
      res.status(400).json({ error: "Defender weapon not found or already staked" });
      return;
    }

    // Create duel (Gauntlet = auto-accepted)
    const cooldownUntil = new Date(Date.now() + GAUNTLET_COOLDOWN_HOURS * 3_600_000);

    const [duel] = await prisma.$transaction([
      prisma.duel.create({
        data: {
          challengerId: playerId,
          defenderId,
          challengerWeaponId: challengerWeapon.id,
          defenderWeaponId,
          gauntletUsed: true,
          status: "ACCEPTED", // auto-accepted
        },
      }),
      prisma.weapon.updateMany({
        where: { id: { in: [challengerWeapon.id, defenderWeaponId] } },
        data: { isStaked: true },
      }),
      prisma.gauntlet.update({
        where: { id: gauntlet.id },
        data: { cooldownUntil },
      }),
    ]);

    // Red alert notification to defender
    const challenger = await prisma.player.findUnique({
      where: { id: playerId },
      select: { username: true },
    });

    await prisma.notification.create({
      data: {
        type: "GAUNTLET_ISSUED",
        message: `⚠️ ${challenger!.username} has thrown the Gauntlet at you! Report to the Arena immediately.`,
        playerId: defenderId,
        data: { duelId: duel.id },
      },
    });

    const io = req.app.get("io");
    if (io) {
      emitNotification(io, defenderId, {
        type: "GAUNTLET_ISSUED",
        message: `⚠️ ${challenger!.username} has thrown the Gauntlet!`,
        data: { duelId: duel.id },
      });
    }

    res.status(201).json({ duel, cooldownUntil });
  } catch (err) {
    console.error("Gauntlet throw error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/gauntlet/cooldown — check cooldown status
router.get("/cooldown", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const gauntlet = await prisma.gauntlet.findFirst({
      where: { ownerId: req.player!.playerId },
    });
    if (!gauntlet) {
      res.json({ hasCooldown: false });
      return;
    }
    const onCooldown = !!(gauntlet.cooldownUntil && gauntlet.cooldownUntil > new Date());
    res.json({ hasCooldown: onCooldown, cooldownUntil: gauntlet.cooldownUntil });
  } catch (err) {
    console.error("Gauntlet cooldown error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
