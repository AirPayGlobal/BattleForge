import { Router, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { supabaseAdmin } from "../lib/supabase";
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
// Creates a Supabase Auth user, then a matching Player record in our DB.
router.post("/register", async (req: Request, res: Response) => {
  try {
    const data = registerSchema.parse(req.body);

    // Check username uniqueness in our Player table first
    const existingUsername = await prisma.player.findUnique({
      where: { username: data.username },
    });
    if (existingUsername) {
      res.status(409).json({ error: "Username already taken" });
      return;
    }

    // Create Supabase Auth user (server-side admin — skips email confirmation)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { username: data.username },
    });

    if (authError) {
      const msg = authError.message.toLowerCase();
      if (msg.includes("already registered") || msg.includes("already exists")) {
        res.status(409).json({ error: "Email already registered" });
      } else {
        console.error("Supabase createUser error:", authError);
        res.status(500).json({ error: "Failed to create account" });
      }
      return;
    }

    const supabaseUser = authData.user;

    // Create Player record with the Supabase-assigned UUID as primary key
    const player = await prisma.player.create({
      data: {
        id: supabaseUser.id,
        username: data.username,
        email: data.email,
        xp: 1000, // starter XP
      },
    });

    // Sign in immediately after creation so we can return a session token —
    // avoids the client needing a separate login round-trip.
    const { data: sessionData, error: sessionError } = await supabaseAdmin.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (sessionError || !sessionData?.session) {
      // Player created but we couldn't get a session — client should log in
      res.status(201).json({
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
      return;
    }

    res.status(201).json({
      token: sessionData.session.access_token,
      refreshToken: sessionData.session.refresh_token,
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
    console.error("Register error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/auth/login
router.post("/login", async (req: Request, res: Response) => {
  try {
    const data = loginSchema.parse(req.body);

    const { data: authData, error } = await supabaseAdmin.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (error || !authData.session) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    let player = await prisma.player.findUnique({
      where: { id: authData.user.id },
    });

    // Supabase auth exists but DB row was lost (e.g. after a schema migration).
    // Recreate the player profile so the account stays accessible.
    if (!player) {
      const email = authData.user.email ?? data.email;
      const baseUsername = email.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "");
      const username = `${baseUsername}_${Math.floor(Math.random() * 9000) + 1000}`;
      player = await prisma.player.create({
        data: {
          id: authData.user.id,
          email,
          username,
        },
      });
    }

    res.json({
      token: authData.session.access_token,
      refreshToken: authData.session.refresh_token,
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

// POST /api/auth/refresh
// Exchanges a Supabase refresh_token for a new access_token.
// The client should call this when the API returns 401 and a refreshToken is stored.
router.post("/refresh", async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      res.status(400).json({ error: "refreshToken required" });
      return;
    }

    const { data, error } = await supabaseAdmin.auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (error || !data.session) {
      res.status(401).json({ error: "Invalid or expired refresh token" });
      return;
    }

    res.json({
      token: data.session.access_token,
      refreshToken: data.session.refresh_token,
    });
  } catch (err) {
    console.error("Refresh error:", err);
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
