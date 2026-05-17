import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../contexts/AuthContext";

const TIER_BUTTONS = [
  { tier: "BEGINNER", label: "BEGINNER", color: "#22c55e", bg: "rgba(34,197,94,0.12)", border: "rgba(34,197,94,0.4)" },
  { tier: "WARRIOR", label: "WARRIOR", color: "#f59e0b", bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.4)" },
  { tier: "ELITE", label: "ELITE", color: "#ef4444", bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.4)" },
] as const;

export default function ArenaPage() {
  const { player } = useAuth();
  const navigate = useNavigate();

  const playersOnline = useMemo(() => Math.floor(Math.random() * 8) + 2, []);

  return (
    <div
      className="min-h-screen relative overflow-hidden -mt-6 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-12"
      style={{ background: "radial-gradient(ellipse at center, #1a0a0a 0%, #0a0005 60%, #000 100%)" }}
    >
      {/* Scanline overlay */}
      <div
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.15) 2px, rgba(0,0,0,0.15) 4px)",
          backgroundSize: "100% 4px",
        }}
      />

      {/* Grid overlay */}
      <div
        className="pointer-events-none absolute inset-0 z-0 opacity-10"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,61,107,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,61,107,0.3) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      <div className="relative z-10 max-w-5xl mx-auto">
        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-14"
        >
          <motion.h1
            animate={{
              textShadow: [
                "0 0 20px #FF3D6B, 0 0 60px #FF3D6B80",
                "0 0 30px #FF3D6B, 0 0 80px #FF3D6BB0",
                "0 0 20px #FF3D6B, 0 0 60px #FF3D6B80",
              ],
            }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="font-display text-6xl sm:text-7xl text-white tracking-widest uppercase"
            style={{ color: "#fff", letterSpacing: "0.18em" }}
          >
            BATTLEFORGE
          </motion.h1>
          <p
            className="font-display text-2xl sm:text-3xl tracking-[0.3em] uppercase mt-2"
            style={{ color: "#FF3D6B", textShadow: "0 0 12px #FF3D6B80" }}
          >
            ARENA
          </p>
          <div className="mt-4 flex items-center justify-center gap-4">
            <div className="h-px flex-1 max-w-[120px]" style={{ background: "linear-gradient(to right, transparent, #FF3D6B)" }} />
            <span className="font-ui text-xs uppercase tracking-[0.3em] text-secondary-text">Choose Your Battle</span>
            <div className="h-px flex-1 max-w-[120px]" style={{ background: "linear-gradient(to left, transparent, #FF3D6B)" }} />
          </div>
        </motion.div>

        {/* Two fight option cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {/* LEFT: Fight NPC */}
          <motion.div
            initial={{ opacity: 0, x: -60 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="rounded-2xl border overflow-hidden"
            style={{
              background: "linear-gradient(135deg, #1a0010 0%, #0d0005 100%)",
              borderColor: "rgba(255,61,107,0.4)",
              boxShadow: "0 0 30px rgba(255,61,107,0.15), inset 0 0 30px rgba(255,61,107,0.05)",
            }}
          >
            <div className="p-8">
              {/* Icon area */}
              <div className="flex justify-center mb-6">
                <div
                  className="w-24 h-24 rounded-full flex items-center justify-center text-5xl"
                  style={{ background: "radial-gradient(circle, rgba(255,61,107,0.2) 0%, transparent 70%)", border: "2px solid rgba(255,61,107,0.4)" }}
                >
                  💀
                </div>
              </div>

              <h2 className="font-display text-3xl text-white text-center tracking-widest mb-2">FIGHT NPC</h2>
              <p className="font-ui text-sm text-center mb-8" style={{ color: "rgba(255,255,255,0.5)" }}>
                Solo Combat — Face AI fighters
              </p>

              <div className="space-y-3">
                {TIER_BUTTONS.map((t, i) => (
                  <motion.button
                    key={t.tier}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + i * 0.1 }}
                    whileHover={{ scale: 1.03, x: 4 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => navigate(`/arena/npc?tier=${t.tier}`)}
                    className="w-full py-4 rounded-xl font-display tracking-[0.2em] text-lg uppercase transition-all"
                    style={{
                      background: t.bg,
                      border: `2px solid ${t.border}`,
                      color: t.color,
                      textShadow: `0 0 10px ${t.color}80`,
                    }}
                  >
                    {t.label}
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.div>

          {/* RIGHT: Find Opponent */}
          <motion.div
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="rounded-2xl border overflow-hidden"
            style={{
              background: "linear-gradient(135deg, #000a1a 0%, #000510 100%)",
              borderColor: "rgba(0,255,255,0.3)",
              boxShadow: "0 0 30px rgba(0,255,255,0.1), inset 0 0 30px rgba(0,255,255,0.04)",
            }}
          >
            <div className="p-8">
              {/* Icon area */}
              <div className="flex justify-center mb-6">
                <div
                  className="w-24 h-24 rounded-full flex items-center justify-center text-5xl"
                  style={{ background: "radial-gradient(circle, rgba(0,255,255,0.2) 0%, transparent 70%)", border: "2px solid rgba(0,255,255,0.4)" }}
                >
                  ⚔️
                </div>
              </div>

              <h2 className="font-display text-3xl text-white text-center tracking-widest mb-2">FIND OPPONENT</h2>
              <p className="font-ui text-sm text-center mb-8" style={{ color: "rgba(255,255,255,0.5)" }}>
                PvP — Match with a live fighter
              </p>

              {/* Online count */}
              <div
                className="rounded-xl px-4 py-3 mb-6 flex items-center justify-center gap-3"
                style={{ background: "rgba(0,255,255,0.08)", border: "1px solid rgba(0,255,255,0.2)" }}
              >
                <motion.div
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ background: "#00FF9D" }}
                />
                <span className="font-ui text-sm" style={{ color: "#00FF9D" }}>
                  <span className="font-bold text-lg">{playersOnline}</span> fighters online
                </span>
              </div>

              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => navigate("/arena/matchmaking")}
                className="w-full py-5 rounded-xl font-display tracking-[0.2em] text-xl uppercase"
                style={{
                  background: "linear-gradient(135deg, rgba(0,255,255,0.2) 0%, rgba(0,191,255,0.15) 100%)",
                  border: "2px solid rgba(0,255,255,0.5)",
                  color: "#00FFFF",
                  textShadow: "0 0 15px rgba(0,255,255,0.7)",
                  boxShadow: "0 0 20px rgba(0,255,255,0.2)",
                }}
              >
                ENTER QUEUE
              </motion.button>

              <p className="font-ui text-xs text-center mt-4" style={{ color: "rgba(255,255,255,0.35)" }}>
                Weapon stake required · Winner takes all
              </p>
            </div>
          </motion.div>
        </div>

        {/* Player stats */}
        {player && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="rounded-2xl border p-6"
            style={{
              background: "rgba(255,255,255,0.03)",
              borderColor: "rgba(255,255,255,0.08)",
            }}
          >
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <p className="font-ui text-xs uppercase tracking-widest mb-1" style={{ color: "rgba(255,255,255,0.4)" }}>
                  Fighter
                </p>
                <p className="font-display text-2xl tracking-wider" style={{ color: "#FFD600" }}>
                  {player.username.toUpperCase()}
                </p>
                {player.character && (
                  <p className="font-ui text-sm mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>
                    {player.character.name}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-8">
                <div className="text-center">
                  <p className="font-display text-3xl" style={{ color: "#00FF9D" }}>
                    {player.wins}
                  </p>
                  <p className="font-ui text-xs uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.4)" }}>
                    Wins
                  </p>
                </div>
                <div className="font-display text-xl" style={{ color: "rgba(255,255,255,0.2)" }}>
                  /
                </div>
                <div className="text-center">
                  <p className="font-display text-3xl" style={{ color: "#FF3D6B" }}>
                    {player.losses}
                  </p>
                  <p className="font-ui text-xs uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.4)" }}>
                    Losses
                  </p>
                </div>
                <div className="text-center">
                  <p className="font-display text-3xl" style={{ color: "#FFD600" }}>
                    {player.xp.toLocaleString()}
                  </p>
                  <p className="font-ui text-xs uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.4)" }}>
                    XP
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
