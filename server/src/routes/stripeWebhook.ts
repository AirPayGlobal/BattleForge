import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { XP_PACKS } from "../lib/constants";

const router = Router();

router.post("/", async (req: Request, res: Response) => {
  const sig = req.headers["stripe-signature"];
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    res.status(200).json({ received: true, devMode: true });
    return;
  }

  let event: any;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Stripe = require("stripe");
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err: any) {
    console.error("Stripe webhook verification failed:", err.message);
    res.status(400).json({ error: `Webhook Error: ${err.message}` });
    return;
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const { playerId, packName, xpAmount, type, seasonId } = session.metadata ?? {};

    try {
      if (type === "BATTLE_PASS" && seasonId) {
        await prisma.battlePass.upsert({
          where: { playerId_seasonId: { playerId, seasonId } },
          create: { playerId, seasonId, stripePaymentId: session.payment_intent } as any,
          update: {},
        });
        await prisma.transaction.create({
          data: {
            type: "BATTLE_PASS",
            xpAmount: 0,
            usdAmount: session.amount_total / 100,
            stripePaymentId: session.payment_intent,
            playerId,
          },
        });
      } else if (type === "PRINT_ORDER") {
        const { printOrderId } = session.metadata ?? {};
        if (printOrderId) {
          await prisma.printOrder.update({
            where: { id: printOrderId },
            data: {
              status: "QUEUED",
              stripePaymentId: session.payment_intent ?? session.id,
            },
          });
          await prisma.transaction.create({
            data: {
              type: "PRINT_ORDER",
              xpAmount: 0,
              usdAmount: session.amount_total / 100,
              stripePaymentId: session.payment_intent ?? session.id,
              playerId,
            },
          });
        }
      } else if (packName && xpAmount) {
        const xp = parseInt(xpAmount, 10);
        await prisma.$transaction([
          prisma.player.update({ where: { id: playerId }, data: { xp: { increment: xp } } }),
          prisma.transaction.create({
            data: {
              type: "XP_PACK_PURCHASE",
              xpAmount: xp,
              usdAmount: session.amount_total / 100,
              stripePaymentId: session.payment_intent,
              playerId,
            },
          }),
        ]);
      }
    } catch (dbErr) {
      console.error("Stripe webhook DB error:", dbErr);
    }
  }

  res.json({ received: true });
});

export default router;
