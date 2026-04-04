import { Router, Response } from "express";
import { prisma } from "../lib/prisma";
import { authenticate, AuthRequest } from "../middleware/auth";
import { generateCoa } from "../lib/coaGenerator";

const router = Router();

// GET /api/weapons/:id/coa — generate COA PDF (owner only)
router.get("/:id/coa", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const weaponId = req.params.id as string;

    const weapon = await prisma.weapon.findFirst({
      where: { id: weaponId, ownerId: req.player!.playerId, printMinted: true },
      include: {
        owner: { select: { username: true } },
      },
    });

    if (!weapon) {
      res.status(404).json({ error: "Weapon not found or not yet minted" });
      return;
    }

    // Fetch duel history involving this weapon
    const duels = await prisma.duel.findMany({
      where: {
        status: "COMPLETED",
        OR: [{ challengerWeaponId: weaponId }, { defenderWeaponId: weaponId }],
      },
      include: {
        challenger: { select: { username: true } },
        defender: { select: { username: true } },
      },
      orderBy: { completedAt: "desc" },
      take: 5,
    });

    const publicUrl = `${process.env.CLIENT_URL || "http://localhost:5173"}/weapon/${weapon.id}/public`;

    await generateCoa(
      {
        weaponName: weapon.name,
        weaponClass: weapon.class,
        rank: weapon.rank,
        mintSerial: weapon.mintSerialNumber ?? weapon.serialNumber,
        ownerUsername: weapon.owner.username,
        wins: weapon.wins,
        losses: weapon.losses,
        mintedAt: weapon.mintedAt ?? weapon.createdAt,
        publicUrl,
        recentDuels: duels.map((d) => ({
          challenger: d.challenger.username,
          defender: d.defender.username,
          winnerId: d.winnerId ?? "",
          weaponId,
        })),
      },
      res
    );
  } catch (err) {
    console.error("COA generation error:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to generate certificate" });
    }
  }
});

export default router;
