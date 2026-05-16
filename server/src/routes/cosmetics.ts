import { Router, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { authenticate, AuthRequest } from "../middleware/auth";

const router = Router();

// Stripe is optional — gracefully degrade if not configured
function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const Stripe = require("stripe");
  return new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });
}

const equipSchema = z.object({
  equip: z.boolean().optional(), // true = equip, false/undefined = unequip
});

// GET /api/cosmetics — list all cosmetics in store
router.get("/cosmetics", authenticate, async (_req: AuthRequest, res: Response) => {
  try {
    const cosmetics = await prisma.characterCosmetic.findMany({
      include: { character: true },
      orderBy: [{ type: "asc" }, { name: "asc" }],
    });
    res.json(cosmetics);
  } catch (err) {
    console.error("Cosmetics list error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/players/cosmetics — list player's owned cosmetics
router.get("/players/cosmetics", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const ownedCosmetics = await prisma.playerCosmetic.findMany({
      where: { playerId: req.player!.playerId },
      include: { cosmetic: { include: { character: true } } },
      orderBy: { acquiredAt: "desc" },
    });
    res.json(ownedCosmetics);
  } catch (err) {
    console.error("Player cosmetics error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/cosmetics/:id/purchase/xp — buy cosmetic with XP
router.post("/cosmetics/:id/purchase/xp", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const cosmeticId = req.params.id as string;

    const cosmetic = await prisma.characterCosmetic.findUnique({
      where: { id: cosmeticId },
    });

    if (!cosmetic) {
      res.status(404).json({ error: "Cosmetic not found" });
      return;
    }

    if (!cosmetic.xpPrice) {
      res.status(400).json({ error: "This cosmetic is not available for XP purchase" });
      return;
    }

    // Check if already owned
    const existing = await prisma.playerCosmetic.findUnique({
      where: {
        playerId_cosmeticId: {
          playerId: req.player!.playerId,
          cosmeticId,
        },
      },
    });

    if (existing) {
      res.status(400).json({ error: "You already own this cosmetic" });
      return;
    }

    const player = await prisma.player.findUnique({
      where: { id: req.player!.playerId },
    });

    if (!player) {
      res.status(404).json({ error: "Player not found" });
      return;
    }

    if (player.xp < cosmetic.xpPrice) {
      res.status(400).json({
        error: "Insufficient XP",
        required: cosmetic.xpPrice,
        current: player.xp,
      });
      return;
    }

    // Atomic transaction: deduct XP, create PlayerCosmetic, log Transaction
    const [playerCosmetic] = await prisma.$transaction([
      prisma.playerCosmetic.create({
        data: {
          playerId: req.player!.playerId,
          cosmeticId,
        },
        include: { cosmetic: true },
      }),
      prisma.player.update({
        where: { id: req.player!.playerId },
        data: { xp: { decrement: cosmetic.xpPrice } },
      }),
      prisma.transaction.create({
        data: {
          type: "CHARACTER_COSMETIC_PURCHASE",
          xpAmount: -cosmetic.xpPrice,
          playerId: req.player!.playerId,
        },
      }),
    ]);

    res.status(201).json(playerCosmetic);
  } catch (err) {
    console.error("Cosmetic XP purchase error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/cosmetics/:id/purchase/stripe — create PaymentIntent for USD cosmetic
router.post("/cosmetics/:id/purchase/stripe", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const cosmeticId = req.params.id as string;

    const cosmetic = await prisma.characterCosmetic.findUnique({
      where: { id: cosmeticId },
    });

    if (!cosmetic) {
      res.status(404).json({ error: "Cosmetic not found" });
      return;
    }

    if (!cosmetic.usdPrice) {
      res.status(400).json({ error: "This cosmetic is not available for USD purchase" });
      return;
    }

    // Check if already owned
    const existing = await prisma.playerCosmetic.findUnique({
      where: {
        playerId_cosmeticId: {
          playerId: req.player!.playerId,
          cosmeticId,
        },
      },
    });

    if (existing) {
      res.status(400).json({ error: "You already own this cosmetic" });
      return;
    }

    const stripe = getStripe();
    if (!stripe) {
      // Dev mode: grant directly
      const playerCosmetic = await prisma.playerCosmetic.create({
        data: {
          playerId: req.player!.playerId,
          cosmeticId,
        },
        include: { cosmetic: true },
      });
      await prisma.transaction.create({
        data: {
          type: "CHARACTER_COSMETIC_PURCHASE",
          xpAmount: 0,
          usdAmount: cosmetic.usdPrice,
          playerId: req.player!.playerId,
        },
      });
      res.json({ success: true, devMode: true, playerCosmetic });
      return;
    }

    const player = await prisma.player.findUnique({
      where: { id: req.player!.playerId },
      select: { email: true, username: true },
    });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `BattleForge — ${cosmetic.name}`,
              description: cosmetic.description,
            },
            unit_amount: Math.round(cosmetic.usdPrice * 100),
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${process.env.CLIENT_URL}/store/cosmetics?success=true`,
      cancel_url: `${process.env.CLIENT_URL}/store/cosmetics?cancelled=true`,
      customer_email: player?.email,
      metadata: {
        playerId: req.player!.playerId,
        cosmeticId,
        type: "CHARACTER_COSMETIC_PURCHASE",
      },
    });

    res.json({ checkoutUrl: session.url });
  } catch (err) {
    console.error("Cosmetic Stripe purchase error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/players/cosmetics/:id/equip — equip/unequip cosmetic
router.post("/players/cosmetics/:id/equip", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const cosmeticId = req.params.id as string;
    const { equip } = equipSchema.parse(req.body);

    // Check ownership
    const playerCosmetic = await prisma.playerCosmetic.findUnique({
      where: {
        playerId_cosmeticId: {
          playerId: req.player!.playerId,
          cosmeticId,
        },
      },
      include: { cosmetic: true },
    });

    if (!playerCosmetic) {
      res.status(404).json({ error: "You do not own this cosmetic" });
      return;
    }

    const newSlot = equip === false ? null : playerCosmetic.cosmetic.type;

    const updated = await prisma.playerCosmetic.update({
      where: {
        playerId_cosmeticId: {
          playerId: req.player!.playerId,
          cosmeticId,
        },
      },
      data: { equippedSlot: newSlot },
      include: { cosmetic: true },
    });

    res.json(updated);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.errors[0].message });
      return;
    }
    console.error("Equip cosmetic error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
