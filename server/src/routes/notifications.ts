import { Router, Response } from "express";
import { prisma } from "../lib/prisma";
import { authenticate, AuthRequest } from "../middleware/auth";

const router = Router();

// GET /api/notifications
router.get("/", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { playerId: req.player!.playerId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    res.json(notifications);
  } catch (err) {
    console.error("Notifications error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/notifications/read-all
router.post("/read-all", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    await prisma.notification.updateMany({
      where: { playerId: req.player!.playerId, read: false },
      data: { read: true },
    });
    res.json({ message: "All notifications marked as read" });
  } catch (err) {
    console.error("Read all error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/notifications/:id/read
router.post("/:id/read", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const notifId = req.params.id as string;
    await prisma.notification.updateMany({
      where: {
        id: notifId,
        playerId: req.player!.playerId,
      },
      data: { read: true },
    });
    res.json({ message: "Notification marked as read" });
  } catch (err) {
    console.error("Read error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
