import { Server as SocketServer } from "socket.io";

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

export function emitNotification(
  io: SocketServer,
  playerId: string,
  notification: { type: string; message: string; data?: unknown }
) {
  io.of("/notifications")
    .to(`player:${playerId}`)
    .emit("notification", notification);
}
