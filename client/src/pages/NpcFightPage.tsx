import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { useAuth } from "../contexts/AuthContext";
import api from "../lib/api";
import FighterSprite from "../components/FighterSprite";
import Arena3D from "../components/Arena3D";
import ControlsLegend from "../components/ControlsLegend";
import { useFightControls } from "../hooks/useFightControls";
import type { Move } from "../hooks/useFightControls";
import { useScreenEffects } from "../hooks/useScreenEffects";
import { detectCombo } from "../lib/combos";
import type { Combo } from "../lib/combos";
import { GameAudio } from "../lib/gameAudio";
import { COMBOS } from "../lib/combos";

type ServerAction = "attack" | "special" | "block";
type FightPhase =
  | "vs-intro"
  | "round-start"
  | "fighting"
  | "round-result"
  | "match-end";

function moveToServerAction(move: Move): ServerAction {
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

const HP_COLOR = (hp: number) =>
  hp > 60 ? "#00FF9D" : hp > 30 ? "#FFD600" : "#FF3D6B";

interface SimRound {
  round: number;
  playerWins: boolean;
  playerDmgTaken: number;
  npcDmgTaken: number;
  action: ServerAction;
}

function simulateRounds(result: "WIN" | "LOSS"): SimRound[] {
  const rand = (min: number, max: number) =>
    Math.floor(Math.random() * (max - min + 1)) + min;
  const actions: ServerAction[] = ["attack", "special", "block"];

  const twoZero = Math.random() < 0.5;
  const rounds: SimRound[] = [];

  if (result === "WIN") {
    if (twoZero) {
      rounds.push(
        { round: 1, playerWins: true, playerDmgTaken: rand(5, 15), npcDmgTaken: rand(30, 50), action: actions[rand(0, 2)] },
        { round: 2, playerWins: true, playerDmgTaken: rand(5, 15), npcDmgTaken: rand(30, 50), action: actions[rand(0, 2)] }
      );
    } else {
      rounds.push(
        { round: 1, playerWins: false, playerDmgTaken: rand(30, 50), npcDmgTaken: rand(5, 15), action: actions[rand(0, 2)] },
        { round: 2, playerWins: true, playerDmgTaken: rand(5, 15), npcDmgTaken: rand(30, 50), action: actions[rand(0, 2)] },
        { round: 3, playerWins: true, playerDmgTaken: rand(5, 15), npcDmgTaken: rand(30, 50), action: actions[rand(0, 2)] }
      );
    }
  } else {
    if (twoZero) {
      rounds.push(
        { round: 1, playerWins: false, playerDmgTaken: rand(30, 50), npcDmgTaken: rand(5, 15), action: actions[rand(0, 2)] },
        { round: 2, playerWins: false, playerDmgTaken: rand(30, 50), npcDmgTaken: rand(5, 15), action: actions[rand(0, 2)] }
      );
    } else {
      rounds.push(
        { round: 1, playerWins: true, playerDmgTaken: rand(5, 15), npcDmgTaken: rand(30, 50), action: actions[rand(0, 2)] },
        { round: 2, playerWins: false, playerDmgTaken: rand(30, 50), npcDmgTaken: rand(5, 15), action: actions[rand(0, 2)] },
        { round: 3, playerWins: false, playerDmgTaken: rand(30, 50), npcDmgTaken: rand(5, 15), action: actions[rand(0, 2)] }
      );
    }
  }

  return rounds;
}

const MOVE_GRID: Move[][] = [
  ["punch", "kick", "weapon-strike"],
  ["jump", "slide", "block"],
];

interface Particle { id: number; x: number; y: number; color: string; }

export default function NpcFightPage() {
  const { npcId } = useParams<{ npcId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { player, refreshPlayer } = useAuth();

  const locationState = location.state as { weaponId?: string; npcName?: string; npcCharacter?: string } | null;
  const weaponId = locationState?.weaponId ?? "";
  const npcName = locationState?.npcName ?? "UNKNOWN";
  const npcCharacter = locationState?.npcCharacter ?? "Ironclad";
  const playerCharacter = player?.character?.name ?? "Ironclad";

  const [phase, setPhase] = useState<FightPhase>("vs-intro");
  const [currentRound, setCurrentRound] = useState(0);
  const [playerHP, setPlayerHP] = useState(100);
  const [npcHP, setNpcHP] = useState(100);
  const [playerRoundsWon, setPlayerRoundsWon] = useState(0);
  const [npcRoundsWon, setNpcRoundsWon] = useState(0);
  const [timeLeft, setTimeLeft] = useState(5);
  const [selectedMove, setSelectedMove] = useState<Move | null>(null);
  const [highlightedMove, setHighlightedMove] = useState<Move | null>(null);
  const [shakePlayer, setShakePlayer] = useState(false);
  const [shakeNpc, setShakeNpc] = useState(false);
  const [floatingDmg, setFloatingDmg] = useState<{ player?: number; npc?: number } | null>(null);
  const [lastRoundResult, setLastRoundResult] = useState<"WIN" | "LOSS" | null>(null);
  const [matchResult, setMatchResult] = useState<{ result: "WIN" | "LOSS"; xpEarned: number } | null>(null);
  const [battleError, setBattleError] = useState<string | null>(null);

  // Combo state
  const [moveHistory, setMoveHistory] = useState<Move[]>([]);
  const [activeCombo, setActiveCombo] = useState<Combo | null>(null);

  // Particles state
  const [playerParticles, setPlayerParticles] = useState<Particle[]>([]);
  const [npcParticles, setNpcParticles] = useState<Particle[]>([]);

  // Combo hint panel
  const [showComboHint, setShowComboHint] = useState(false);

  // Screen effects
  const { isShaking, isFlashing, flashColor, triggerShake, triggerFlash } = useScreenEffects();

  const simRoundsRef = useRef<SimRound[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const battleFired = useRef(false);

  const spawnParticles = useCallback((side: "player" | "npc", color: string) => {
    const newParticles = Array.from({ length: 8 }, (_, i) => ({
      id: Date.now() + i,
      x: (Math.random() - 0.5) * 80,
      y: (Math.random() - 0.5) * 80,
      color,
    }));
    if (side === "player") {
      setPlayerParticles(newParticles);
      setTimeout(() => setPlayerParticles([]), 600);
    } else {
      setNpcParticles(newParticles);
      setTimeout(() => setNpcParticles([]), 600);
    }
  }, []);

  // Fire battle API on mount
  useEffect(() => {
    if (!npcId || battleFired.current) return;
    battleFired.current = true;

    const body = weaponId ? { weaponId } : {};
    api
      .post(`/npcs/${npcId}/battle`, body)
      .then(({ data }) => {
        simRoundsRef.current = simulateRounds(data.result);
        setMatchResult({ result: data.result, xpEarned: data.xpEarned ?? 0 });
        if (data.result === "WIN") refreshPlayer();
      })
      .catch((err) => {
        setBattleError(err.response?.data?.error || "Battle failed. Please try again.");
      });
  }, [npcId, weaponId]);

  // VS Intro → Round 1 after 2.2s
  useEffect(() => {
    if (phase !== "vs-intro") return;
    const t = setTimeout(() => {
      setCurrentRound(1);
      setPhase("round-start");
    }, 2200);
    return () => clearTimeout(t);
  }, [phase]);

  // Round start announcement → fighting after 1.5s
  useEffect(() => {
    if (phase !== "round-start") return;
    GameAudio.roundStart();
    const t = setTimeout(() => {
      setPhase("fighting");
      setTimeLeft(5);
      setSelectedMove(null);
      setHighlightedMove(null);
    }, 1500);
    return () => clearTimeout(t);
  }, [phase]);

  const resolveCurrentRound = useCallback(
    (serverAction: ServerAction, move: Move) => {
      if (timerRef.current) clearInterval(timerRef.current);

      const simRound = simRoundsRef.current[currentRound - 1];
      if (!simRound) return;

      setShakePlayer(!simRound.playerWins);
      setShakeNpc(simRound.playerWins);
      setFloatingDmg({
        player: simRound.playerWins ? undefined : simRound.playerDmgTaken,
        npc: simRound.playerWins ? simRound.npcDmgTaken : undefined,
      });

      // Check combo
      setMoveHistory((prev) => {
        const newHistory = [...prev, move].slice(-10);

        const combo = detectCombo(newHistory);
        if (combo && simRound.playerWins) {
          setActiveCombo(combo);
          GameAudio.combo();
          triggerShake("heavy");
          triggerFlash(combo.color);

          // Apply combo multiplier to NPC damage
          const bonusDmg = Math.round(simRound.npcDmgTaken * (combo.damageMultiplier - 1));
          setNpcHP((hp) => Math.max(0, hp - bonusDmg));

          setTimeout(() => setActiveCombo(null), 1500);
        }

        return newHistory;
      });

      setTimeout(() => {
        setShakePlayer(false);
        setShakeNpc(false);
        setFloatingDmg(null);

        GameAudio.hit();

        if (simRound.playerWins) {
          triggerShake("light");
          triggerFlash("#FF9500");
          spawnParticles("npc", "#FF9500");
        } else {
          triggerShake("light");
          triggerFlash("#FF3D6B");
          spawnParticles("player", "#FF3D6B");
        }

        setPlayerHP((hp) => Math.max(0, hp - simRound.playerDmgTaken));
        setNpcHP((hp) => Math.max(0, hp - simRound.npcDmgTaken));

        if (simRound.playerWins) setPlayerRoundsWon((w) => w + 1);
        else setNpcRoundsWon((w) => w + 1);

        setLastRoundResult(simRound.playerWins ? "WIN" : "LOSS");
        setPhase("round-result");
      }, 700);
    },
    [currentRound, triggerShake, triggerFlash, spawnParticles]
  );

  const handleMove = useCallback(
    (move: Move) => {
      if (phase !== "fighting" || selectedMove) return;
      setSelectedMove(move);

      // Play move sound
      if (move === "punch") GameAudio.punch();
      else if (move === "kick") GameAudio.kick();
      else if (move === "weapon-strike") GameAudio.weaponStrike();
      else if (move === "block" || move === "jump") GameAudio.block();

      resolveCurrentRound(moveToServerAction(move), move);
    },
    [phase, selectedMove, resolveCurrentRound]
  );

  // Controls hook — keyboard + gamepad
  const { isGamepadConnected, gamepadName, highlightedMove: controllerHighlight } = useFightControls(
    phase === "fighting" && !selectedMove,
    (move) => {
      if (phase === "fighting" && !selectedMove) handleMove(move);
    }
  );

  // Sync highlighted move from controller
  useEffect(() => {
    setHighlightedMove(controllerHighlight);
  }, [controllerHighlight]);

  // Countdown timer during fighting
  useEffect(() => {
    if (phase !== "fighting") return;
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
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase]);

  // When timer hits 0, auto-resolve
  useEffect(() => {
    if (phase !== "fighting" || timeLeft > 0) return;
    handleMove(selectedMove ?? "punch");
  }, [timeLeft, phase]);

  // After round-result, either go next round or end match
  useEffect(() => {
    if (phase !== "round-result") return;
    const nextRound = currentRound + 1;
    const totalRounds = simRoundsRef.current.length;

    const t = setTimeout(() => {
      if (nextRound > totalRounds) {
        setPhase("match-end");
      } else {
        setCurrentRound(nextRound);
        setPhase("round-start");
      }
    }, 2200);
    return () => clearTimeout(t);
  }, [phase, currentRound]);

  // Play victory/defeat sound on match end
  useEffect(() => {
    if (phase !== "match-end" || !matchResult) return;
    if (matchResult.result === "WIN") {
      GameAudio.victory();
      triggerFlash("#00FF9D");
    } else {
      GameAudio.defeat();
      triggerFlash("#FF3D6B");
    }
  }, [phase, matchResult]);

  // ─── Error ─────────────────────────────────────────────────────────────────
  if (battleError) {
    return (
      <div
        className="fixed inset-0 flex flex-col items-center justify-center gap-6"
        style={{ background: "radial-gradient(ellipse at center, #1a0a0a 0%, #000 100%)" }}
      >
        <p className="font-display text-2xl text-danger-red tracking-widest">BATTLE ERROR</p>
        <p className="font-ui text-secondary-text text-center max-w-sm px-4">{battleError}</p>
        <button
          onClick={() => navigate(-1)}
          className="font-ui text-sm uppercase tracking-widest px-6 py-3 rounded-xl border border-arc-cyan text-arc-cyan hover:bg-arc-cyan/10 transition-colors"
        >
          ← Go Back
        </button>
      </div>
    );
  }

  // ─── VS Intro ──────────────────────────────────────────────────────────────
  if (phase === "vs-intro") {
    return (
      <div
        className="fixed inset-0 flex items-center justify-center"
        style={{ background: "radial-gradient(ellipse at center, #1a0a0a 0%, #0a0005 60%, #000 100%)" }}
      >
        <div className="flex items-center gap-8 sm:gap-16 w-full max-w-2xl px-8">
          <motion.div
            initial={{ opacity: 0, x: -80 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="flex-1 flex flex-col items-center"
          >
            <FighterSprite character={playerCharacter} side="left" action="idle" size={180} />
            <p
              className="font-display text-2xl tracking-widest uppercase mt-4"
              style={{ color: "#00FFFF", textShadow: "0 0 20px rgba(0,255,255,0.6)" }}
            >
              {player?.username ?? "YOU"}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            <motion.p
              animate={{
                textShadow: [
                  "0 0 20px #FF3D6B, 0 0 60px #FF3D6B80",
                  "0 0 40px #FF3D6B, 0 0 100px #FF3D6BB0",
                  "0 0 20px #FF3D6B, 0 0 60px #FF3D6B80",
                ],
              }}
              transition={{ duration: 0.8, repeat: Infinity }}
              className="font-display text-6xl sm:text-7xl"
              style={{ color: "#FF3D6B" }}
            >
              VS
            </motion.p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 80 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="flex-1 flex flex-col items-center"
          >
            <FighterSprite character={npcCharacter} side="right" action="idle" size={180} />
            <p
              className="font-display text-2xl tracking-widest uppercase mt-4"
              style={{ color: "#FF3D6B", textShadow: "0 0 20px rgba(255,61,107,0.6)" }}
            >
              {npcName}
            </p>
          </motion.div>
        </div>
      </div>
    );
  }

  // ─── Match End ──────────────────────────────────────────────────────────────
  if (phase === "match-end" && matchResult) {
    const won = matchResult.result === "WIN";
    return (
      <div
        className="fixed inset-0 flex items-center justify-center p-6"
        style={{
          background: "radial-gradient(ellipse at center, #1a0a0a 0%, #0a0005 60%, #000 100%)",
          outline: isFlashing ? `4px solid ${flashColor}` : "none",
          outlineOffset: "-4px",
          transition: "outline 0.1s",
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
          className="text-center max-w-md w-full"
        >
          <div className="flex items-end justify-center gap-8 mb-6">
            <FighterSprite
              character={playerCharacter}
              side="left"
              action={won ? "victory" : "defeat"}
              size={160}
            />
            <FighterSprite
              character={npcCharacter}
              side="right"
              action={won ? "defeat" : "victory"}
              size={160}
            />
          </div>

          <motion.h1
            animate={{
              textShadow: won
                ? ["0 0 30px #00FF9D, 0 0 80px #00FF9D80", "0 0 50px #00FF9D, 0 0 120px #00FF9DB0", "0 0 30px #00FF9D, 0 0 80px #00FF9D80"]
                : ["0 0 30px #FF3D6B, 0 0 80px #FF3D6B80", "0 0 50px #FF3D6B, 0 0 120px #FF3D6BB0", "0 0 30px #FF3D6B, 0 0 80px #FF3D6B80"],
            }}
            transition={{ duration: 1.2, repeat: Infinity }}
            className="font-display text-7xl sm:text-8xl mb-6"
            style={{ color: won ? "#00FF9D" : "#FF3D6B" }}
          >
            {won ? "VICTORY!" : "DEFEATED"}
          </motion.h1>

          <p className="font-ui text-sm mb-6" style={{ color: "rgba(255,255,255,0.5)" }}>
            vs {npcName}
          </p>

          {won && matchResult.xpEarned > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="rounded-xl px-6 py-4 mb-6 inline-block"
              style={{ background: "rgba(255,214,0,0.1)", border: "1px solid rgba(255,214,0,0.3)" }}
            >
              <p className="font-display text-4xl" style={{ color: "#FFD600" }}>
                +{matchResult.xpEarned} XP
              </p>
              <p className="font-ui text-xs mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>earned</p>
            </motion.div>
          )}

          <div className="flex gap-4 mt-6 justify-center">
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => navigate("/arena")}
              className="px-8 py-3 rounded-xl font-display tracking-widest uppercase"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "2px solid rgba(255,255,255,0.2)",
                color: "rgba(255,255,255,0.7)",
              }}
            >
              Arena
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => navigate(-1)}
              className="px-8 py-3 rounded-xl font-display tracking-widest uppercase"
              style={{
                background: won ? "rgba(0,255,157,0.15)" : "rgba(255,61,107,0.15)",
                border: `2px solid ${won ? "rgba(0,255,157,0.4)" : "rgba(255,61,107,0.4)"}`,
                color: won ? "#00FF9D" : "#FF3D6B",
              }}
            >
              Rematch
            </motion.button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ─── Main Fight Screen ─────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 flex flex-col"
      style={{
        background: "radial-gradient(ellipse at center, #1a0a0a 0%, #0a0005 60%, #000 100%)",
        animation: isShaking ? "screen-shake 0.3s ease-out" : "none",
        outline: isFlashing ? `4px solid ${flashColor}` : "none",
        outlineOffset: "-4px",
        transition: "outline 0.1s",
      }}
    >
      {/* Scanlines overlay */}
      <div
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.12) 2px, rgba(0,0,0,0.12) 4px)",
          backgroundSize: "100% 4px",
        }}
      />

      {/* Controls legend — bottom left */}
      <ControlsLegend visible={phase === "fighting"} mode={isGamepadConnected ? "gamepad" : "keyboard"} />

      {/* Combo hint button — top right of fight area */}
      <button
        onClick={() => setShowComboHint((v) => !v)}
        className="absolute top-4 right-4 z-40 w-8 h-8 rounded-full flex items-center justify-center font-display text-sm"
        style={{
          background: "rgba(255,255,255,0.1)",
          border: "1px solid rgba(255,255,255,0.25)",
          color: "rgba(255,255,255,0.7)",
        }}
        title="Combo list"
      >
        ?
      </button>

      {/* Combo hint panel */}
      <AnimatePresence>
        {showComboHint && (
          <motion.div
            initial={{ x: "100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="absolute top-0 right-0 z-40 h-full w-72 flex flex-col"
            style={{ background: "rgba(10,0,20,0.95)", borderLeft: "1px solid rgba(255,255,255,0.1)" }}
          >
            <div className="flex items-center justify-between px-4 py-4 border-b" style={{ borderColor: "rgba(255,255,255,0.1)" }}>
              <p className="font-display text-lg tracking-widest" style={{ color: "#FFD600" }}>COMBOS</p>
              <button
                onClick={() => setShowComboHint(false)}
                className="text-secondary-text hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {COMBOS.map((combo) => (
                <div key={combo.name} className="rounded-lg px-3 py-2" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-display text-xs tracking-wider" style={{ color: combo.color }}>
                      {combo.displayName}
                    </span>
                    <span className="font-display text-xs" style={{ color: "#FFD600" }}>
                      ×{combo.damageMultiplier.toFixed(1)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 flex-wrap">
                    {combo.sequence.map((move, i) => (
                      <span key={i} className="flex items-center gap-1">
                        <span
                          className="font-ui text-[10px] px-1.5 py-0.5 rounded"
                          style={{ background: `${MOVE_COLORS[move]}20`, color: MOVE_COLORS[move], border: `1px solid ${MOVE_COLORS[move]}40` }}
                        >
                          {MOVE_LABELS[move]}
                        </span>
                        {i < combo.sequence.length - 1 && (
                          <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>+</span>
                        )}
                      </span>
                    ))}
                  </div>
                  <p className="font-ui text-[10px] mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>{combo.description}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative z-10 flex flex-col h-full">
        {/* ─── HP Bars ─── */}
        <div className="flex items-start gap-4 px-4 sm:px-8 pt-4 pb-3">
          {/* Player HP */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span
                className="font-display text-sm tracking-wider uppercase"
                style={{ color: "#00FFFF" }}
              >
                {player?.username ?? "YOU"}
              </span>
              <span className="font-ui text-xs font-bold" style={{ color: HP_COLOR(playerHP) }}>
                {playerHP} HP
              </span>
            </div>
            <div className="h-3 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.1)" }}>
              <motion.div
                className="h-full rounded-full"
                animate={{ width: `${playerHP}%`, backgroundColor: HP_COLOR(playerHP) }}
                transition={{ duration: 0.5 }}
              />
            </div>
            <div className="flex gap-1 mt-1">
              {[...Array(playerRoundsWon)].map((_, i) => (
                <div key={i} className="w-3 h-3 rounded-full" style={{ background: "#00FF9D" }} />
              ))}
            </div>
          </div>

          {/* Round indicator */}
          <div className="text-center flex-shrink-0 px-2">
            <p className="font-ui text-xs uppercase tracking-widest mb-1" style={{ color: "rgba(255,255,255,0.4)" }}>
              Round
            </p>
            <p className="font-display text-2xl" style={{ color: "#FFD600" }}>
              {currentRound}
            </p>
          </div>

          {/* NPC HP */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="font-ui text-xs font-bold" style={{ color: HP_COLOR(npcHP) }}>
                {npcHP} HP
              </span>
              <span
                className="font-display text-sm tracking-wider uppercase text-right"
                style={{ color: "#FF3D6B" }}
              >
                {npcName}
              </span>
            </div>
            <div className="h-3 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.1)" }}>
              <motion.div
                className="h-full rounded-full ml-auto"
                animate={{ width: `${npcHP}%`, backgroundColor: HP_COLOR(npcHP) }}
                transition={{ duration: 0.5 }}
                style={{ transformOrigin: "right" }}
              />
            </div>
            <div className="flex gap-1 mt-1 justify-end">
              {[...Array(npcRoundsWon)].map((_, i) => (
                <div key={i} className="w-3 h-3 rounded-full" style={{ background: "#FF3D6B" }} />
              ))}
            </div>
          </div>
        </div>

        {/* ─── Fighter Area (3D Arena) ─── */}
        <div className="flex-1 relative" style={{ minHeight: "260px" }}>
          <Arena3D
            playerCharacter={playerCharacter}
            npcCharacter={npcCharacter}
            playerAction={shakePlayer ? "hit" : selectedMove ?? highlightedMove ?? "idle"}
            npcAction={shakeNpc ? "hit" : "idle"}
            tierColor="#FF3D6B"
            shakeIntensity={isShaking ? 0.8 : 0}
          />

          {/* Floating damage numbers — HTML overlays on top of canvas */}
          <AnimatePresence>
            {floatingDmg?.player && (
              <motion.div
                key="player-dmg"
                initial={{ opacity: 1, y: 0 }}
                animate={{ opacity: 0, y: -40 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8 }}
                className="absolute font-display text-xl pointer-events-none"
                style={{ color: "#FF3D6B", top: "30%", left: "25%", transform: "translateX(-50%)" }}
              >
                -{floatingDmg.player}
              </motion.div>
            )}
          </AnimatePresence>
          <AnimatePresence>
            {floatingDmg?.npc && (
              <motion.div
                key="npc-dmg"
                initial={{ opacity: 1, y: 0 }}
                animate={{ opacity: 0, y: -40 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8 }}
                className="absolute font-display text-xl pointer-events-none"
                style={{ color: "#FF9500", top: "30%", left: "75%", transform: "translateX(-50%)" }}
              >
                -{floatingDmg.npc}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Player hit particles */}
          {playerParticles.map((p) => (
            <motion.div
              key={p.id}
              initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
              animate={{ x: p.x, y: p.y, opacity: 0, scale: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="absolute w-2 h-2 rounded-full pointer-events-none z-20"
              style={{ background: p.color, top: "50%", left: "25%" }}
            />
          ))}

          {/* NPC hit particles */}
          {npcParticles.map((p) => (
            <motion.div
              key={p.id}
              initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
              animate={{ x: p.x, y: p.y, opacity: 0, scale: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="absolute w-2 h-2 rounded-full pointer-events-none z-20"
              style={{ background: p.color, top: "50%", left: "75%" }}
            />
          ))}

          {/* Combo overlay */}
          <AnimatePresence>
            {activeCombo && (
              <motion.div
                initial={{ scale: 0.5, opacity: 0, y: 20 }}
                animate={{ scale: 1.1, opacity: 1, y: 0 }}
                exit={{ scale: 1.3, opacity: 0, y: -30 }}
                className="absolute inset-0 flex flex-col items-center justify-center z-30 pointer-events-none"
              >
                <motion.p
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 0.3, repeat: 3 }}
                  className="font-display text-5xl sm:text-6xl tracking-widest uppercase"
                  style={{ color: activeCombo.color, textShadow: `0 0 30px ${activeCombo.color}, 0 0 60px ${activeCombo.color}80` }}
                >
                  {activeCombo.displayName}!
                </motion.p>
                <p className="font-display text-2xl mt-2" style={{ color: "#FFD600" }}>
                  ×{activeCombo.damageMultiplier.toFixed(1)} DAMAGE
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Round overlays */}
          <AnimatePresence>
            {phase === "round-start" && (
              <motion.div
                key="round-start"
                initial={{ opacity: 0, scale: 1.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="absolute inset-0 flex items-center justify-center z-20"
                style={{ background: "rgba(0,0,0,0.7)" }}
              >
                <div className="text-center">
                  <p className="font-ui text-sm uppercase tracking-[0.4em] mb-2" style={{ color: "rgba(255,255,255,0.5)" }}>
                    Round {currentRound}
                  </p>
                  <motion.p
                    animate={{
                      textShadow: ["0 0 20px #FFD600", "0 0 50px #FFD600", "0 0 20px #FFD600"],
                    }}
                    transition={{ duration: 0.6, repeat: Infinity }}
                    className="font-display text-5xl tracking-widest"
                    style={{ color: "#FFD600" }}
                  >
                    FIGHT!
                  </motion.p>
                </div>
              </motion.div>
            )}

            {phase === "round-result" && lastRoundResult && (
              <motion.div
                key="round-result"
                initial={{ opacity: 0, scale: 1.2 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex items-center justify-center z-20"
                style={{ background: "rgba(0,0,0,0.7)" }}
              >
                <div className="text-center">
                  <motion.p
                    animate={{
                      textShadow:
                        lastRoundResult === "WIN"
                          ? ["0 0 20px #00FF9D", "0 0 50px #00FF9D", "0 0 20px #00FF9D"]
                          : ["0 0 20px #FF3D6B", "0 0 50px #FF3D6B", "0 0 20px #FF3D6B"],
                    }}
                    transition={{ duration: 0.6, repeat: Infinity }}
                    className="font-display text-4xl tracking-widest"
                    style={{ color: lastRoundResult === "WIN" ? "#00FF9D" : "#FF3D6B" }}
                  >
                    {lastRoundResult === "WIN" ? "ROUND WIN!" : "ROUND LOSS"}
                  </motion.p>
                  <p className="font-ui text-xs uppercase tracking-[0.3em] mt-2" style={{ color: "rgba(255,255,255,0.4)" }}>
                    {`${playerRoundsWon} — ${npcRoundsWon}`}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ─── Action Buttons ─── */}
        <div className="px-4 sm:px-8 pb-6">
          {phase === "fighting" && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {/* Timer */}
              <div className="flex justify-center mb-3">
                <div
                  className="w-14 h-14 rounded-full border-4 flex items-center justify-center font-display text-2xl"
                  style={{
                    borderColor: timeLeft <= 2 ? "#FF3D6B" : "#00FFFF",
                    color: timeLeft <= 2 ? "#FF3D6B" : "#00FFFF",
                    boxShadow: `0 0 15px ${timeLeft <= 2 ? "#FF3D6B60" : "#00FFFF60"}`,
                  }}
                >
                  {timeLeft}
                </div>
              </div>

              {/* Gamepad indicator */}
              {isGamepadConnected && (
                <div className="text-center mb-2">
                  <span className="font-ui text-xs text-arc-cyan opacity-70">
                    🎮 {gamepadName || "Controller"} connected
                  </span>
                </div>
              )}

              {/* Move buttons or locked-in state */}
              {selectedMove ? (
                <div className="text-center py-4">
                  <p className="font-display text-lg" style={{ color: "#00FF9D" }}>ACTION LOCKED IN</p>
                  <div
                    className="inline-flex items-center gap-3 mt-2 px-5 py-2 rounded-xl"
                    style={{
                      background: `${MOVE_COLORS[selectedMove]}20`,
                      border: `2px solid ${MOVE_COLORS[selectedMove]}60`,
                      color: MOVE_COLORS[selectedMove],
                    }}
                  >
                    <span className="font-ui font-bold text-lg">{MOVE_LABELS[selectedMove]}</span>
                    <span
                      className="font-ui text-xs px-2 py-1 rounded"
                      style={{
                        background: "rgba(255,255,255,0.1)",
                        color: "rgba(255,255,255,0.5)",
                      }}
                    >
                      {moveToServerAction(selectedMove).toUpperCase()}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {MOVE_GRID.map((row, rowIdx) => (
                    <div key={rowIdx} className="grid grid-cols-3 gap-2">
                      {row.map((move) => {
                        const isHighlighted = highlightedMove === move;
                        const color = MOVE_COLORS[move];
                        return (
                          <motion.button
                            key={move}
                            whileHover={{ scale: 1.04, y: -2 }}
                            whileTap={{ scale: 0.96 }}
                            onClick={() => handleMove(move)}
                            className="py-3 rounded-xl font-display tracking-wider uppercase text-xs sm:text-sm relative overflow-hidden"
                            style={{
                              background: isHighlighted ? `${color}30` : `${color}12`,
                              border: isHighlighted
                                ? `2px solid ${color}`
                                : `2px solid ${color}45`,
                              color: color,
                              textShadow: isHighlighted ? `0 0 12px ${color}` : `0 0 8px ${color}60`,
                              boxShadow: isHighlighted ? `0 0 16px ${color}40` : "none",
                              transition: "all 0.1s ease",
                            }}
                          >
                            {/* Key badge */}
                            <span
                              className="absolute top-1 right-1 text-[9px] font-mono px-1 rounded"
                              style={{
                                background: "rgba(255,255,255,0.08)",
                                color: "rgba(255,255,255,0.35)",
                                border: "1px solid rgba(255,255,255,0.12)",
                              }}
                            >
                              {MOVE_KEYS[move]}
                            </span>
                            {MOVE_LABELS[move]}
                          </motion.button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {(phase === "round-start" || phase === "round-result") && (
            <div className="h-24 flex items-center justify-center">
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
                    transition={{ duration: 0.8, delay: i * 0.2, repeat: Infinity }}
                    className="w-2 h-2 rounded-full"
                    style={{ background: "#FFD600" }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
