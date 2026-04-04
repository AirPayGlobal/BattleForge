import { Router, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { authenticate, AuthRequest } from "../middleware/auth";

const router = Router();

const registerSchema = z.object({
  username: z
    .string()
    .min(3)
    .max(20)
    .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
  email: z.string().email(),
  password: z.string().min(6).max(100),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

// POST /api/auth/register
router.post("/register", async (req: AuthRequest, res: Response) => {
  try {
    const data = registerSchema.parse(req.body);

    const existing = await prisma.player.findFirst({
      where: {
        OR: [{ email: data.email }, { username: data.username }],
      },
    });
    if (existing) {
      res.status(409).json({
        error:
          existing.email === data.email
            ? "Email already registered"
            : "Username already taken",
      });
      return;
    }

    const passwordHash = await bcrypt.hash(data.password, 12);
    const player = await prisma.player.create({
      data: {
        username: data.username,
        email: data.email,
        passwordHash,
        xp: 1000, // starter XP
      },
    });

    const token = jwt.sign(
      { playerId: player.id, username: player.username },
      process.env.JWT_SECRET!,
      { expiresIn: "7d" as any }
    );

    res.status(201).json({
      token,
      player: {
        id: player.id,
        username: player.username,
        email: player.email,
        xp: player.xp,
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.errors[0].message });
      return;
    }
    console.error("Register error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/auth/login
router.post("/login", async (req: AuthRequest, res: Response) => {
  try {
    const data = loginSchema.parse(req.body);

    const player = await prisma.player.findUnique({
      where: { email: data.email },
    });
    if (!player) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const valid = await bcrypt.compare(data.password, player.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const token = jwt.sign(
      { playerId: player.id, username: player.username },
      process.env.JWT_SECRET!,
      { expiresIn: "7d" as any }
    );

    res.json({
      token,
      player: {
        id: player.id,
        username: player.username,
        email: player.email,
        xp: player.xp,
        wins: player.wins,
        losses: player.losses,
        winStreak: player.winStreak,
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.errors[0].message });
      return;
    }
    console.error("Login error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/auth/me
router.get("/me", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const player = await prisma.player.findUnique({
      where: { id: req.player!.playerId },
      include: {
        _count: {
          select: { weapons: true, notifications: { where: { read: false } } },
        },
      },
    });

    if (!player) {
      res.status(404).json({ error: "Player not found" });
      return;
    }

    res.json({
      id: player.id,
      username: player.username,
      email: player.email,
      xp: player.xp,
      wins: player.wins,
      losses: player.losses,
      winStreak: player.winStreak,
      weaponCount: player._count.weapons,
      unreadNotifications: player._count.notifications,
      createdAt: player.createdAt,
    });
  } catch (err) {
    console.error("Me error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
