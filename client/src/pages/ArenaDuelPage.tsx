import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { io, Socket } from "socket.io-client";
import toast from "react-hot-toast";
import { useAuth } from "../contexts/AuthContext";
import api from "../lib/api";
import { Duel, RANK_COLORS, CLASS_ICONS } from "../lib/types";
import FighterSprite from "../components/FighterSprite";
import ControlsLegend from "../components/ControlsLegend";
import { useFightControls } from "../hooks/useFightControls";
import type { Move } from "../hooks/useFightControls";

type Action = "attack" | "special" | "block";

function moveToServerAction(move: Move): Action {
  if (move === "weapon-strike") return "special";
  if (move === "jump" || move === "block") return "block";
  return "attack";
}

const MOVE_COLORS: Record<Move, string> = {
  punch: "#FF3D6B",
  kick: "#FF6B35",
  "weapon-strike": "#7B2FFF",
  jump: "#00BFFF",
  slide: "#FF9500",
  block: "#00BFFF",
};

const MOVE_LABELS: Record<Move, string> = {
  punch: "⚡ PUNCH",
  kick: "🦵 KICK",
  "weapon-strike": "⚔ STRIKE",
  jump: "↑ JUMP",
  slide: "↓ SLIDE",
  block: "🛡 BLOCK",
};

const MOVE_KEYS: Record<Move, string> = {
  punch: "A",
  kick: "S",
  "weapon-strike": "D",
  jump: "W",
  slide: "X",
  block: "SPC",
};

const MOVE_GRID: Move[][] = [
  ["punch", "kick", "weapon-strike"],
  ["jump", "slide", "block"],
];

interface RoundResult {
  round: number;
  challengerAction: Action;
  defenderAction: Action;
  challengerDmg: number;
  defenderDmg: number;
  roundWinner: "challenger" | "defender" | "draw";
  challengerHP: number;
  defenderHP: number;
  roundsWon: { challenger: number; defender: number };
}

interface MatchResult {
  winnerId: string;
  loserId: string;
  roundsWon: { challenger: number; defender: number };
  finalHP: { challenger: number; defender: number };
}

// Keep for round-result display labels
const ACTION_LABELS: Record<Action, string> = {
  attack: "⚔ Attack",
  special: "✨ Special",
  block: "🛡 Block",
};

const ACTION_COLORS: Record<Action, string> = {
  attack: "#FF3D6B",
  special: "#7B2FFF",
  block: "#00BFFF",
};

const HP_COLOR = (hp: number) =>
  hp > 60 ? "#00FF9D" : hp > 30 ? "#FFD600" : "#FF3D6B";

