import { Request, Response, NextFunction } from "express";
import { supabaseAdmin } from "../lib/supabase";

export interface AuthPayload {
  playerId: string;
  username: string;
}

export interface AuthRequest extends Request {
  player?: AuthPayload;
}

export async function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "No token provided" });
    return;
  }

  const token = header.slice(7);

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }

  req.player = {
    playerId: user.id,
    // Username is stored in Supabase user_metadata at registration time
    username: (user.user_metadata?.username as string) ?? (user.email ?? ""),
  };

  next();
}
