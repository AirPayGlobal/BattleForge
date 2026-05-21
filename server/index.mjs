// Minimal static host for the BattleForge arcade fighter.
// Serves the Vite-built client from ./public and exposes /api/health.

import express from "express";
import compression from "compression";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, "public");
const PORT = Number(process.env.PORT) || 3001;

const app = express();
app.disable("x-powered-by");
app.use(compression());

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    service: "battleforge",
    version: process.env.npm_package_version ?? "0.2.0",
    time: new Date().toISOString(),
  });
});

// Long-cache hashed assets (Vite emits content-hashed filenames under /assets).
app.use(
  "/assets",
  express.static(path.join(PUBLIC_DIR, "assets"), {
    immutable: true,
    maxAge: "1y",
  }),
);

// Everything else served with conservative caching.
app.use(
  express.static(PUBLIC_DIR, {
    index: "index.html",
    maxAge: "1h",
    etag: true,
  }),
);

// SPA fallback — the game is single-page; unknown paths return index.html.
app.get("*", (_req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "index.html"));
});

app.listen(PORT, () => {
  console.log(`[battleforge] listening on :${PORT}`);
  console.log(`[battleforge] serving ${PUBLIC_DIR}`);
});
