import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import http from "http";
import { Server as SocketServer } from "socket.io";
import { prisma } from "./lib/prisma";
import authRoutes from "./routes/auth";
import playerRoutes from "./routes/players";
import forgeRoutes from "./routes/forge";
import duelRoutes from "./routes/duels";
import notificationRoutes from "./routes/notifications";
import weaponRoutes from "./routes/weapons";
import gauntletRoutes from "./routes/gauntlet";
import paymentRoutes from "./routes/payments";
import forgeShieldRoutes from "./routes/forgeShield";
import seasonRoutes from "./routes/seasons";
import tournamentRoutes from "./routes/tournaments";
import questChainRoutes from "./routes/questChain";
import stripeWebhookRoutes from "./routes/stripeWebhook";
import { setupSocketHandlers } from "./lib/socket";
import { setupArenaHandlers } from "./lib/combat";

const app = express();
const server = http.createServer(app);
const io = new SocketServer(server, {
  cors: {
    origin: process.env.NODE_ENV === "production" ? false : "*",
    methods: ["GET", "POST"],
  },
});

app.use(cors());
app.use(express.json());

// Make io accessible in routes
app.set("io", io);

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/players", playerRoutes);
app.use("/api/forge", forgeRoutes);
app.use("/api/duels", duelRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/weapons", weaponRoutes);
app.use("/api/gauntlet", gauntletRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/forge-shield", forgeShieldRoutes);
app.use("/api/seasons", seasonRoutes);
app.use("/api/tournaments", tournamentRoutes);
app.use("/api/quest", questChainRoutes);

// Stripe webhook (raw body required)
app.use(
  "/api/webhooks/stripe",
  express.raw({ type: "application/json" }),
  stripeWebhookRoutes
);

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", game: "BattleForge" });
});

// Socket.io setup
setupSocketHandlers(io);
setupArenaHandlers(io);

const PORT = process.env.SERVER_PORT || 3001;

server.listen(PORT, () => {
  console.log(`⚔️  BattleForge server running on port ${PORT}`);
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  await prisma.$disconnect();
  server.close();
});
