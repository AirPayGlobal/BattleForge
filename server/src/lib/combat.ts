import { Server as SocketServer, Socket } from "socket.io";
import { prisma } from "./prisma";
import { emitNotification } from "./socket";
import { XP_REWARDS } from "./constants";

// ─── Types ───────────────────────────────────────────────────────────────────

type WeaponClass = "BLADE" | "POLEARM" | "RANGED" | "FORGE_ARTIFACT" | "GAUNTLET";
type ActionType = "attack" | "special" | "block";

interface PlayerAction {
  playerId: string;
  action: ActionType;
  submittedAt: number;
}

interface RoundState {
  roundNumber: number;
  actions: Map<string, PlayerAction>;
  timer: NodeJS.Timeout | null;
  started: boolean;
}

interface DuelRoom {
  duelId: string;
  challengerId: string;
  defenderId: string;
  challengerClass: WeaponClass;
  defenderClass: WeaponClass;
  challengerHP: number;
  defenderHP: number;
  challengerReady: boolean;
  defenderReady: boolean;
  currentRound: number;
  roundsWon: { challenger: number; defender: number };
  roundState: RoundState | null;
  roundTimer: NodeJS.Timeout | null;
  completed: boolean;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const MAX_HP = 100;
const ROUND_TIME_LIMIT = 5_000; // 5s for action submission
const ROUND_DURATION = 90_000;  // 90s total per round (UI countdown)
const MAX_ROUNDS = 3;
const WINS_NEEDED = 2;

// Rock-paper-scissors class matchups
const CLASS_ADVANTAGE: Partial<Record<WeaponClass, WeaponClass>> = {
  BLADE: "RANGED",    // Blade beats Ranged
  RANGED: "POLEARM",  // Ranged beats Polearm
  POLEARM: "BLADE",   // Polearm beats Blade
};

// Base damage values
const DAMAGE = {
  attack: { base: 20, advantage: 35, disadvantage: 10 },
  special: { base: 30, advantage: 50, disadvantage: 15 },
  block: { base: 5, advantage: 5, disadvantage: 5 },
};

// In-memory duel rooms (for demo; production would use Redis)
const duelRooms = new Map<string, DuelRoom>();

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getEffectiveClass(
  baseClass: WeaponClass,
  isGauntlet: boolean
): WeaponClass {
  if (!isGauntlet) return baseClass;
  // Gauntlet adapts — pick a random counter class each call
  const classes: WeaponClass[] = ["BLADE", "POLEARM", "RANGED"];
  return classes[Math.floor(Math.random() * classes.length)];
}

function calculateDamage(
  attackerClass: WeaponClass,
  defenderClass: WeaponClass,
  action: ActionType
): number {
  const advantage = CLASS_ADVANTAGE[attackerClass] === defenderClass;
  const disadvantage = CLASS_ADVANTAGE[defenderClass] === attackerClass;

  const dmgTable = DAMAGE[action];
  let dmg = advantage
    ? dmgTable.advantage
    : disadvantage
    ? dmgTable.disadvantage
    : dmgTable.base;

  // Block counters attack (attacker deals less if defender blocks)
  if (action === "block") return 0; // Block deals no damage, handled elsewhere

  // Add jitter ±5
  dmg += Math.floor(Math.random() * 11) - 5;
  return Math.max(1, dmg);
}

function resolveRound(room: DuelRoom): {
  challengerDmg: number;
  defenderDmg: number;
  roundWinner: "challenger" | "defender" | "draw";
  challengerAction: ActionType;
  defenderAction: ActionType;
} {
  const cAction = (room.roundState?.actions.get(room.challengerId)?.action ?? "attack") as ActionType;
  const dAction = (room.roundState?.actions.get(room.defenderId)?.action ?? "attack") as ActionType;

  const cClass = getEffectiveClass(room.challengerClass, room.challengerClass === "GAUNTLET");
  const dClass = getEffectiveClass(room.defenderClass, room.defenderClass === "GAUNTLET");

  let challengerDmg = 0;
  let defenderDmg = 0;

  // Block reduces incoming damage by 60%
  if (cAction === "block") {
    defenderDmg = Math.floor(calculateDamage(dClass, cClass, dAction) * 0.4);
    challengerDmg = 0;
  } else if (dAction === "block") {
    challengerDmg = Math.floor(calculateDamage(cClass, dClass, cAction) * 0.4);
    defenderDmg = 0;
  } else {
    challengerDmg = calculateDamage(cClass, dClass, cAction);
    defenderDmg = calculateDamage(dClass, cClass, dAction);
  }

  // Apply damage
  room.defenderHP = Math.max(0, room.defenderHP - challengerDmg);
  room.challengerHP = Math.max(0, room.challengerHP - defenderDmg);

  const roundWinner =
    challengerDmg > defenderDmg
      ? "challenger"
      : defenderDmg > challengerDmg
      ? "defender"
      : "draw";

  if (roundWinner === "challenger") room.roundsWon.challenger++;
  else if (roundWinner === "defender") room.roundsWon.defender++;

  return { challengerDmg, defenderDmg, roundWinner, challengerAction: cAction, defenderAction: dAction };
}

// ─── Setup ───────────────────────────────────────────────────────────────────

export function setupArenaHandlers(io: SocketServer) {
  const arena = io.of("/arena");

  arena.on("connection", (socket: Socket) => {
    // Join a duel room
    socket.on("join-duel", async ({ duelId, playerId }: { duelId: string; playerId: string }) => {
      socket.join(`duel:${duelId}`);
      socket.data.playerId = playerId;
      socket.data.duelId = duelId;

      // Initialize room if not exists
      if (!duelRooms.has(duelId)) {
        try {
          const duel = await prisma.duel.findUnique({
            where: { id: duelId },
            include: {
              challengerWeapon: true,
              defenderWeapon: true,
            },
          });

          if (!duel || duel.status === "COMPLETED") return;

          duelRooms.set(duelId, {
            duelId,
            challengerId: duel.challengerId,
            defenderId: duel.defenderId,
            challengerClass: duel.challengerWeapon.class as WeaponClass,
            defenderClass: duel.defenderWeapon.class as WeaponClass,
            challengerHP: MAX_HP,
            defenderHP: MAX_HP,
            challengerReady: false,
            defenderReady: false,
            currentRound: 0,
            roundsWon: { challenger: 0, defender: 0 },
            roundState: null,
            roundTimer: null,
            completed: false,
          });
        } catch (e) {
          console.error("Arena join-duel error:", e);
        }
      }

      socket.to(`duel:${duelId}`).emit("player:joined", { playerId });
    });

    // Player signals ready
    socket.on("player:ready", ({ duelId, playerId }: { duelId: string; playerId: string }) => {
      const room = duelRooms.get(duelId);
      if (!room || room.completed) return;

      if (playerId === room.challengerId) room.challengerReady = true;
      if (playerId === room.defenderId) room.defenderReady = true;

      arena.to(`duel:${duelId}`).emit("player:ready", {
        playerId,
        challengerReady: room.challengerReady,
        defenderReady: room.defenderReady,
      });

      // Both ready → start first round
      if (room.challengerReady && room.defenderReady) {
        startRound(io, duelId);
      }
    });

    // Player submits action
    socket.on(
      "player:action",
      ({ duelId, playerId, action }: { duelId: string; playerId: string; action: ActionType }) => {
        const room = duelRooms.get(duelId);
        if (!room || !room.roundState || room.completed) return;

        // Only accept from valid players
        if (playerId !== room.challengerId && playerId !== room.defenderId) return;

        room.roundState.actions.set(playerId, {
          playerId,
          action,
          submittedAt: Date.now(),
        });

        // Acknowledge to this player
        socket.emit("action:confirmed", { action });

        // If both submitted, resolve immediately
        if (
          room.roundState.actions.has(room.challengerId) &&
          room.roundState.actions.has(room.defenderId)
        ) {
          if (room.roundState.timer) {
            clearTimeout(room.roundState.timer);
            room.roundState.timer = null;
          }
          resolveAndBroadcastRound(io, duelId);
        }
      }
    );

    socket.on("disconnect", () => {
      const { duelId, playerId } = socket.data;
      if (duelId && playerId) {
        const room = duelRooms.get(duelId);
        if (room && !room.completed) {
          // Notify other player of disconnect
          socket.to(`duel:${duelId}`).emit("player:disconnected", { playerId });
        }
      }
    });
  });
}

// ─── Round Management ─────────────────────────────────────────────────────────

function startRound(io: SocketServer, duelId: string) {
  const room = duelRooms.get(duelId);
  if (!room || room.completed) return;

  room.currentRound++;
  room.roundState = {
    roundNumber: room.currentRound,
    actions: new Map(),
    timer: null,
    started: true,
  };

  io.of("/arena").to(`duel:${duelId}`).emit("round:start", {
    round: room.currentRound,
    challengerHP: room.challengerHP,
    defenderHP: room.defenderHP,
    timeLimit: ROUND_TIME_LIMIT,
  });

  // Auto-resolve after 5s if actions not submitted
  room.roundState.timer = setTimeout(() => {
    resolveAndBroadcastRound(io, duelId);
  }, ROUND_TIME_LIMIT);
}

function resolveAndBroadcastRound(io: SocketServer, duelId: string) {
  const room = duelRooms.get(duelId);
  if (!room || room.completed || !room.roundState) return;

  // Default unsubmitted actions to "attack"
  if (!room.roundState.actions.has(room.challengerId)) {
    room.roundState.actions.set(room.challengerId, {
      playerId: room.challengerId,
      action: "attack",
      submittedAt: Date.now(),
    });
  }
  if (!room.roundState.actions.has(room.defenderId)) {
    room.roundState.actions.set(room.defenderId, {
      playerId: room.defenderId,
      action: "attack",
      submittedAt: Date.now(),
    });
  }

  const { challengerDmg, defenderDmg, roundWinner, challengerAction, defenderAction } =
    resolveRound(room);

  io.of("/arena").to(`duel:${duelId}`).emit("round:end", {
    round: room.currentRound,
    challengerAction,
    defenderAction,
    challengerDmg,
    defenderDmg,
    roundWinner,
    challengerHP: room.challengerHP,
    defenderHP: room.defenderHP,
    roundsWon: room.roundsWon,
  });

  // Check match over
  const matchOver =
    room.roundsWon.challenger >= WINS_NEEDED ||
    room.roundsWon.defender >= WINS_NEEDED ||
    room.currentRound >= MAX_ROUNDS;

  if (matchOver) {
    endMatch(io, duelId);
  } else {
    // Start next round after 3s delay
    room.roundTimer = setTimeout(() => startRound(io, duelId), 3000);
  }
}

async function endMatch(io: SocketServer, duelId: string) {
  const room = duelRooms.get(duelId);
  if (!room || room.completed) return;
  room.completed = true;

  const winnerId =
    room.roundsWon.challenger >= room.roundsWon.defender
      ? room.challengerId
      : room.defenderId;
  const loserId = winnerId === room.challengerId ? room.defenderId : room.challengerId;

  io.of("/arena").to(`duel:${duelId}`).emit("match:end", {
    winnerId,
    loserId,
    roundsWon: room.roundsWon,
    finalHP: {
      challenger: room.challengerHP,
      defender: room.defenderHP,
    },
  });

  // Persist result to DB
  try {
    const duel = await prisma.duel.findUnique({
      where: { id: duelId },
      include: { challengerWeapon: true, defenderWeapon: true },
    });
    if (!duel || duel.status === "COMPLETED") return;

    const loserWeaponId = winnerId === duel.challengerId ? duel.defenderWeaponId : duel.challengerWeaponId;
    const winnerWeaponId = winnerId === duel.challengerId ? duel.challengerWeaponId : duel.defenderWeaponId;
    const loserWeapon = winnerId === duel.challengerId ? duel.defenderWeapon : duel.challengerWeapon;

    const shieldActive =
      loserWeapon.forgeShield &&
      loserWeapon.forgeShieldExp &&
      loserWeapon.forgeShieldExp > new Date();

    const rounds = [
      { challenger: room.roundsWon.challenger, defender: room.roundsWon.defender },
    ];

    await prisma.$transaction([
      prisma.duel.update({
        where: { id: duelId },
        data: {
          status: "COMPLETED",
          winnerId,
          rounds,
          completedAt: new Date(),
        },
      }),
      shieldActive
        ? prisma.weapon.update({ where: { id: loserWeaponId }, data: { isStaked: false, losses: { increment: 1 } } })
        : prisma.weapon.update({ where: { id: loserWeaponId }, data: { ownerId: winnerId, isStaked: false, losses: { increment: 1 } } }),
      prisma.weapon.update({ where: { id: winnerWeaponId }, data: { isStaked: false, wins: { increment: 1 } } }),
      prisma.player.update({ where: { id: winnerId }, data: { wins: { increment: 1 }, xp: { increment: XP_REWARDS.DUEL_WIN }, winStreak: { increment: 1 } } }),
      prisma.player.update({ where: { id: loserId }, data: { losses: { increment: 1 }, winStreak: 0 } }),
      prisma.transaction.create({ data: { type: "DUEL_WIN", xpAmount: XP_REWARDS.DUEL_WIN, playerId: winnerId } }),
    ]);

    // Notifications
    await Promise.all([
      prisma.notification.create({
        data: {
          type: "DUEL_WON",
          message: `Victory! +${XP_REWARDS.DUEL_WIN} XP${shieldActive ? "" : " — opponent's weapon claimed!"}`,
          playerId: winnerId,
          data: { duelId },
        },
      }),
      prisma.notification.create({
        data: {
          type: "DUEL_LOST",
          message: shieldActive ? "Defeated — Forge Shield saved your weapon!" : "Defeated — your weapon was claimed.",
          playerId: loserId,
          data: { duelId },
        },
      }),
    ]);
  } catch (e) {
    console.error("endMatch DB error:", e);
  }

  duelRooms.delete(duelId);
}
