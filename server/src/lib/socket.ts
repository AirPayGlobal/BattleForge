import { Server as SocketServer } from "socket.io";
import { prisma } from "./prisma";

export function setupSocketHandlers(io: SocketServer) {
  // Notifications namespace
  const notifications = io.of("/notifications");
  notifications.on("connection", (socket) => {
    const playerId = socket.handshake.auth.playerId;
    if (playerId) {
      socket.join(`player:${playerId}`);
    }

    socket.on("disconnect", () => {
      // cleanup handled automatically
    });
  });

  // Arena namespace (for live duels)
  const arena = io.of("/arena");
  arena.on("connection", (socket) => {
    socket.on("join-duel", (duelId: string) => {
      socket.join(`duel:${duelId}`);
    });

    socket.on("leave-duel", (duelId: string) => {
      socket.leave(`duel:${duelId}`);
    });

    socket.on("disconnect", () => {
      // cleanup handled automatically
    });
  });

  // Forge namespace (for craft events)
  const forge = io.of("/forge");
  forge.on("connection", (socket) => {
    const playerId = socket.handshake.auth.playerId;
    if (playerId) {
      socket.join(`forge:${playerId}`);
    }
  });
}

export function setupMatchmakingHandlers(io: SocketServer) {
  const matchmaking = io.of("/matchmaking");
  const queue: Map<string, { playerId: string; weaponId: string; socketId: string }> = new Map();

  matchmaking.on("connection", (socket) => {
    socket.on("join-queue", async ({ playerId, weaponId }: { playerId: string; weaponId: string }) => {
      // Add to queue
      queue.set(playerId, { playerId, weaponId, socketId: socket.id });
      socket.data.playerId = playerId;
      socket.emit("queue:joined", { position: queue.size });

      // Check if we can match two players
      const entries = Array.from(queue.values());
      if (entries.length >= 2) {
        // Take first two different players
        const [p1, p2] = entries
          .filter((e, i, arr) => arr.findIndex((x) => x.playerId === e.playerId) === i)
          .slice(0, 2);
        if (p1 && p2 && p1.playerId !== p2.playerId) {
          // Remove from queue
          queue.delete(p1.playerId);
          queue.delete(p2.playerId);

          // Create a duel via Prisma
          try {
            const duel = await prisma.duel.create({
              data: {
                challengerId: p1.playerId,
                defenderId: p2.playerId,
                challengerWeaponId: p1.weaponId,
                defenderWeaponId: p2.weaponId,
                status: "IN_PROGRESS",
              },
            });

            // Stake both weapons
            await prisma.weapon.updateMany({
              where: { id: { in: [p1.weaponId, p2.weaponId] } },
              data: { isStaked: true },
            });

            // Notify both players
            matchmaking.to(p1.socketId).emit("match:found", { duelId: duel.id, role: "challenger" });
            matchmaking.to(p2.socketId).emit("match:found", { duelId: duel.id, role: "defender" });
          } catch (e) {
            console.error("Matchmaking duel create error:", e);
          }
        }
      }
    });

    socket.on("leave-queue", () => {
      const playerId = socket.data.playerId;
      if (playerId) queue.delete(playerId);
    });

    socket.on("disconnect", () => {
      const playerId = socket.data.playerId;
      if (playerId) queue.delete(playerId);
    });
  });
}

export function emitNotification(
  io: SocketServer,
  playerId: string,
  notification: { type: string; message: string; data?: unknown }
) {
  io.of("/notifications")
    .to(`player:${playerId}`)
    .emit("notification", notification);
}
