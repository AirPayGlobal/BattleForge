import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { useAuth } from "../contexts/AuthContext";
import api from "../lib/api";

type Action = "attack" | "special" | "block";
type FightPhase =
  | "vs-intro"
  | "round-start"
  | "fighting"
  | "round-result"
  | "match-end";

const ACTION_LABELS: Record<Action, string> = {
  attack: "⚔ ATTACK",
  special: "✨ SPECIAL",
  block: "🛡 BLOCK",
};

const ACTION_COLORS: Record<Action, string> = {
  attack: "#FF3D6B",
  special: "#7B2FFF",
  block: "#00BFFF",
};

const HP_COLOR = (hp: number) =>
  hp > 60 ? "#00FF9D" : hp > 30 ? "#FFD600" : "#FF3D6B";

interface SimRound {
  round: number;
  playerWins: boolean;
  playerDmgTaken: number;
  npcDmgTaken: number;
  action: Action;
}

function simulateRounds(result: "WIN" | "LOSS"): SimRound[] {
  const rand = (min: number, max: number) =>
    Math.floor(Math.random() * (max - min + 1)) + min;
  const actions: Action[] = ["attack", "special", "block"];

  // Decide round split
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

export default function NpcFightPage() {
  const { npcId } = useParams<{ npcId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { player, refreshPlayer } = useAuth();

  const locationState = location.state as { weaponId?: string; npcName?: string } | null;
  const weaponId = locationState?.weaponId ?? "";
  const npcName = locationState?.npcName ?? "UNKNOWN";

  const [phase, setPhase] = useState<FightPhase>("vs-intro");
  const [currentRound, setCurrentRound] = useState(0);
  const [playerHP, setPlayerHP] = useState(100);
  const [npcHP, setNpcHP] = useState(100);
  const [playerRoundsWon, setPlayerRoundsWon] = useState(0);
  const [npcRoundsWon, setNpcRoundsWon] = useState(0);
  const [timeLeft, setTimeLeft] = useState(5);
  const [selectedAction, setSelectedAction] = useState<Action | null>(null);
  const [shakePlayer, setShakePlayer] = useState(false);
  const [shakeNpc, setShakeNpc] = useState(false);
  const [floatingDmg, setFloatingDmg] = useState<{ player?: number; npc?: number } | null>(null);
  const [lastRoundResult, setLastRoundResult] = useState<"WIN" | "LOSS" | null>(null);
  const [matchResult, setMatchResult] = useState<{ result: "WIN" | "LOSS"; xpEarned: number } | null>(null);
  const [battleError, setBattleError] = useState<string | null>(null);

  const simRoundsRef = useRef<SimRound[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const battleFired = useRef(false);

  // Fire battle API on mount
  useEffect(() => {
    if (!npcId || battleFired.current) return;
    battleFired.current = true;

    const body = weaponId ? { weaponId } : {};
    api
      .post(`/npcs/${npcId}/battle`, body)
      .then(({ data }) => {
        simRoundsRef.current = simulateRounds(data.result);
        // Store result for later
        setMatchResult({ result: data.result, xpEarned: data.xpEarned ?? 0 });
        if (data.result === "WIN") refreshPlayer();
      })
      .catch((err) => {
        setBattleError(err.response?.data?.error || "Battle failed. Please try again.");
      });
  }, [npcId, weaponId]);

  // VS Intro → Round 1 after 2s
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
    const t = setTimeout(() => {
      setPhase("fighting");
      setTimeLeft(5);
      setSelectedAction(null);
    }, 1500);
    return () => clearTimeout(t);
  }, [phase]);

  const resolveCurrentRound = useCallback(
    (action: Action) => {
      if (timerRef.current) clearInterval(timerRef.current);

      const simRound = simRoundsRef.current[currentRound - 1];
      if (!simRound) return;

      // Animate hit
      setShakePlayer(!simRound.playerWins);
      setShakeNpc(simRound.playerWins);
      setFloatingDmg({
        player: simRound.playerWins ? undefined : simRound.playerDmgTaken,
        npc: simRound.playerWins ? simRound.npcDmgTaken : undefined,
      });

      setTimeout(() => {
        setShakePlayer(false);
        setShakeNpc(false);
        setFloatingDmg(null);

        setPlayerHP((hp) => Math.max(0, hp - simRound.playerDmgTaken));
        setNpcHP((hp) => Math.max(0, hp - simRound.npcDmgTaken));

        if (simRound.playerWins) setPlayerRoundsWon((w) => w + 1);
        else setNpcRoundsWon((w) => w + 1);

        setLastRoundResult(simRound.playerWins ? "WIN" : "LOSS");
        setSelectedAction(action);
        setPhase("round-result");
      }, 700);
    },
    [currentRound]
  );

  const handleAction = (action: Action) => {
    if (phase !== "fighting" || selectedAction) return;
    setSelectedAction(action);
    resolveCurrentRound(action);
  };

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

  // When timer hits 0, auto-resolve if no action chosen
  useEffect(() => {
    if (phase !== "fighting" || timeLeft > 0) return;
    resolveCurrentRound(selectedAction ?? "attack");
  }, [timeLeft, phase, resolveCurrentRound, selectedAction]);

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
            className="flex-1 text-center"
          >
            <div className="text-7xl mb-4">⚔️</div>
            <p
              className="font-display text-2xl tracking-widest uppercase"
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
            className="flex-1 text-center"
          >
            <div className="text-7xl mb-4">💀</div>
            <p
              className="font-display text-2xl tracking-widest uppercase"
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
        style={{ background: "radial-gradient(ellipse at center, #1a0a0a 0%, #0a0005 60%, #000 100%)" }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
          className="text-center max-w-md w-full"
        >
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
      style={{ background: "radial-gradient(ellipse at center, #1a0a0a 0%, #0a0005 60%, #000 100%)" }}
    >
      {/* Scanlines overlay */}
      <div
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.12) 2px, rgba(0,0,0,0.12) 4px)",
          backgroundSize: "100% 4px",
        }}
      />

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

        {/* ─── Fighter Area ─── */}
        <div className="flex-1 flex items-center justify-center relative px-4">
          {/* Player fighter */}
          <motion.div
            animate={shakePlayer ? { x: [-8, 8, -6, 6, -4, 4, 0] } : { x: 0 }}
            transition={{ duration: 0.35 }}
            className="flex-1 flex flex-col items-center"
          >
            <div
              className="w-28 h-28 sm:w-36 sm:h-36 rounded-full flex items-center justify-center text-6xl sm:text-7xl relative"
              style={{
                background: "radial-gradient(circle, rgba(0,255,255,0.15) 0%, transparent 70%)",
                border: "2px solid rgba(0,255,255,0.3)",
              }}
            >
              ⚔️
              {/* Floating damage */}
              <AnimatePresence>
                {floatingDmg?.player && (
                  <motion.div
                    key="player-dmg"
                    initial={{ opacity: 1, y: 0 }}
                    animate={{ opacity: 0, y: -40 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.8 }}
                    className="absolute -top-4 left-1/2 -translate-x-1/2 font-display text-xl"
                    style={{ color: "#FF3D6B" }}
                  >
                    -{floatingDmg.player}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* VS divider */}
          <div className="px-4 font-display text-2xl" style={{ color: "rgba(255,255,255,0.2)" }}>
            VS
          </div>

          {/* NPC fighter */}
          <motion.div
            animate={shakeNpc ? { x: [-8, 8, -6, 6, -4, 4, 0] } : { x: 0 }}
            transition={{ duration: 0.35 }}
            className="flex-1 flex flex-col items-center"
          >
            <div
              className="w-28 h-28 sm:w-36 sm:h-36 rounded-full flex items-center justify-center text-6xl sm:text-7xl relative"
              style={{
                background: "radial-gradient(circle, rgba(255,61,107,0.15) 0%, transparent 70%)",
                border: "2px solid rgba(255,61,107,0.3)",
              }}
            >
              💀
              {/* Floating damage */}
              <AnimatePresence>
                {floatingDmg?.npc && (
                  <motion.div
                    key="npc-dmg"
                    initial={{ opacity: 1, y: 0 }}
                    animate={{ opacity: 0, y: -40 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.8 }}
                    className="absolute -top-4 left-1/2 -translate-x-1/2 font-display text-xl"
                    style={{ color: "#FF3D6B" }}
                  >
                    -{floatingDmg.npc}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Round overlays */}
          <AnimatePresence>
            {phase === "round-start" && (
              <motion.div
                key="round-start"
                initial={{ opacity: 0, scale: 1.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="absolute inset-0 flex items-center justify-center"
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
                className="absolute inset-0 flex items-center justify-center"
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
                    {lastRoundResult === "WIN"
                      ? `${playerRoundsWon} — ${npcRoundsWon}`
                      : `${playerRoundsWon} — ${npcRoundsWon}`}
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
              <div className="flex justify-center mb-4">
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

              {/* Action buttons */}
              {selectedAction ? (
                <div className="text-center py-4">
                  <p className="font-display text-lg" style={{ color: "#00FF9D" }}>ACTION LOCKED IN</p>
                  <div
                    className="inline-block mt-2 px-5 py-2 rounded-xl"
                    style={{
                      background: `${ACTION_COLORS[selectedAction]}20`,
                      border: `2px solid ${ACTION_COLORS[selectedAction]}60`,
                      color: ACTION_COLORS[selectedAction],
                    }}
                  >
                    <span className="font-ui font-bold">{ACTION_LABELS[selectedAction]}</span>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  {(["attack", "special", "block"] as Action[]).map((action) => (
                    <motion.button
                      key={action}
                      whileHover={{ scale: 1.04, y: -2 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => handleAction(action)}
                      className="py-4 rounded-xl font-display tracking-wider uppercase text-sm sm:text-base"
                      style={{
                        background: `${ACTION_COLORS[action]}15`,
                        border: `2px solid ${ACTION_COLORS[action]}50`,
                        color: ACTION_COLORS[action],
                        textShadow: `0 0 10px ${ACTION_COLORS[action]}60`,
                      }}
                    >
                      {ACTION_LABELS[action]}
                    </motion.button>
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
