import { Router, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { authenticate, AuthRequest } from "../middleware/auth";

const router = Router();

const setCharacterSchema = z.object({
  characterId: z.string().uuid(),
});

// GET /api/characters — list all characters (public)
router.get("/characters", async (_req, res: Response) => {
  try {
    const characters = await prisma.character.findMany({
      orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    });
    res.json(characters);
  } catch (err) {
    console.error("Characters list error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/players/character — set player's character (auth required)
router.post("/players/character", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { characterId } = setCharacterSchema.parse(req.body);

    const character = await prisma.character.findUnique({
      where: { id: characterId },
    });

    if (!character) {
      res.status(404).json({ error: "Character not found" });
      return;
    }

    const player = await prisma.player.update({
      where: { id: req.player!.playerId },
      data: { characterId },
      include: { character: true },
    });

    res.json({ character: player.character });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.errors[0].message });
      return;
    }
    console.error("Set character error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
