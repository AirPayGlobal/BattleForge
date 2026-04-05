import { Router, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { authenticate, AuthRequest } from "../middleware/auth";
import { XP_PACKS } from "../lib/constants";

const router = Router();

// Stripe is optional — gracefully degrade if not configured
function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const Stripe = require("stripe");
  return new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });
}

const xpPackSchema = z.object({
  packName: z.enum(["Starter", "Forge", "Arsenal", "Forgemaster"]),
});

// POST /api/payments/xp-pack
router.post("/xp-pack", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { packName } = xpPackSchema.parse(req.body);
    const pack = XP_PACKS.find((p) => p.name === packName);
    if (!pack) {
      res.status(400).json({ error: "Invalid pack" });
      return;
    }

    const stripe = getStripe();
    if (!stripe) {
      // Dev mode: credit XP directly
      await prisma.$transaction([
        prisma.player.update({
          where: { id: req.player!.playerId },
          data: { xp: { increment: pack.xp } },
        }),
        prisma.transaction.create({
          data: {
            type: "XP_PACK_PURCHASE",
            xpAmount: pack.xp,
            usdAmount: pack.usd,
            playerId: req.player!.playerId,
          },
        }),
      ]);
      res.json({ success: true, devMode: true, xpGranted: pack.xp });
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
              name: `BattleForge ${pack.name} XP Pack`,
              description: `${pack.xp.toLocaleString()} XP for BattleForge`,
            },
            unit_amount: Math.round(pack.usd * 100),
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${process.env.CLIENT_URL}/store?success=true`,
      cancel_url: `${process.env.CLIENT_URL}/store?cancelled=true`,
      customer_email: player?.email,
      metadata: {
        playerId: req.player!.playerId,
        packName,
        xpAmount: pack.xp.toString(),
      },
    });

    res.json({ checkoutUrl: session.url });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.errors[0].message });
      return;
    }
    console.error("XP pack error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/payments/battle-pass
router.post("/battle-pass", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const BATTLE_PASS_PRICE_USD = 9.99;

    // Find active season
    const season = await prisma.season.findFirst({ where: { active: true } });
    if (!season) {
      res.status(400).json({ error: "No active season" });
      return;
    }

    // Check if already purchased
    const existing = await prisma.battlePass.findUnique({
      where: {
        playerId_seasonId: { playerId: req.player!.playerId, seasonId: season.id },
      },
    });
    if (existing) {
      res.status(400).json({ error: "Battle Pass already purchased for this season" });
      return;
    }

    const stripe = getStripe();
    if (!stripe) {
      // Dev mode: grant directly
      await prisma.battlePass.create({
        data: { playerId: req.player!.playerId, seasonId: season.id },
      });
      await prisma.transaction.create({
        data: {
          type: "BATTLE_PASS",
          xpAmount: 0,
          usdAmount: BATTLE_PASS_PRICE_USD,
          playerId: req.player!.playerId,
        },
      });
      res.json({ success: true, devMode: true });
      return;
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `BattleForge Battle Pass — ${season.name}`,
              description: "+25% XP from wins, exclusive skins, priority matchmaking",
            },
            unit_amount: Math.round(BATTLE_PASS_PRICE_USD * 100),
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${process.env.CLIENT_URL}/battle-pass?success=true`,
      cancel_url: `${process.env.CLIENT_URL}/battle-pass?cancelled=true`,
      metadata: {
        playerId: req.player!.playerId,
        type: "BATTLE_PASS",
        seasonId: season.id,
      },
    });

    res.json({ checkoutUrl: session.url });
  } catch (err) {
    console.error("Battle pass error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/payments/packs — list available packs
router.get("/packs", (_req, res: Response) => {
  res.json(XP_PACKS.map((p, i) => ({ ...p, bestValue: i === 1 })));
});

export default router;
