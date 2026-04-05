import { Router, Response } from "express";
import { z } from "zod";
import { WeaponRank } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { authenticate, AuthRequest } from "../middleware/auth";
import { emitNotification } from "../lib/socket";

const router = Router();

// Fulfillment pricing per rank tier
const PRINT_PRICES: Partial<Record<WeaponRank, number>> = {
  OBSIDIAN_IV: 18,
  VOID_V: 35,
  INFERNO_VI: 35,
  ETERNAL_VII: 75,
};

const PRINT_TIERS: Partial<Record<WeaponRank, string>> = {
  OBSIDIAN_IV: "Common",
  VOID_V: "Rare",
  INFERNO_VI: "Rare",
  ETERNAL_VII: "Legendary",
};

const addressSchema = z.object({
  name: z.string().min(1).max(100),
  line1: z.string().min(1).max(200),
  line2: z.string().max(200).optional(),
  city: z.string().min(1).max(100),
  state: z.string().max(100).optional(),
  postalCode: z.string().min(1).max(20),
  country: z.string().length(2).toUpperCase(),
});

const createOrderSchema = z.object({
  weaponId: z.string().uuid(),
  shippingAddress: addressSchema,
});

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const Stripe = require("stripe");
  return new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });
}

// POST /api/print-orders — create order / start Stripe checkout
router.post("/", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { weaponId, shippingAddress } = createOrderSchema.parse(req.body);
    const playerId = req.player!.playerId;

    const weapon = await prisma.weapon.findFirst({
      where: { id: weaponId, ownerId: playerId, printMinted: true },
    });
    if (!weapon) {
      res.status(400).json({ error: "Weapon not found or not yet minted" });
      return;
    }

    const priceUsd = PRINT_PRICES[weapon.rank];
    if (priceUsd === undefined) {
      res.status(400).json({ error: "This weapon rank is not available for physical printing" });
      return;
    }

    // Check Rank VII global limit
    if (weapon.rank === "ETERNAL_VII") {
      const activeSeason = await prisma.season.findFirst({ where: { active: true } });
      const limit = await prisma.printRunLimit.findFirst({
        where: { rank: "ETERNAL_VII", seasonId: activeSeason?.id ?? null },
      });
      if (limit && limit.currentCount >= limit.maxPrints) {
        // Add to waitlist automatically
        await prisma.printWaitlist.upsert({
          where: {
            playerId_rank_seasonId: {
              playerId,
              rank: "ETERNAL_VII",
              seasonId: activeSeason?.id ?? "none",
            },
          },
          create: { playerId, rank: "ETERNAL_VII", seasonId: activeSeason?.id },
          update: {},
        });
        res.status(409).json({
          error: "Legendary print run is full for this season",
          waitlisted: true,
          remaining: 0,
          max: limit.maxPrints,
        });
        return;
      }
    }

    const stripe = getStripe();

    if (!stripe) {
      // Dev mode: create order immediately as QUEUED
      const order = await prisma.$transaction(async (tx) => {
        const o = await tx.printOrder.create({
          data: {
            playerId,
            weaponId,
            shippingAddress,
            priceUsd,
            mintSerial: weapon.mintSerialNumber,
          },
        });
        // Increment run limit counter for Eternal VII
        if (weapon.rank === "ETERNAL_VII") {
          const activeSeason = await tx.season.findFirst({ where: { active: true } });
          await tx.printRunLimit.updateMany({
            where: { rank: "ETERNAL_VII", seasonId: activeSeason?.id ?? null },
            data: { currentCount: { increment: 1 } },
          });
        }
        return o;
      });

      // Simulated fulfillment webhook to print partner
      await triggerFulfillmentWebhook(order.id, weapon.mintSerialNumber ?? "");

      res.status(201).json({ order, devMode: true });
      return;
    }

    const player = await prisma.player.findUnique({
      where: { id: playerId },
      select: { email: true, username: true },
    });

    const tier = PRINT_TIERS[weapon.rank] ?? "Standard";
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `BattleForge ${tier} 3D Print — ${weapon.name}`,
              description: `Serial: ${weapon.mintSerialNumber} | Physical weapon + Certificate of Authenticity`,
            },
            unit_amount: Math.round(priceUsd * 100),
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${process.env.CLIENT_URL}/forge-room?print_success=true`,
      cancel_url: `${process.env.CLIENT_URL}/forge-room`,
      customer_email: player?.email,
      shipping_address_collection: { allowed_countries: ["US", "CA", "GB", "AU", "NZ", "DE", "FR", "NL", "JP", "SG"] },
      metadata: {
        playerId,
        weaponId,
        type: "PRINT_ORDER",
        mintSerial: weapon.mintSerialNumber ?? "",
        shippingAddress: JSON.stringify(shippingAddress),
      },
    });

    res.json({ checkoutUrl: session.url });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.errors[0].message });
      return;
    }
    console.error("Print order error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/print-orders/my — player's order history
router.get("/my", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const orders = await prisma.printOrder.findMany({
      where: { playerId: req.player!.playerId },
      include: {
        weapon: {
          select: {
            id: true, name: true, class: true, rank: true,
            mintSerialNumber: true, wins: true, losses: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(orders);
  } catch (err) {
    console.error("My orders error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/print-orders/:id/status — internal/webhook: update order status
router.patch("/:id/status", async (req, res: Response) => {
  try {
    const { status, fulfillmentRef, trackingLink } = req.body as {
      status: string;
      fulfillmentRef?: string;
      trackingLink?: string;
    };

    const validStatuses = ["QUEUED", "PRINTING", "SHIPPED", "DELIVERED", "CANCELLED"];
    if (!validStatuses.includes(status)) {
      res.status(400).json({ error: "Invalid status" });
      return;
    }

    const orderId = req.params.id as string;
    const order = await prisma.printOrder.update({
      where: { id: orderId },
      data: {
        status: status as any,
        ...(fulfillmentRef ? { fulfillmentRef } : {}),
        ...(trackingLink ? { trackingLink } : {}),
      },
      include: { weapon: { select: { name: true } } },
    });

    // Notify player of status change
    const message =
      status === "PRINTING" ? `Your ${order.weapon.name} is being printed!`
      : status === "SHIPPED" ? `Your ${order.weapon.name} has shipped!${trackingLink ? " Track it now." : ""}`
      : status === "DELIVERED" ? `Your ${order.weapon.name} has been delivered!`
      : `Print order updated: ${status}`;

    await prisma.notification.create({
      data: { type: "SYSTEM", message, playerId: order.playerId, data: { orderId } },
    });

    res.json(order);
  } catch (err) {
    console.error("Order status error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/print-orders/prices — public pricing table
router.get("/prices", (_req, res: Response) => {
  res.json([
    { rank: "OBSIDIAN_IV", tier: "Common", priceUsd: 18 },
    { rank: "VOID_V", tier: "Rare", priceUsd: 35 },
    { rank: "INFERNO_VI", tier: "Rare", priceUsd: 35 },
    { rank: "ETERNAL_VII", tier: "Legendary", priceUsd: 75 },
  ]);
});

// ─── Internal fulfillment trigger ────────────────────────────────────────────
async function triggerFulfillmentWebhook(orderId: string, mintSerial: string) {
  // In production: POST to print partner API with STL file reference + shipping info
  // For now: log and mark as PRINTING after 2s (simulated)
  setTimeout(async () => {
    try {
      await prisma.printOrder.update({
        where: { id: orderId },
        data: { status: "PRINTING", fulfillmentRef: `PARTNER-${Date.now()}` },
      });
      console.log(`[Fulfillment] Order ${orderId} (${mintSerial}) sent to print partner`);
    } catch (e) {
      console.error("Fulfillment trigger error:", e);
    }
  }, 2000);
}

export { PRINT_PRICES, PRINT_TIERS };
export default router;