export default function ArenaDuelPage() {
  const { id: duelId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { player, refreshPlayer } = useAuth();
  const socketRef = useRef<Socket | null>(null);

  const [duel, setDuel] = useState<Duel | null>(null);
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState<"lobby" | "ready" | "fighting" | "round-result" | "match-end">("lobby");
  const [ready, setReady] = useState(false);
  const [opponentReady, setOpponentReady] = useState(false);
  const [round, setRound] = useState(0);
  const [challengerHP, setChallengerHP] = useState(100);
  const [defenderHP, setDefenderHP] = useState(100);
  const [roundsWon, setRoundsWon] = useState({ challenger: 0, defender: 0 });
  const [selectedAction, setSelectedAction] = useState<Action | null>(null);
  const [selectedMove, setSelectedMove] = useState<Move | null>(null);
  const [highlightedMove, setHighlightedMove] = useState<Move | null>(null);
  const [actionConfirmed, setActionConfirmed] = useState(false);
  const [timeLeft, setTimeLeft] = useState(5);
  const [lastRound, setLastRound] = useState<RoundResult | null>(null);
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isChallenger = duel?.challengerId === player?.id;
  const myHP = isChallenger ? challengerHP : defenderHP;
  const oppHP = isChallenger ? defenderHP : challengerHP;
  const opponentName = isChallenger ? duel?.defender?.username : duel?.challenger?.username;
  const myWeapon = isChallenger ? duel?.challengerWeapon : duel?.defenderWeapon;
  const oppWeapon = isChallenger ? duel?.defenderWeapon : duel?.challengerWeapon;
  const playerCharacter = player?.character?.name ?? "Ironclad";
  const opponentCharacter = "Shadowblade";

  // Load duel info
  useEffect(() => {
    if (!duelId) return;
    api.get("/duels/history").then(({ data }) => {
      const found = data.find((d: Duel) => d.id === duelId);
      if (found) setDuel(found);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [duelId]);

  // Socket.io arena connection
  useEffect(() => {
    if (!player || !duelId) return;

    const socket = io("/arena", {
      auth: { playerId: player.id },
      transports: ["websocket", "polling"],
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("join-duel", { duelId, playerId: player.id });
    });

    socket.on("player:joined", ({ playerId }: { playerId: string }) => {
      if (playerId !== player.id) setPhase("ready");
    });

    socket.on("player:ready", ({ challengerReady, defenderReady }: { playerId: string; challengerReady: boolean; defenderReady: boolean }) => {
      if (isChallenger) setOpponentReady(defenderReady);
      else setOpponentReady(challengerReady);
    });

    socket.on("round:start", ({ round: r, challengerHP: cHP, defenderHP: dHP, timeLimit }: any) => {
      setRound(r);
      setChallengerHP(cHP);
      setDefenderHP(dHP);
      setPhase("fighting");
      setSelectedAction(null);
      setSelectedMove(null);
      setHighlightedMove(null);
      setActionConfirmed(false);
      setLastRound(null);

      const secs = Math.ceil(timeLimit / 1000);
      setTimeLeft(secs);
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setTimeLeft((t) => {
          if (t <= 1) {
            clearInterval(timerRef.current!);
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    });

    socket.on("action:confirmed", () => setActionConfirmed(true));

    socket.on("round:end", (data: RoundResult) => {
      if (timerRef.current) clearInterval(timerRef.current);
      setChallengerHP(data.challengerHP);
      setDefenderHP(data.defenderHP);
      setRoundsWon(data.roundsWon);
      setLastRound(data);
      setPhase("round-result");
    });

    socket.on("match:end", (data: MatchResult) => {
      setMatchResult(data);
      setPhase("match-end");
      refreshPlayer();
    });

    socket.on("player:disconnected", ({ playerId }: { playerId: string }) => {
      if (playerId !== player.id) {
        toast.error("Opponent disconnected");
      }
    });

    setPhase("ready");

    return () => {
      socket.disconnect();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [player, duelId, isChallenger]);

  const handleReady = () => {
    setReady(true);
    socketRef.current?.emit("player:ready", { duelId, playerId: player?.id });
  };

  const handleAction = (action: Action) => {
    if (actionConfirmed || phase !== "fighting") return;
    setSelectedAction(action);
    socketRef.current?.emit("player:action", { duelId, playerId: player?.id, action });
  };

  const handleMove = (move: Move) => {
    if (actionConfirmed || phase !== "fighting") return;
    setSelectedMove(move);
    handleAction(moveToServerAction(move));
  };

  // Controls hook — keyboard + gamepad
  const { isGamepadConnected, gamepadName, highlightedMove: controllerHighlight } = useFightControls(
    phase === "fighting" && !actionConfirmed,
    (move) => {
      if (phase === "fighting" && !actionConfirmed) handleMove(move);
    }
  );

  // Sync highlighted move from controller
  useEffect(() => {
    setHighlightedMove(controllerHighlight);
  }, [controllerHighlight]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-arc-cyan border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ─── Match End ────────────────────────────────────────────────────────────
  if (phase === "match-end" && matchResult) {
    const won = matchResult.winnerId === player?.id;
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-lg mx-auto space-y-6 text-center"
      >
        <div className={`card border-2 py-10 ${won ? "border-victory-green" : "border-danger-red"}`}>
          <div className="flex items-end justify-center gap-6 mb-6">
            <FighterSprite
              character={playerCharacter}
              side="left"
              action={won ? "victory" : "defeat"}
              size={140}
            />
            <FighterSprite
              character={opponentCharacter}
              side="right"
              action={won ? "defeat" : "victory"}
              size={140}
            />
          </div>
          <motion.h1
            initial={{ y: -20 }}
            animate={{ y: 0 }}
            className={`font-display text-6xl ${won ? "text-victory-green" : "text-danger-red"}`}
          >
            {won ? "VICTORY" : "DEFEAT"}
          </motion.h1>
          <p className="text-secondary-text font-ui mt-3 text-sm">
            {won
              ? "Your weapon prevails. The forge grows stronger."
              : "The forge is not done with you. Return."}
          </p>
        </div>

        <div className="card">
          <div className="flex justify-center gap-8 py-4">
            <div className="text-center">
              <span className="font-display text-3xl text-victory-green">{matchResult.roundsWon.challenger}</span>
              <p className="text-xs text-secondary-text font-ui mt-1">CHALLENGER ROUNDS</p>
            </div>
            <div className="font-display text-2xl text-storm-gold self-center">VS</div>
            <div className="text-center">
              <span className="font-display text-3xl text-danger-red">{matchResult.roundsWon.defender}</span>
              <p className="text-xs text-secondary-text font-ui mt-1">DEFENDER ROUNDS</p>
            </div>
          </div>
        </div>

        <button onClick={() => navigate("/arena")} className="btn-primary w-full">
          Return to Arena
        </button>
      </motion.div>
    );
  }

  // ─── Arena Layout ─────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto space-y-4 relative">
      {/* Controls legend */}
      <ControlsLegend visible={phase === "fighting"} mode={isGamepadConnected ? "gamepad" : "keyboard"} />

      {/* Round indicator */}
      <div className="flex items-center justify-center gap-3">
        {[1, 2, 3].map((r) => (
          <div
            key={r}
            className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-display text-sm transition-all ${
              r < round
                ? "border-void-purple bg-void-purple/30 text-void-purple"
                : r === round
                ? "border-arc-cyan bg-arc-cyan/20 text-arc-cyan"
                : "border-card-border text-secondary-text"
            }`}
          >
            {r}
          </div>
        ))}
      </div>

      {/* Fighter sprites */}
      <div className="flex items-end justify-center gap-4 py-2">
        <FighterSprite
          character={playerCharacter}
          side="left"
          action={phase === "fighting" ? (selectedMove ?? highlightedMove ?? "idle") : "idle"}
          size={160}
        />
        <div className="font-display text-2xl pb-8" style={{ color: "rgba(255,255,255,0.3)" }}>VS</div>
        <FighterSprite
          character={opponentCharacter}
          side="right"
          action="idle"
          size={160}
        />
      </div>

      {/* Fighter cards */}
      <div className="grid grid-cols-2 gap-4">
        {/* Player side */}
        <div className="card">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">{myWeapon ? CLASS_ICONS[myWeapon.class] : "⚔"}</span>
            <div>
              <p className="font-display text-sm text-arc-cyan">{player?.username}</p>
              <p className="text-xs text-secondary-text font-ui">{myWeapon?.name}</p>
            </div>
          </div>
          <div className="h-3 bg-deep-navy rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full transition-all duration-500"
              animate={{ width: `${myHP}%`, backgroundColor: HP_COLOR(myHP) }}
            />
          </div>
          <p className="text-right text-xs font-ui mt-1" style={{ color: HP_COLOR(myHP) }}>
            {myHP} HP
          </p>
          <div className="flex gap-1 mt-2">
            {[...Array(isChallenger ? roundsWon.challenger : roundsWon.defender)].map((_, i) => (
              <div key={i} className="w-4 h-4 bg-victory-green rounded-full" />
            ))}
          </div>
        </div>

        {/* Opponent side */}
        <div className="card text-right">
          <div className="flex items-center gap-2 mb-3 justify-end">
            <div>
              <p className="font-display text-sm text-danger-red">{opponentName ?? "Opponent"}</p>
              <p className="text-xs text-secondary-text font-ui">{oppWeapon?.name}</p>
            </div>
            <span className="text-xl">{oppWeapon ? CLASS_ICONS[oppWeapon.class] : "⚔"}</span>
          </div>
          <div className="h-3 bg-deep-navy rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full transition-all duration-500 ml-auto"
              animate={{ width: `${oppHP}%`, backgroundColor: HP_COLOR(oppHP) }}
            />
          </div>
          <p className="text-left text-xs font-ui mt-1" style={{ color: HP_COLOR(oppHP) }}>
            {oppHP} HP
          </p>
          <div className="flex gap-1 mt-2 justify-end">
            {[...Array(isChallenger ? roundsWon.defender : roundsWon.challenger)].map((_, i) => (
              <div key={i} className="w-4 h-4 bg-danger-red rounded-full" />
            ))}
          </div>
        </div>
      </div>

      {/* Phase content */}
      <AnimatePresence mode="wait">
        {phase === "ready" && (
          <motion.div key="ready" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="card text-center py-8">
            <h2 className="font-display text-2xl text-primary-text mb-2">PREPARE FOR BATTLE</h2>
            <p className="text-secondary-text font-ui text-sm mb-6">
              {ready ? "Waiting for opponent..." : `Opponent ${opponentReady ? "is ready" : "is preparing"}...`}
            </p>
            <button onClick={handleReady} disabled={ready} className="btn-primary">
              {ready ? "Waiting..." : "READY"}
            </button>
          </motion.div>
        )}

        {phase === "fighting" && (
          <motion.div key="fighting" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
            {/* Timer ring */}
            <div className="flex justify-center">
              <div className={`w-16 h-16 rounded-full border-4 flex items-center justify-center font-display text-2xl ${
                timeLeft <= 2 ? "border-danger-red text-danger-red" : "border-arc-cyan text-arc-cyan"
              }`}>
                {timeLeft}
              </div>
            </div>

            {/* Gamepad indicator */}
            {isGamepadConnected && (
              <div className="text-center">
                <span className="font-ui text-xs text-arc-cyan opacity-70">
                  🎮 {gamepadName || "Controller"} connected
                </span>
              </div>
            )}

            {actionConfirmed ? (
              <div className="card text-center py-6">
                <p className="font-display text-xl text-victory-green">ACTION LOCKED IN</p>
                <p className="text-secondary-text font-ui text-sm mt-1">Waiting for opponent...</p>
                {selectedMove && (
                  <div
                    className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-lg"
                    style={{
                      backgroundColor: `${MOVE_COLORS[selectedMove]}20`,
                      color: MOVE_COLORS[selectedMove],
                    }}
                  >
                    <span className="font-ui font-bold">{MOVE_LABELS[selectedMove]}</span>
                    {selectedAction && (
                      <span className="text-xs opacity-60">{ACTION_LABELS[selectedAction]}</span>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="card space-y-2">
                <p className="font-ui text-xs uppercase tracking-wider text-secondary-text text-center">Choose Your Move</p>
                {MOVE_GRID.map((row, rowIdx) => (
                  <div key={rowIdx} className="grid grid-cols-3 gap-2">
                    {row.map((move) => {
                      const isHighlighted = highlightedMove === move;
                      const color = MOVE_COLORS[move];
                      return (
                        <button
                          key={move}
                          onClick={() => handleMove(move)}
                          className="py-3 rounded-xl font-ui font-bold uppercase tracking-wider text-xs relative overflow-hidden transition-all"
                          style={{
                            background: isHighlighted ? `${color}28` : `${color}0f`,
                            border: isHighlighted
                              ? `2px solid ${color}`
                              : `2px solid ${color}40`,
                            color,
                            boxShadow: isHighlighted ? `0 0 14px ${color}40` : "none",
                            transition: "all 0.1s ease",
                          }}
                        >
                          {/* Key badge */}
                          <span
                            className="absolute top-1 right-1 text-[9px] font-mono px-1 rounded"
                            style={{
                              background: "rgba(255,255,255,0.07)",
                              color: "rgba(255,255,255,0.3)",
                              border: "1px solid rgba(255,255,255,0.1)",
                            }}
                          >
                            {MOVE_KEYS[move]}
                          </span>
                          {MOVE_LABELS[move]}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {phase === "round-result" && lastRound && (
          <motion.div key="round-result" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="card text-center py-6 space-y-3">
            <h3 className={`font-display text-3xl ${
              (lastRound.roundWinner === "challenger") === isChallenger
                ? "text-victory-green"
                : lastRound.roundWinner === "draw"
                ? "text-storm-gold"
                : "text-danger-red"
            }`}>
              {lastRound.roundWinner === "draw"
                ? "DRAW"
                : (lastRound.roundWinner === "challenger") === isChallenger
                ? "ROUND WON"
                : "ROUND LOST"}
            </h3>

            <div className="grid grid-cols-2 gap-4 text-sm font-ui">
              <div>
                <p className="text-secondary-text">Your action</p>
                <p className="text-primary-text font-bold">{ACTION_LABELS[isChallenger ? lastRound.challengerAction : lastRound.defenderAction]}</p>
                <p className="text-danger-red font-bold">-{isChallenger ? lastRound.defenderDmg : lastRound.challengerDmg} HP received</p>
              </div>
              <div>
                <p className="text-secondary-text">Opponent action</p>
                <p className="text-primary-text font-bold">{ACTION_LABELS[isChallenger ? lastRound.defenderAction : lastRound.challengerAction]}</p>
                <p className="text-victory-green font-bold">-{isChallenger ? lastRound.challengerDmg : lastRound.defenderDmg} HP dealt</p>
              </div>
            </div>

            <p className="text-xs text-secondary-text font-ui">Next round starting soon...</p>
          </motion.div>
        )}

        {phase === "lobby" && (
          <motion.div key="lobby" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card text-center py-8">
            <div className="w-6 h-6 border-2 border-arc-cyan border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-secondary-text font-ui text-sm">Waiting for opponent to join...</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
